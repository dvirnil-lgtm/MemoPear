const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineInt, defineString } = require('firebase-functions/params');
const crypto = require('crypto');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const Stripe = require('stripe');

initializeApp();
const db = getFirestore();

function trialEndedEmailHtml() {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b;line-height:1.5;">
      <img src="https://go.memopear.com/favicon-512.png" alt="MemoPear" width="48" height="48" style="display:block;margin-bottom:16px;border-radius:12px;">
      <h1 style="color:#65a30d;font-size:22px;margin-bottom:4px;">Your free trial has ended</h1>
      <p>Your 2-day MemoPear trial just wrapped up. We hope you got a taste of how much faster lead capture can be.</p>
      <p>Subscribe to keep scanning badges, snapping business cards, and syncing every contact you've already saved.</p>
      <p style="margin:28px 0;">
        <a href="https://go.memopear.com/pricing" style="background:#65a30d;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Subscribe for $2.80/mo &rarr;</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">&mdash; The MemoPear Team</p>
    </div>
  `;
}

// Runs every 6 hours looking for accounts whose Stripe trial just lapsed
// without converting to a paid subscription (see `stripeWebhook` below,
// which is what keeps `trialStartAt`/`hasPaid` accurate for every account —
// someone who converted or is still mid-trial has `hasPaid: true` or a
// `trialStartAt` that hasn't reached the cutoff yet, so this only ever
// matches people whose card didn't go through or who canceled in time).
// Writing to the `mail` collection is the same trigger the client uses
// elsewhere in this app (see firebase.ts) — the "Trigger Email from
// Firestore" extension picks it up and sends it through SendGrid.
// `trialEndedEmailSent` is flipped to true in the same batch so a doc is
// never emailed twice even if a run overlaps.
exports.sendTrialEndedEmails = onSchedule('every 6 hours', async () => {
  const now = Date.now();
  const snap = await db.collection('users')
    .where('trialEndedEmailSent', '==', false)
    .where('hasPaid', '==', false)
    .where('trialEndAt', '<=', now)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  for (const docSnap of snap.docs) {
    const email = docSnap.data().email;
    if (!email) continue;
    batch.set(db.collection('mail').doc(), {
      to: [email],
      message: {
        subject: 'Your MemoPear free trial has ended',
        html: trialEndedEmailHtml(),
      },
    });
    batch.update(docSnap.ref, {
      trialEndedEmailSent: true,
      trialEndedEmailSentAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
});

// ── Lead-retention housekeeping ─────────────────────────────────────────────
//
// Captured contacts are only kept for RETENTION_DAYS (mirrors RETENTION_DAYS in
// App.tsx). Two scheduled jobs below nudge users by writing to the `mail`
// collection — the same "Trigger Email from Firestore" (SendGrid) path used
// everywhere else in this app:
//   1. sendRetentionReminders  — 2 days before a user's leads age out, remind
//      them to download a personal copy for safekeeping.
//   2. sendInactivityReminders — after 3 quiet days, ask how the conference
//      went and whether they've followed up with their leads.
const DAY_MS = 24 * 60 * 60 * 1000;
// These windows are configurable without a code change — set them per
// environment with `firebase functions:config`-style params (a `.env` file in
// functions/, or `--set-env-vars` at deploy). Defaults match the client:
//   RETENTION_DAYS         — how long captured leads are kept (mirror the
//                            RETENTION_DAYS constant in App.tsx if you change it)
//   RETENTION_WARNING_DAYS — how far ahead of the cutoff we warn the user
//   INACTIVITY_DAYS        — days of silence before the "how was the
//                            conference?" nudge goes out
const retentionDaysParam = defineInt('RETENTION_DAYS', { default: 30 });
const retentionWarningDaysParam = defineInt('RETENTION_WARNING_DAYS', { default: 2 });
const inactivityDaysParam = defineInt('INACTIVITY_DAYS', { default: 3 });
// Base URL of the `unsubscribeEmails` function below, used to build the
// one-click opt-out link in reminder emails. Defaults to this project's
// Cloud Run naming convention (same host pattern as hubspotOAuthCallback);
// override with the UNSUBSCRIBE_BASE_URL param if the deployed URL differs.
const unsubscribeBaseUrlParam = defineString('UNSUBSCRIBE_BASE_URL', {
  default: 'https://unsubscribeemails-yxfmpirqaa-uc.a.run.app',
});

// Reusable unsubscribe footer for reminder emails.
function unsubscribeFooterHtml(unsubUrl) {
  if (!unsubUrl) return '';
  return `<p style="color:#cbd5e1;font-size:11px;margin-top:8px;">Don't want these reminders? <a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe</a>.</p>`;
}

// Returns a stable per-user unsubscribe token, creating and persisting one on
// first use so the link can be verified when the user clicks it.
async function getOrCreateUnsubToken(ref, data) {
  if (data && data.unsubToken) return data.unsubToken;
  const token = crypto.randomUUID();
  await ref.set({ unsubToken: token }, { merge: true });
  return token;
}

function buildUnsubUrl(uid, token) {
  const base = (unsubscribeBaseUrlParam.value() || '').trim();
  if (!base) return '';
  return `${base}?u=${encodeURIComponent(uid)}&t=${encodeURIComponent(token)}`;
}

function retentionReminderEmailHtml(expiringCount, retentionDays, warningDays, unsubUrl) {
  const countLine = expiringCount > 0
    ? `<strong>${expiringCount} of your saved contact${expiringCount === 1 ? '' : 's'}</strong> will be removed from your account in the next ${warningDays} day${warningDays === 1 ? '' : 's'}.`
    : `Some of your saved contacts will be removed from your account in the next ${warningDays} day${warningDays === 1 ? '' : 's'}.`;
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b;line-height:1.5;">
      <img src="https://go.memopear.com/favicon-512.png" alt="MemoPear" width="48" height="48" style="display:block;margin-bottom:16px;border-radius:12px;">
      <h1 style="color:#65a30d;font-size:22px;margin-bottom:4px;">Back up your leads before they're cleared</h1>
      <p>Heads up — for your security and privacy, MemoPear only keeps captured contacts for ${retentionDays} days. ${countLine}</p>
      <p>Take a moment to export them to your own spreadsheet so you keep a permanent copy:</p>
      <p style="margin:28px 0;">
        <a href="https://go.memopear.com/pipeline" style="background:#65a30d;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Download my leads &rarr;</a>
      </p>
      <p style="color:#64748b;font-size:13px;">Open your Contacts, select the leads you want, and choose <em>Export to Sheets</em> — it drops everything, tags included, into a Google Spreadsheet you own.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">&mdash; The MemoPear Team</p>
      ${unsubscribeFooterHtml(unsubUrl)}
    </div>
  `;
}

function inactivityReminderEmailHtml(unsubUrl) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b;line-height:1.5;">
      <img src="https://go.memopear.com/favicon-512.png" alt="MemoPear" width="48" height="48" style="display:block;margin-bottom:16px;border-radius:12px;">
      <h1 style="color:#65a30d;font-size:22px;margin-bottom:4px;">How was the conference? 🍐</h1>
      <p>We noticed you've been away for a few days. Now's the perfect time to make those conversations count.</p>
      <p><strong>Did you follow up with all of your leads?</strong> The contacts you captured are ready and waiting — a quick, personal note while you're still fresh in their memory goes a long way.</p>
      <p style="margin:28px 0;">
        <a href="https://go.memopear.com/pipeline" style="background:#65a30d;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Review my leads &rarr;</a>
      </p>
      <p style="color:#64748b;font-size:13px;">MemoPear can even draft a follow-up email for each contact — open a lead and tap <em>Email Suggestion</em>.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">&mdash; The MemoPear Team</p>
      ${unsubscribeFooterHtml(unsubUrl)}
    </div>
  `;
}

// Simple HTML page shown after a user clicks the unsubscribe link.
function unsubscribeResultHtml(message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MemoPear</title></head>
    <body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f8fafc;margin:0;padding:48px 20px;color:#1e293b;">
      <div style="max-width:420px;margin:0 auto;text-align:center;">
        <img src="https://go.memopear.com/favicon-512.png" alt="MemoPear" width="56" height="56" style="border-radius:14px;margin-bottom:20px;">
        <p style="font-size:16px;line-height:1.6;">${message}</p>
        <p style="margin-top:28px;"><a href="https://go.memopear.com" style="color:#65a30d;font-weight:700;text-decoration:none;">Back to MemoPear &rarr;</a></p>
      </div>
    </body></html>`;
}

// Resolves an account's owner `users/{accountId}` doc (accountId is the owner's
// Firebase uid, so leads stored under it belong to that user). Returns the doc
// ref plus its data, or null if there's no such user.
async function getAccountUser(accountId) {
  const snap = await db.collection('users').doc(accountId).get();
  return snap.exists ? { ref: snap.ref, data: snap.data() } : null;
}

// Runs daily. For each account, if any lead is within RETENTION_WARNING_DAYS of
// the RETENTION_DAYS cutoff (i.e. lead age is between 28 and 30 days), email the
// owner a reminder to export a personal copy. `retentionReminderSentAt` on the
// userLeads doc gives a short cooldown so a single expiry window is only ever
// mailed once, while a later batch of leads can still trigger a fresh reminder.
exports.sendRetentionReminders = onSchedule('every 24 hours', async () => {
  const now = Date.now();
  const RETENTION_DAYS = retentionDaysParam.value();
  const RETENTION_WARNING_DAYS = retentionWarningDaysParam.value();
  const warnFloor = (RETENTION_DAYS - RETENTION_WARNING_DAYS) * DAY_MS; // e.g. 28 days
  const expireAt = RETENTION_DAYS * DAY_MS;                             // e.g. 30 days
  const cooldownMs = RETENTION_WARNING_DAYS * DAY_MS;

  const snap = await db.collection('userLeads').get();
  if (snap.empty) return;

  for (const docSnap of snap.docs) {
    try {
      const data = docSnap.data();
      const leads = Array.isArray(data.leads) ? data.leads : [];
      if (!leads.length) continue;

      // Leads that will age out within the warning window but haven't yet.
      const expiringSoon = leads.filter((l) => {
        const age = now - (l.timestamp || 0);
        return age >= warnFloor && age < expireAt;
      });
      if (!expiringSoon.length) continue;

      const lastSent = data.retentionReminderSentAt || 0;
      if (now - lastSent < cooldownMs) continue; // already reminded for this window

      const user = await getAccountUser(docSnap.id);
      if (!user || !user.data.email) continue;
      if (user.data.emailOptOut === true) continue; // respect unsubscribe

      const token = await getOrCreateUnsubToken(user.ref, user.data);
      const unsubUrl = buildUnsubUrl(docSnap.id, token);

      await db.collection('mail').add({
        to: [user.data.email],
        message: {
          subject: 'Your MemoPear leads are about to be cleared — save a copy',
          html: retentionReminderEmailHtml(expiringSoon.length, RETENTION_DAYS, RETENTION_WARNING_DAYS, unsubUrl),
        },
      });
      await docSnap.ref.set({ retentionReminderSentAt: now }, { merge: true });
    } catch (err) {
      console.error('[sendRetentionReminders] failed for', docSnap.id, err);
    }
  }
});

// Runs daily. Emails users who have captured leads but haven't opened the app
// in INACTIVITY_DAYS. `inactivityEmailForActiveAt` records the `lastActiveAt`
// value we last mailed about, so each quiet streak is nudged exactly once — the
// moment the user returns, `lastActiveAt` changes and a future streak re-arms.
exports.sendInactivityReminders = onSchedule('every 24 hours', async () => {
  const now = Date.now();
  const INACTIVITY_DAYS = inactivityDaysParam.value();
  const cutoff = Timestamp.fromMillis(now - INACTIVITY_DAYS * DAY_MS);

  const snap = await db.collection('users').where('lastActiveAt', '<=', cutoff).get();
  if (snap.empty) return;

  for (const docSnap of snap.docs) {
    try {
      const data = docSnap.data();
      const email = data.email;
      if (!email || !data.lastActiveAt) continue;
      if (data.emailOptOut === true) continue; // respect unsubscribe

      const activeMs = data.lastActiveAt.toMillis();
      if (data.inactivityEmailForActiveAt === activeMs) continue; // already nudged this streak

      // Only reach out to people who actually captured leads at a conference.
      const leadsSnap = await db.collection('userLeads').doc(docSnap.id).get();
      const leads = leadsSnap.exists ? (leadsSnap.data().leads || []) : [];
      if (!leads.length) continue;

      const token = await getOrCreateUnsubToken(docSnap.ref, data);
      const unsubUrl = buildUnsubUrl(docSnap.id, token);

      await db.collection('mail').add({
        to: [email],
        message: {
          subject: 'How was the conference? Did you follow up with your leads?',
          html: inactivityReminderEmailHtml(unsubUrl),
        },
      });
      await docSnap.ref.set({
        inactivityEmailForActiveAt: activeMs,
        inactivityEmailSentAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('[sendInactivityReminders] failed for', docSnap.id, err);
    }
  }
});

// One-click unsubscribe endpoint linked from reminder emails. Verifies the
// per-user token before flipping `users/{uid}.emailOptOut` so a stranger can't
// unsubscribe someone else by guessing their uid. Both scheduled reminders
// above skip any user with emailOptOut === true.
exports.unsubscribeEmails = onRequest(async (req, res) => {
  const uid = String(req.query.u || '');
  const token = String(req.query.t || '');
  res.set('Content-Type', 'text/html; charset=utf-8');
  if (!uid || !token) {
    res.status(400).send(unsubscribeResultHtml('This unsubscribe link is invalid or incomplete.'));
    return;
  }
  try {
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();
    if (!snap.exists || snap.data().unsubToken !== token) {
      res.status(400).send(unsubscribeResultHtml('This unsubscribe link is invalid or has expired.'));
      return;
    }
    await ref.set({ emailOptOut: true, emailOptOutAt: FieldValue.serverTimestamp() }, { merge: true });
    res.status(200).send(unsubscribeResultHtml("You're unsubscribed from MemoPear reminder emails. You won't receive retention or follow-up nudges anymore."));
  } catch (err) {
    console.error('[unsubscribeEmails] error', err);
    res.status(500).send(unsubscribeResultHtml('Something went wrong. Please try again in a moment.'));
  }
});

// ── Stripe webhook: keeps `users/{uid}.hasPaid` accurate for every account ──
//
// MemoPear's trial requires a card: signing up sends the user to Stripe
// Checkout, where the Price has a free trial period configured (set that up
// in the Stripe Dashboard on each Payment Link — no code needed there).
// Checkout completing does NOT mean they've paid — it means Stripe now holds
// a card and the subscription is sitting in "trialing" status until the
// trial period elapses, at which point Stripe auto-charges it. So this
// function tracks the subscription's actual status rather than treating
// "checkout completed" as "paid":
//   - trialing  -> hasPaid stays false; trialStartAt/trialEndAt come from
//                  Stripe's own trial_start/trial_end.
//   - active    -> hasPaid true (either the trial converted, or this was an
//                  immediate no-trial purchase).
//   - canceled / unpaid / incomplete_expired -> hasPaid false.
//
// Register this endpoint in the Stripe Dashboard (Developers -> Webhooks)
// for: checkout.session.completed, customer.subscription.updated, and
// customer.subscription.deleted.
//
// Matching a Stripe event back to a `users/{uid}` doc:
//   1. `client_reference_id` on the checkout session — set by the app to the
//      Firebase uid whenever the buyer is logged in (see App.tsx).
//   2. Falls back to the checkout email if there's no client_reference_id.
//   3. subscription.updated/deleted events carry no reference id at all, so
//      those match by the `stripeCustomerId` this function stamped onto the
//      user doc when the checkout session first completed.
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

async function findUserRef(uid, email) {
  if (uid) {
    const ref = db.collection('users').doc(uid);
    if ((await ref.get()).exists) return ref;
  }
  if (email) {
    const match = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!match.empty) return match.docs[0].ref;
  }
  return null;
}

async function findUserRefByCustomerId(customerId) {
  if (!customerId) return null;
  const match = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  return match.empty ? null : match.docs[0].ref;
}

function applySubscriptionStatus(ref, subscription) {
  const base = {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer,
  };
  if (subscription.status === 'trialing') {
    return ref.set({
      ...base,
      hasPaid: false,
      trialStartAt: subscription.trial_start ? subscription.trial_start * 1000 : Date.now(),
      trialEndAt: subscription.trial_end ? subscription.trial_end * 1000 : null,
    }, { merge: true });
  }
  if (subscription.status === 'active') {
    return ref.set({ ...base, hasPaid: true, paidAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  // canceled, unpaid, incomplete_expired, etc. — access should not continue.
  return ref.set({ ...base, hasPaid: false }, { merge: true });
}

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value());
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        stripeWebhookSecret.value(),
      );
    } catch (err) {
      res.status(400).send(`Webhook signature verification failed: ${err.message}`);
      return;
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const uid = session.client_reference_id || '';
        const email = session.customer_details?.email || session.customer_email || '';
        const ref = await findUserRef(uid, email);
        if (!ref) {
          console.warn('[stripeWebhook] no matching user for checkout session', { uid, email });
        } else if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscriptionStatus(ref, subscription);
        } else {
          // Not a subscription checkout (e.g. a one-off charge) — treat as paid.
          await ref.set({ hasPaid: true, stripeCustomerId: session.customer || '', paidAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      } else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        const ref = await findUserRefByCustomerId(subscription.customer);
        if (ref) await applySubscriptionStatus(ref, subscription);
      } else if (event.type === 'customer.subscription.deleted') {
        const ref = await findUserRefByCustomerId(event.data.object.customer);
        if (ref) await ref.set({ hasPaid: false }, { merge: true });
      }
    } catch (err) {
      console.error('[stripeWebhook] handling error', err);
    }

    res.status(200).send('ok');
  },
);

// ── HubSpot integration: connect a user's HubSpot account, then push leads ──
//
// Each MemoPear user authorizes MemoPear against their *own* HubSpot account
// (OAuth 2.0, authorization-code grant). Tokens are stored server-side in
// `crmConnections/{uid}.hubspot` — a collection the client is never granted
// read/write access to in Firestore rules, since a refresh token is
// equivalent to a permanent login to that person's HubSpot account. Only
// `users/{uid}.hubspotConnected` (a plain boolean, no secrets) is exposed to
// the client so the UI can show connection status.
//
// Setup required in the HubSpot Developer Account (developers.hubspot.com):
//   1. Create an app, add scopes crm.objects.contacts.read + .write.
//   2. Add this function's URL as a Redirect URL on the app's Auth tab.
//   3. Set HUBSPOT_CLIENT_ID (also needed by the frontend as
//      VITE_HUBSPOT_CLIENT_ID — it's not secret, OAuth client IDs are public
//      by design) and HUBSPOT_CLIENT_SECRET via
//      `firebase functions:secrets:set`.
const hubspotClientId = defineSecret('HUBSPOT_CLIENT_ID');
const hubspotClientSecret = defineSecret('HUBSPOT_CLIENT_SECRET');
// Must be byte-for-byte identical to the redirect_uri used in the initial
// authorize request (firebase.ts's HUBSPOT_REDIRECT_URI) and to the Redirect
// URL configured on the HubSpot app's Auth tab — HubSpot rejects the token
// exchange if it doesn't match exactly. Recomputing it from the incoming
// request (protocol/host) is fragile behind Cloud Run's proxy, so it's kept
// as the same literal constant instead.
const HUBSPOT_REDIRECT_URI = 'https://hubspotoauthcallback-yxfmpirqaa-uc.a.run.app';

const HUBSPOT_CONTACT_PROPERTIES = ['email', 'firstname', 'lastname', 'phone', 'company', 'jobtitle', 'website'];

function leadToHubspotProperties(lead) {
  const props = {
    email: lead.email || '',
    firstname: lead.firstName || '',
    lastname: lead.lastName || '',
    phone: lead.phone || '',
    company: lead.company || '',
    jobtitle: lead.jobTitle || '',
    website: lead.website || '',
  };
  // Only send fields with a value — HubSpot doesn't need empty-string writes.
  return Object.fromEntries(Object.entries(props).filter(([k, v]) => v && HUBSPOT_CONTACT_PROPERTIES.includes(k)));
}

exports.hubspotOAuthCallback = onRequest(
  { secrets: [hubspotClientId, hubspotClientSecret] },
  async (req, res) => {
    const uid = String(req.query.state || '');
    if (req.query.error || !req.query.code || !uid) {
      res.redirect('https://go.memopear.com/profile?hubspot=error');
      return;
    }
    try {
      const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: hubspotClientId.value(),
          client_secret: hubspotClientSecret.value(),
          redirect_uri: HUBSPOT_REDIRECT_URI,
          code: String(req.query.code),
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok || !tokens.access_token) {
        console.error('[hubspotOAuthCallback] token exchange failed', tokens);
        res.redirect('https://go.memopear.com/profile?hubspot=error');
        return;
      }
      await db.collection('crmConnections').doc(uid).set({
        hubspot: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + tokens.expires_in * 1000,
          connectedAt: FieldValue.serverTimestamp(),
        },
      }, { merge: true });
      await db.collection('users').doc(uid).set({ hubspotConnected: true }, { merge: true });
      res.redirect('https://go.memopear.com/profile?hubspot=connected');
    } catch (err) {
      console.error('[hubspotOAuthCallback] error', err);
      res.redirect('https://go.memopear.com/profile?hubspot=error');
    }
  },
);

// Returns a valid (refreshing if needed) HubSpot access token for this uid,
// or null if they haven't connected HubSpot.
async function getValidHubspotToken(uid, clientId, clientSecret) {
  const ref = db.collection('crmConnections').doc(uid);
  const snap = await ref.get();
  const hubspot = snap.exists ? snap.data().hubspot : null;
  if (!hubspot) return null;
  if (hubspot.expiresAt > Date.now() + 60_000) return hubspot.accessToken;

  const refreshRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: hubspot.refreshToken,
    }),
  });
  const refreshed = await refreshRes.json();
  if (!refreshRes.ok || !refreshed.access_token) {
    console.error('[hubspotSync] token refresh failed', refreshed);
    return null;
  }
  await ref.set({
    hubspot: {
      ...hubspot,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || hubspot.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    },
  }, { merge: true });
  return refreshed.access_token;
}

// Callable from the client (firebase.ts -> httpsCallable) with the signed-in
// user's Firebase ID token verified automatically — no manual auth check
// needed beyond `request.auth`. Upserts each lead into HubSpot Contacts by
// email, so re-syncing the same lead later updates it instead of duplicating.
exports.syncLeadsToHubspot = onCall(
  { secrets: [hubspotClientId, hubspotClientSecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const leads = Array.isArray(request.data?.leads) ? request.data.leads : [];
    const withEmail = leads.filter((l) => l && l.email);
    const skipped = leads.length - withEmail.length;
    if (!withEmail.length) return { synced: 0, skipped, errors: [] };

    const accessToken = await getValidHubspotToken(request.auth.uid, hubspotClientId.value(), hubspotClientSecret.value());
    if (!accessToken) throw new HttpsError('failed-precondition', 'Connect HubSpot first.');

    const inputs = withEmail.map((lead) => ({
      idProperty: 'email',
      id: lead.email,
      properties: leadToHubspotProperties(lead),
    }));

    const upsertRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ inputs }),
    });
    const result = await upsertRes.json();
    if (!upsertRes.ok) {
      console.error('[syncLeadsToHubspot] HubSpot upsert failed', result);
      throw new HttpsError('internal', result.message || 'HubSpot rejected the request.');
    }
    return { synced: inputs.length, skipped, errors: [] };
  },
);

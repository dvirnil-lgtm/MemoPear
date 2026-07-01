const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
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

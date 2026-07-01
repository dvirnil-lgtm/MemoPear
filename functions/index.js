const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Stripe = require('stripe');

initializeApp();
const db = getFirestore();

const TRIAL_DAYS = 2;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

function trialEndedEmailHtml() {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b;line-height:1.5;">
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

// Runs a few times a day looking for accounts whose 2-day trial just lapsed
// and haven't already gone on to pay (see `stripeWebhook` below, which is
// what keeps `hasPaid` accurate for every account). Writing to the `mail`
// collection is the same trigger the client uses elsewhere in this app (see
// firebase.ts) — the "Trigger Email from Firestore" extension picks it up
// and sends it through SendGrid. `trialEndedEmailSent` is flipped to true in
// the same batch so a doc is never emailed twice even if a run overlaps.
exports.sendTrialEndedEmails = onSchedule('every 6 hours', async () => {
  const cutoff = Date.now() - TRIAL_MS;
  const snap = await db.collection('users')
    .where('trialEndedEmailSent', '==', false)
    .where('hasPaid', '==', false)
    .where('trialStartAt', '<=', cutoff)
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
// The client only knows about a purchase because the user clicks "I've
// paid" after returning from Stripe checkout — that's a self-report, not
// proof, and single-seat buyers never got a server-side record at all
// (only multi-seat team owners get a `subscriptions` doc). This endpoint is
// the source of truth instead: register it in the Stripe Dashboard
// (Developers -> Webhooks) for the `checkout.session.completed` and
// `customer.subscription.deleted` events, pointing at this function's URL.
//
// Matching a Stripe event back to a `users/{uid}` doc:
//   1. `client_reference_id` — set by the app to the Firebase uid when the
//      buyer is logged in (see the pricing page checkout button in App.tsx).
//   2. Falls back to the checkout email if there's no client_reference_id
//      (e.g. a logged-out visitor bought first, then created/linked an
//      account with the same email).
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
        if (ref) {
          await ref.set({
            hasPaid: true,
            stripeCustomerId: session.customer || '',
            paidAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          console.warn('[stripeWebhook] no matching user for checkout session', { uid, email });
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const customerId = event.data.object.customer;
        const match = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!match.empty) {
          await match.docs[0].ref.set({ hasPaid: false }, { merge: true });
        }
      }
    } catch (err) {
      console.error('[stripeWebhook] handling error', err);
    }

    res.status(200).send('ok');
  },
);

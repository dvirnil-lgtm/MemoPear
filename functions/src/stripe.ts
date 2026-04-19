import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-03-31.basil' });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  let event: Stripe.Event;
  try {
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = admin.firestore();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        const usersSnap = await db.collection('users')
          .where('email', '==', customerEmail)
          .limit(1)
          .get();
        if (!usersSnap.empty) {
          await usersSnap.docs[0].ref.update({
            hasPaid: true,
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
          });
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const usersSnap = await db.collection('users')
        .where('stripeCustomerId', '==', sub.customer)
        .limit(1)
        .get();
      if (!usersSnap.empty) {
        await usersSnap.docs[0].ref.update({ hasPaid: false });
      }
      break;
    }
  }

  res.json({ received: true });
});

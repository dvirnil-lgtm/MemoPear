const { onRequest, onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const functionsV1 = require('firebase-functions/v1');

admin.initializeApp();

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

// Stripe Webhook — handles checkout completion and subscription cancellation
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const stripe = require('stripe')(stripeSecretKey.value());
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const db = admin.firestore();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        const snapshot = await db.collection('users')
          .where('email', '==', customerEmail).get();
        const updates = snapshot.docs.map(doc =>
          doc.ref.update({ isPro: true, stripeCustomerId: session.customer })
        );
        await Promise.all(updates);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const customerId = event.data.object.customer;
      const snapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId).get();
      const updates = snapshot.docs.map(doc => doc.ref.update({ isPro: false }));
      await Promise.all(updates);
    }

    res.json({ received: true });
  }
);

// Export leads as CSV attachment to user's email
exports.exportLeadsToEmail = onCall(
  { secrets: [sendgridApiKey] },
  async (request) => {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey.value());

    const { leads, email } = request.data;
    const header = 'Name,Email,Phone,Company,Title,Notes\n';
    const rows = leads.map(l =>
      `"${l.name || ''}","${l.email || ''}","${l.phone || ''}","${l.company || ''}","${l.title || ''}","${l.notes || ''}"`
    ).join('\n');

    await sgMail.send({
      to: email,
      from: 'info@memopear.com',
      subject: 'MemoPear — Lead Export',
      text: 'Your leads export is attached.',
      attachments: [{
        content: Buffer.from(header + rows).toString('base64'),
        filename: `memopear-leads-${Date.now()}.csv`,
        type: 'text/csv',
        disposition: 'attachment',
      }],
    });

    return { success: true };
  }
);

// Export leads to a new Google Sheet and return its URL
exports.exportLeadsToSheets = onCall(async (request) => {
  const { google } = require('googleapis');
  const { leads } = request.data;

  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `MemoPear Leads — ${new Date().toLocaleDateString()}` },
    },
  });
  const spreadsheetId = spreadsheet.data.spreadsheetId;

  const values = [
    ['Name', 'Email', 'Phone', 'Company', 'Title', 'Notes', 'Date'],
    ...leads.map(l => [l.name, l.email, l.phone, l.company, l.title, l.notes, l.date]),
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
});

// Send welcome email and create Firestore user doc on signup
exports.onUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  await db.collection('users').doc(user.uid).set({
    email: user.email || '',
    name: user.displayName || '',
    isPro: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (user.email) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to: user.email,
      from: 'info@memopear.com',
      subject: 'Welcome to MemoPear',
      html: `
        <h2>Welcome to MemoPear!</h2>
        <p>Your account is ready. Start capturing leads at <a href="https://memopear.com">memopear.com</a>.</p>
        <p>Questions? Reply to this email or contact us at info@memopear.com.</p>
      `,
    });
  }
});

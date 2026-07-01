const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

// Runs a few times a day looking for accounts whose 2-day trial just lapsed.
// Writing to the `mail` collection is the same trigger the client uses
// elsewhere in this app (see firebase.ts) — the "Trigger Email from
// Firestore" extension picks it up and sends it through SendGrid.
// `trialEndedEmailSent` is flipped to true in the same batch so a doc is
// never emailed twice even if a run overlaps or retries.
exports.sendTrialEndedEmails = onSchedule('every 6 hours', async () => {
  const cutoff = Date.now() - TRIAL_MS;
  const snap = await db.collection('users')
    .where('trialEndedEmailSent', '==', false)
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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { google } from 'googleapis';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export const exportLeadsToEmail = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  const userId = request.auth.uid;
  const db = admin.firestore();

  const userSnap = await db.doc(`users/${userId}`).get();
  const userEmail = userSnap.data()?.email;
  if (!userEmail) throw new HttpsError('not-found', 'User email not found');

  const leadsSnap = await db.collection(`users/${userId}/leads`).orderBy('createdAt', 'desc').get();
  const leads = leadsSnap.docs.map(d => d.data());

  if (leads.length === 0) throw new HttpsError('not-found', 'No leads to export');

  let csvContent = 'First Name,Last Name,Email,Phone,Company,Job Title,Website,Conference,Notes\n';
  for (const lead of leads) {
    const row = [
      lead.firstName, lead.lastName, lead.email, lead.phone,
      lead.company, lead.jobTitle, lead.website, lead.conferenceName,
      `"${(lead.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
    csvContent += row + '\n';
  }

  const msg = {
    to: userEmail,
    from: { email: 'info@memopear.com', name: 'MemoPear' },
    subject: `Your MemoPear Leads Export (${leads.length} leads)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #65a30d; font-size: 24px;">Your Leads Export</h1>
        <p style="color: #475569;">Attached is a CSV file with your ${leads.length} leads from MemoPear.</p>
        <p style="color: #94a3b8; font-size: 12px;">© 2026 MemoPear</p>
      </div>
    `,
    attachments: [{
      content: Buffer.from(csvContent).toString('base64'),
      filename: `memopear-leads-${new Date().toISOString().split('T')[0]}.csv`,
      type: 'text/csv',
      disposition: 'attachment',
    }],
  };

  await sgMail.send(msg);
  return { success: true, count: leads.length };
});

export const exportLeadsToSheets = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  const userId = request.auth.uid;
  const db = admin.firestore();

  const userSnap = await db.doc(`users/${userId}`).get();
  const userEmail = userSnap.data()?.email;
  if (!userEmail) throw new HttpsError('not-found', 'User email not found');

  const leadsSnap = await db.collection(`users/${userId}/leads`).orderBy('createdAt', 'desc').get();
  const leads = leadsSnap.docs.map(d => d.data());

  if (leads.length === 0) throw new HttpsError('not-found', 'No leads to export');

  const authClient = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `MemoPear Leads - ${new Date().toISOString().split('T')[0]}` },
      sheets: [{ properties: { title: 'Leads' } }],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title', 'Website', 'Conference', 'Notes', 'AI Summary'];
  const rows = leads.map(l => [
    l.firstName, l.lastName, l.email, l.phone,
    l.company, l.jobTitle, l.website, l.conferenceName, l.notes, l.aiSummary || '',
  ]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Leads!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [header, ...rows] },
  });

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { type: 'user', role: 'writer', emailAddress: userEmail },
  });

  return {
    success: true,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    count: leads.length,
  };
});

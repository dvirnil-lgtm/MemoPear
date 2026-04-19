import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const userData = event.data?.data();
  if (!userData?.email) return;

  const msg = {
    to: userData.email,
    from: {
      email: 'info@memopear.com',
      name: 'MemoPear',
    },
    subject: 'Welcome to MemoPear!',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 32px; font-weight: 900; color: #65a30d; margin: 0;">MemoPear</h1>
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-top: 8px;">Smart Field Intelligence</p>
        </div>

        <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 16px;">
          Welcome${userData.name ? ', ' + userData.name : ''}!
        </h2>

        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          You've joined the future of conference lead capture. MemoPear helps you scan business cards,
          record meeting notes, and generate personalized follow-ups — all powered by AI.
        </p>

        <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Get Started</h3>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px;">
            <li>Scan a business card with AI Card Reader</li>
            <li>Record meeting notes with Voice Intelligence</li>
            <li>Export your leads to Google Sheets or email</li>
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="https://memopear.com"
             style="display: inline-block; background: #65a30d; color: white; padding: 16px 40px;
                    border-radius: 12px; font-weight: 800; text-decoration: none; font-size: 14px;
                    text-transform: uppercase; letter-spacing: 2px;">
            Open MemoPear
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          © 2026 MemoPear. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('Welcome email sent to', userData.email);
  } catch (error: any) {
    console.error('Failed to send welcome email:', error?.response?.body || error);
  }
});

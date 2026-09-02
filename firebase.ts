import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  UserCredential,
  User,
  signOut,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Lead } from './types';
import type { BlogPost } from './components/Blog';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Use initializeAuth with explicit sync persistence and resolver so there
// is no lazy async initialisation between the click event and window.open().
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const linkedinProvider = new OAuthProvider('linkedin.com');
linkedinProvider.addScope('openid');
linkedinProvider.addScope('profile');
linkedinProvider.addScope('email');

// The Web OAuth 2.0 client id for this Firebase project. Native Google Sign-In
// (Android/iOS via Credential Manager) needs it to request an ID token that
// Firebase will accept. Falls back to the Sheets-export OAuth client id, which
// lives in the same Google Cloud project.
const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;

// Native Google Sign-In. Google forbids its OAuth screen inside embedded
// WebViews, so on a device we must use the OS-level Google account picker
// (Android Credential Manager) instead of a popup. The plugin returns a Google
// ID token, which we exchange for a normal Firebase credential — so the rest of
// the app (Firestore, Functions, etc.) keeps using the same `auth` user.
let socialLoginReady = false;
async function nativeGoogleSignIn(): Promise<UserCredential> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!socialLoginReady) {
    await SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } });
    socialLoginReady = true;
  }
  const res = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  });
  const idToken = (res.result as { idToken?: string | null } | null)?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

export function signInWithGoogle(): Promise<UserCredential> {
  // On a phone (Capacitor) use the native account picker; in a browser keep the
  // existing popup flow the website relies on.
  if (Capacitor.isNativePlatform()) {
    return nativeGoogleSignIn();
  }
  return signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
}

export function signInWithLinkedIn(): Promise<UserCredential> {
  return signInWithPopup(auth, linkedinProvider, browserPopupRedirectResolver);
}

// Real Firebase email/password accounts (requires the Email/Password provider
// enabled in Firebase → Authentication → Sign-in method).
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string,
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try { await updateProfile(cred.user, { displayName: name }); } catch { /* non-fatal */ }
  }
  return cred;
}

export function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignOut(): Promise<void> {
  return signOut(auth);
}

// Ensures there is a Firebase Auth session so Firestore rules that require
// `request.auth` pass even for email/password users (who otherwise only live in
// localStorage). Returns the existing uid, or an anonymous one as a fallback.
// Requires the Anonymous sign-in provider to be enabled in the Firebase console.
export async function ensureFirebaseSession(): Promise<string | null> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.warn('[MemoPear] anonymous auth failed:', err);
    return null;
  }
}

export const db = getFirestore(app);

async function fetchClientIp(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timer);
    const { ip } = await res.json();
    return ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Sends the one-time welcome email via the same "Trigger Email from
// Firestore" extension used elsewhere in this file — adding a doc to `mail`
// is all it takes for the extension to hand it to SendGrid.
function welcomeEmailHtml(name?: string): string {
  const greeting = name ? `, ${name.split(' ')[0]}` : '';
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b;line-height:1.5;">
      <img src="https://memopear.com/favicon-512.png" alt="MemoPear" width="48" height="48" style="display:block;margin-bottom:16px;border-radius:12px;">
      <h1 style="color:#65a30d;font-size:22px;margin-bottom:4px;">Welcome to MemoPear${greeting}! 🍐</h1>
      <p>Your account is ready — add a card to start your 2-day free trial. You won't be charged until the trial ends, and you can cancel anytime before then.</p>
      <p>MemoPear helps you capture conference leads in seconds: scan a badge, snap a business card, or jot a quick note, and we enrich the rest automatically.</p>
      <p style="margin:28px 0;">
        <a href="https://memopear.com/pricing" style="background:#65a30d;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Start your free trial &rarr;</a>
      </p>
      <p>Plans start at just $2.80/mo after your trial.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">&mdash; The MemoPear Team</p>
    </div>
  `;
}

async function sendWelcomeEmail(toEmail: string, name?: string): Promise<void> {
  if (!toEmail) return;
  try {
    await addDoc(collection(db, 'mail'), {
      to: [toEmail],
      message: {
        subject: 'Welcome to MemoPear — start your free trial 🍐',
        html: welcomeEmailHtml(name),
      },
    });
  } catch (err) {
    console.warn('[MemoPear] welcome email skipped:', err);
  }
}

// Records every sign-in (with IP) to Firestore for trial-abuse review, and —
// the first time a `users/{uid}` doc is created — fires the welcome email and
// defaults `trialEndedEmailSent`/`hasPaid` to false. `trialStartAt` is NOT set
// here: trials require a card now, so it's stamped by the `stripeWebhook`
// Cloud Function (from Stripe's own trial_start) once checkout completes —
// see functions/index.js. Must never block or fail the login itself.
export async function logLoginEvent(user: User, provider: string): Promise<void> {
  try {
    const ip = await fetchClientIp();
    await addDoc(collection(db, 'loginLogs'), {
      uid: user.uid,
      email: user.email || '',
      provider,
      ip,
      userAgent: navigator.userAgent,
      accountCreatedAt: user.metadata.creationTime || '',
      at: serverTimestamp(),
    });
    const userRef = doc(db, 'users', user.uid);
    const isNewUser = !(await getDoc(userRef)).exists();
    await setDoc(userRef, {
      email: user.email || '',
      lastLoginAt: serverTimestamp(),
      accountCreatedAt: user.metadata.creationTime || '',
      ips: arrayUnion(ip),
      ...(isNewUser && {
        trialEndedEmailSent: false,
        hasPaid: false,
      }),
    }, { merge: true });
    if (isNewUser) {
      await sendWelcomeEmail(user.email || '', user.displayName || undefined);
    }
  } catch (err) {
    console.warn('[MemoPear] login logging skipped:', err);
  }
}

// One-shot read of this account's server-confirmed paid status, kept
// accurate by the `stripeWebhook` Cloud Function regardless of which device
// or browser the user last completed checkout on. Used to restore Pro
// access on a fresh login where localStorage has no record of a purchase.
export async function getUserPaidStatus(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && (snap.data() as any).hasPaid === true;
  } catch (err) {
    console.warn('[MemoPear] paid-status check skipped:', err);
    return false;
  }
}

// Records a conference NAME (no personal data) into a shared, aggregated
// collection so the monthly blog automation can see which conferences our users
// actually attend and prioritize writing about them. Each name maps to one doc
// keyed by a slug, with a running count and last-seen timestamp. Best-effort:
// never blocks the caller and silently no-ops if it can't write.
export async function logConferenceName(name: string): Promise<void> {
  const clean = (name || '').trim();
  if (clean.length < 2 || clean.length > 120) return;
  const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  if (!id) return;
  try {
    await setDoc(
      doc(db, 'conferenceSuggestions', id),
      { name: clean, count: increment(1), lastSeen: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    console.warn('[MemoPear] conference logging skipped:', err);
  }
}

// ---------------------------------------------------------------------------
// Team seats / invitations
//
// A paying owner gets one `subscriptions/{ownerUid}` document holding the number
// of seats purchased, an invite token, and the list of members who have claimed
// a seat. The owner always occupies one seat, so up to `seats - 1` teammates can
// join. A teammate claims a seat by opening the owner's invite link and signing
// in; `claimSeat` enforces the cap inside a transaction so the link stops working
// ("all seats are taken") the moment every seat is filled. Each claimed teammate
// also gets a `seatClaims/{uid}` pointer so the app can grant them Pro access.
// ---------------------------------------------------------------------------

export interface SeatMember {
  email: string;
  uid: string;
  joinedAt: number;
}

export interface SubscriptionDoc {
  ownerUid: string;
  ownerEmail: string;
  seats: number;
  cycle: string;
  inviteToken: string;
  members: SeatMember[];
}

export type ClaimResult = 'ok' | 'already' | 'full' | 'invalid' | 'error';

const newInviteToken = (): string =>
  (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '').slice(0, 24);

// Owner: create the subscription doc on first paid checkout, or update the seat
// count / cycle on an existing one. Preserves the existing members and token.
export async function ensureSubscription(
  ownerUid: string,
  ownerEmail: string,
  seats: number,
  cycle: string,
): Promise<SubscriptionDoc> {
  const ref = doc(db, 'subscriptions', ownerUid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as SubscriptionDoc;
    await setDoc(
      ref,
      { ownerEmail, seats, cycle, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { ...data, ownerEmail, seats, cycle };
  }
  const fresh: SubscriptionDoc = {
    ownerUid,
    ownerEmail,
    seats,
    cycle,
    inviteToken: newInviteToken(),
    members: [],
  };
  await setDoc(ref, { ...fresh, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return fresh;
}

export async function getSubscription(ownerUid: string): Promise<SubscriptionDoc | null> {
  const snap = await getDoc(doc(db, 'subscriptions', ownerUid));
  return snap.exists() ? (snap.data() as SubscriptionDoc) : null;
}

// Live updates for the owner's seat panel.
export function watchSubscription(
  ownerUid: string,
  cb: (sub: SubscriptionDoc | null) => void,
): () => void {
  return onSnapshot(
    doc(db, 'subscriptions', ownerUid),
    (snap) => cb(snap.exists() ? (snap.data() as SubscriptionDoc) : null),
    (err) => {
      console.warn('[MemoPear] subscription watch failed:', err);
      cb(null);
    },
  );
}

// Owner: rotate the invite token, invalidating any links already shared.
export async function regenerateInviteToken(ownerUid: string): Promise<string> {
  const token = newInviteToken();
  await setDoc(
    doc(db, 'subscriptions', ownerUid),
    { inviteToken: token, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return token;
}

// Owner: remove a teammate, freeing their seat. Runs in the `removeSeatMember`
// Cloud Function (admin SDK) so seat mutations stay server-side and Firestore
// rules can keep `subscriptions`/`seatClaims` locked down — see functions/index.js.
export async function removeSeatMember(ownerUid: string, email: string): Promise<void> {
  const fn = httpsCallable(getFunctions(app), 'removeSeatMember');
  await fn({ email });
}

// Teammate: claim a seat on the owner's subscription via the invite link.
// Runs in the `claimSeat` Cloud Function, which enforces the seat cap atomically
// and is the only writer of `seatClaims` (the doc that grants Pro access), so a
// user can't self-grant access by writing their own claim. Throws on network
// errors so the caller can surface the reason.
export async function claimSeat(
  ownerUid: string,
  token: string,
  uid: string,
  email: string,
): Promise<ClaimResult> {
  const fn = httpsCallable(getFunctions(app), 'claimSeat');
  const res = await fn({ ownerUid, token, email });
  return ((res.data as { result?: ClaimResult })?.result) || 'error';
}

// Returns the subscription a signed-in user belongs to as a teammate, if any.
export async function getSeatClaim(
  uid: string,
): Promise<{ ownerUid: string; email: string } | null> {
  try {
    const snap = await getDoc(doc(db, 'seatClaims', uid));
    return snap.exists() ? (snap.data() as { ownerUid: string; email: string }) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cross-device lead sync
//
// Captured contacts are mirrored to `userLeads/{accountId}` (keyed by the
// stable Firebase uid) so the same account sees the same contacts on every
// device it signs in from. The whole array is stored on a single document and
// written wholesale on each change; `watchUserLeads` streams updates made from
// other devices. The local copy in localStorage remains the offline cache.
// ---------------------------------------------------------------------------

export async function getUserLeads(accountId: string): Promise<any[] | null> {
  try {
    const snap = await getDoc(doc(db, 'userLeads', accountId));
    return snap.exists() ? ((snap.data() as any).leads || []) : null;
  } catch (err) {
    console.warn('[MemoPear] getUserLeads failed:', err);
    return null;
  }
}

export async function saveUserLeads(accountId: string, leads: any[]): Promise<void> {
  try {
    await setDoc(
      doc(db, 'userLeads', accountId),
      { leads, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    console.warn('[MemoPear] saveUserLeads failed:', err);
  }
}

// Heartbeat: stamps `users/{accountId}.lastActiveAt` so the scheduled
// `sendInactivityReminders` Cloud Function can tell who has stopped using the
// app. Throttled to at most one write per hour (tracked in localStorage) so
// opening the app repeatedly doesn't hammer Firestore.
const LAST_ACTIVE_PING_KEY = 'mp_last_active_ping';
const LAST_ACTIVE_THROTTLE_MS = 60 * 60 * 1000; // 1 hour
export async function touchLastActive(accountId: string): Promise<void> {
  if (!accountId) return;
  try {
    const last = Number(localStorage.getItem(LAST_ACTIVE_PING_KEY) || 0);
    if (Date.now() - last < LAST_ACTIVE_THROTTLE_MS) return;
    localStorage.setItem(LAST_ACTIVE_PING_KEY, String(Date.now()));
    await setDoc(doc(db, 'users', accountId), { lastActiveAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('[MemoPear] lastActive heartbeat skipped:', err);
  }
}

// Streams the account's leads as they change on other devices. Passes `null`
// when the document does not yet exist (or on error) so the caller can decide
// what to seed it with.
export function watchUserLeads(
  accountId: string,
  cb: (leads: any[] | null) => void,
): () => void {
  return onSnapshot(
    doc(db, 'userLeads', accountId),
    (snap) => cb(snap.exists() ? ((snap.data() as any).leads || []) : null),
    (err) => {
      console.warn('[MemoPear] userLeads watch failed:', err);
      cb(null);
    },
  );
}

// Records a cancellation request and emails the team via the "Trigger Email
// from Firestore" extension (configured with SendGrid SMTP), which sends a
// message for every document written to the `mail` collection.
// Emails the signed-in user an export of their captured leads via the same
// "Trigger Email from Firestore" extension used for cancellation notices. The
// CSV is attached so it can be opened in Google Sheets / Excel / imported to Drive.
export async function emailLeadsExport(
  toEmail: string,
  subject: string,
  html: string,
  csv: string,
  csvName: string,
): Promise<void> {
  // UTF-8 safe base64 for the attachment body.
  const content = btoa(unescape(encodeURIComponent(csv)));
  await addDoc(collection(db, 'mail'), {
    to: [toEmail],
    message: {
      subject,
      html,
      attachments: [{ filename: csvName, content, encoding: 'base64' }],
    },
  });
}

// ── Google Sheets export ────────────────────────────────────────────────────
// Pushes leads into a brand-new Google Spreadsheet in the user's own Drive.
// Uses Google Identity Services (loaded in index.html) to obtain a short-lived
// OAuth access token with the drive.file scope (only files this app creates),
// then the Sheets REST API to create the sheet and write the rows.

// The OAuth Web client ID for the "Export to Google Sheets" feature. It's safe
// to ship in the client (it is not a secret; access is restricted by the
// "Authorized JavaScript origins" list in Google Cloud). An env var can still
// override it for other environments.
const DEFAULT_GOOGLE_OAUTH_CLIENT_ID = '602934331700-jv94amekg883gp44h9s1fgk3ql4mtfp8.apps.googleusercontent.com';
const GOOGLE_OAUTH_CLIENT_ID = (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined) || DEFAULT_GOOGLE_OAUTH_CLIENT_ID;
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function getGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_OAUTH_CLIENT_ID) {
      reject(new Error('missing-client-id'));
      return;
    }
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('gis-not-loaded'));
      return;
    }
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: SHEETS_SCOPE,
        callback: (resp: any) => {
          if (resp.error) reject(new Error(resp.error));
          else resolve(resp.access_token as string);
        },
        error_callback: (err: any) => reject(new Error(err?.type || 'oauth-error')),
      });
      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(err instanceof Error ? err : new Error('oauth-init-failed'));
    }
  });
}

// Returns the URL of the created spreadsheet so the UI can link straight to it.
export async function exportLeadsToGoogleSheet(
  title: string,
  rows: string[][],
): Promise<string> {
  const token = await getGoogleAccessToken();
  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ properties: { title } }),
  });
  if (!createRes.ok) throw new Error(`create-failed-${createRes.status}`);
  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId as string;

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`,
    { method: 'PUT', headers: authHeader, body: JSON.stringify({ values: rows }) },
  );
  if (!writeRes.ok) throw new Error(`write-failed-${writeRes.status}`);

  return sheet.spreadsheetUrl as string;
}

// ── HubSpot integration ─────────────────────────────────────────────────────
// OAuth tokens live only in the `crmConnections/{uid}` doc, written by the
// `hubspotOAuthCallback` Cloud Function — this file never reads or writes
// them directly. The client only ever sees the non-secret
// `users/{uid}.hubspotConnected` flag and calls the `syncLeadsToHubspot`
// callable, which does the actual HubSpot API work server-side.
const HUBSPOT_CLIENT_ID = import.meta.env.VITE_HUBSPOT_CLIENT_ID as string | undefined;
// Must exactly match the Redirect URL configured on the HubSpot app's Auth
// tab, and the host this exact Cloud Function is actually deployed at.
const HUBSPOT_REDIRECT_URI = 'https://hubspotoauthcallback-yxfmpirqaa-uc.a.run.app';
const HUBSPOT_SCOPES = 'crm.objects.contacts.read crm.objects.contacts.write';

// Sends the user to HubSpot's consent screen; `state` carries the Firebase
// uid through the redirect so the callback function knows whose account to
// attach the resulting tokens to.
export function buildHubspotAuthUrl(uid: string): string {
  const url = new URL('https://app.hubspot.com/oauth/authorize');
  url.searchParams.set('client_id', HUBSPOT_CLIENT_ID || '');
  url.searchParams.set('redirect_uri', HUBSPOT_REDIRECT_URI);
  url.searchParams.set('scope', HUBSPOT_SCOPES);
  url.searchParams.set('state', uid);
  return url.toString();
}

export function watchHubspotConnection(uid: string, cb: (connected: boolean) => void): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => cb(!!snap.exists() && (snap.data() as any).hubspotConnected === true),
    () => cb(false),
  );
}

export async function syncLeadsToHubspot(leads: Lead[]): Promise<{ synced: number; skipped: number }> {
  const fn = httpsCallable(getFunctions(app), 'syncLeadsToHubspot');
  const result = await fn({ leads });
  return result.data as { synced: number; skipped: number };
}

// ── Blog CMS ────────────────────────────────────────────────────────────────
// Blog posts live in the `blogPosts` Firestore collection (one document per
// post, keyed by slug) so the site owner can publish and edit articles from the
// in-app CMS (components/BlogAdmin.tsx) without a code deploy. Published posts
// are world-readable; only the owner accounts below may write — enforced both
// here (UI gating) and, authoritatively, in firestore.rules. A Cloud Function
// (functions/blogSsr.js) server-renders these same documents into fully
// SEO-optimised HTML for crawlers.

export const storage = getStorage(app);

/**
 * Accounts allowed to author blog posts. Kept in sync with the admin check in
 * firestore.rules and storage.rules. This is UI gating only — the security
 * rules are the real gate.
 */
export const BLOG_ADMIN_EMAILS = ['dvir.n.il@gmail.com'];

export const isBlogAdmin = (email?: string | null): boolean =>
  !!email && BLOG_ADMIN_EMAILS.includes(email.toLowerCase());

export type BlogPostStatus = 'draft' | 'published';

/** A blog post as stored in Firestore: the renderable BlogPost plus CMS metadata. */
export interface StoredBlogPost extends BlogPost {
  status: BlogPostStatus;
  createdAt: number;
  updatedAt: number;
}

const BLOG_COLLECTION = 'blogPosts';

/** Streams every published post, newest first, for the public blog. */
export function watchPublishedPosts(
  cb: (posts: StoredBlogPost[]) => void,
): () => void {
  const q = query(
    collection(db, BLOG_COLLECTION),
    where('status', '==', 'published'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs
        .map((d) => d.data() as StoredBlogPost)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      cb(posts);
    },
    (err) => {
      console.warn('[MemoPear] published posts watch failed:', err);
      cb([]);
    },
  );
}

/** Streams every post (drafts included) for the CMS admin view. */
export function watchAllPosts(
  cb: (posts: StoredBlogPost[]) => void,
): () => void {
  return onSnapshot(
    collection(db, BLOG_COLLECTION),
    (snap) => {
      const posts = snap.docs
        .map((d) => d.data() as StoredBlogPost)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      cb(posts);
    },
    (err) => {
      console.warn('[MemoPear] all posts watch failed:', err);
      cb([]);
    },
  );
}

/** One-shot read of every published post (used where a live stream isn't needed). */
export async function fetchPublishedPosts(): Promise<StoredBlogPost[]> {
  const q = query(collection(db, BLOG_COLLECTION), where('status', '==', 'published'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as StoredBlogPost)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Create or overwrite a post. Keyed by slug; bumps updatedAt. */
export async function savePost(
  post: BlogPost & { status: BlogPostStatus },
  isNew: boolean,
): Promise<void> {
  const now = Date.now();
  const ref = doc(db, BLOG_COLLECTION, post.slug);
  const payload: StoredBlogPost = {
    ...post,
    updatedAt: now,
    createdAt: isNew ? now : ((await getDoc(ref)).data()?.createdAt ?? now),
  };
  // Firestore rejects `undefined`; strip the optional hero image when unset.
  if (payload.heroImageUrl === undefined) delete (payload as any).heroImageUrl;
  await setDoc(ref, payload);
}

export async function deletePost(slug: string): Promise<void> {
  await deleteDoc(doc(db, BLOG_COLLECTION, slug));
}

/** True when a slug is already taken (so the editor can warn before saving). */
export async function slugExists(slug: string): Promise<boolean> {
  const snap = await getDoc(doc(db, BLOG_COLLECTION, slug));
  return snap.exists();
}

/**
 * Uploads an image (hero or inline) for a post to Firebase Storage and returns
 * its public download URL. Files are namespaced by slug so a post's media stays
 * grouped. Only owner accounts may write (enforced in storage.rules).
 */
export async function uploadBlogImage(file: File, slug: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `blog/${slug || 'unfiled'}/${Date.now()}-${safeName}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file, { contentType: file.type, cacheControl: 'public,max-age=31536000,immutable' });
  return getDownloadURL(ref);
}

export async function logCancellationRequest(details: {
  email: string;
  seats: number;
  cycle: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'cancellationRequests'), {
      ...details,
      uid: auth.currentUser?.uid || '',
      notifyTo: 'info@memopear.com',
      at: serverTimestamp(),
    });
    await addDoc(collection(db, 'mail'), {
      to: ['info@memopear.com'],
      message: {
        subject: `MemoPear cancellation request — ${details.email}`,
        text: `${details.email} requested to cancel their MemoPear Pro subscription (${details.seats} seat${details.seats > 1 ? 's' : ''}, ${details.cycle} billing).`,
      },
    });
  } catch (err) {
    console.warn('[MemoPear] cancellation logging skipped:', err);
  }
}

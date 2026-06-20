import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  UserCredential,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

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

export function signInWithGoogle(): Promise<UserCredential> {
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

// Records every sign-in (with IP) to Firestore for trial-abuse review.
// Must never block or fail the login itself.
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
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email || '',
      lastLoginAt: serverTimestamp(),
      accountCreatedAt: user.metadata.creationTime || '',
      ips: arrayUnion(ip),
    }, { merge: true });
  } catch (err) {
    console.warn('[MemoPear] login logging skipped:', err);
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

// Owner: remove a teammate, freeing their seat.
export async function removeSeatMember(ownerUid: string, email: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'subscriptions', ownerUid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as SubscriptionDoc;
    const removed = (data.members || []).find((m) => m.email === email);
    const members = (data.members || []).filter((m) => m.email !== email);
    tx.set(ref, { members, updatedAt: serverTimestamp() }, { merge: true });
    if (removed?.uid) tx.delete(doc(db, 'seatClaims', removed.uid));
  });
}

// Teammate: claim a seat on the owner's subscription via the invite link.
// Enforces the seat cap atomically so the link dies once seats are exhausted.
// Throws on permission/network errors so the caller can surface the reason.
export async function claimSeat(
  ownerUid: string,
  token: string,
  uid: string,
  email: string,
): Promise<ClaimResult> {
  return await runTransaction<ClaimResult>(db, async (tx) => {
    const ref = doc(db, 'subscriptions', ownerUid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return 'invalid';
    const data = snap.data() as SubscriptionDoc;
    if (!token || data.inviteToken !== token) return 'invalid';
    const members = data.members || [];
    // Already on this team — just (re)issue the access pointer.
    if (members.some((m) => m.uid === uid || m.email === email)) {
      tx.set(doc(db, 'seatClaims', uid), { ownerUid, email, joinedAt: Date.now() }, { merge: true });
      return 'already';
    }
    // Owner takes one seat; reject once every remaining seat is filled.
    if (members.length + 1 >= data.seats) return 'full';
    const member: SeatMember = { email, uid, joinedAt: Date.now() };
    tx.set(ref, { members: [...members, member], updatedAt: serverTimestamp() }, { merge: true });
    tx.set(doc(db, 'seatClaims', uid), { ownerUid, email, joinedAt: Date.now() });
    return 'ok';
  });
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

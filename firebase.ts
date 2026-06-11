import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  UserCredential,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
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

export async function firebaseSignOut(): Promise<void> {
  return signOut(auth);
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

// Records a cancellation request and emails the team via the "Trigger Email
// from Firestore" extension (configured with SendGrid SMTP), which sends a
// message for every document written to the `mail` collection.
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

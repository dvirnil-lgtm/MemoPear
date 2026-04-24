import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  UserCredential,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD-BThdsFDMJbD7U5FTbefhVl6VnR5VpY",
  authDomain: "gen-lang-client-0075473844.firebaseapp.com",
  projectId: "gen-lang-client-0075473844",
  storageBucket: "gen-lang-client-0075473844.firebasestorage.app",
  messagingSenderId: "882021344676",
  appId: "1:882021344676:web:469fb668b132ba407dcd31",
  measurementId: "G-ENZX008F30",
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

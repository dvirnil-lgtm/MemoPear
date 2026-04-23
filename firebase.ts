import { initializeApp } from 'firebase/app';
import {
  getAuth,
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
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const linkedinProvider = new OAuthProvider('linkedin.com');
linkedinProvider.addScope('openid');
linkedinProvider.addScope('profile');
linkedinProvider.addScope('email');

export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithLinkedIn(): Promise<UserCredential> {
  return signInWithPopup(auth, linkedinProvider);
}

export async function firebaseSignOut(): Promise<void> {
  return signOut(auth);
}

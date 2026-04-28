// frontend/lib/firebase.ts
// Firebase client SDK initialization and auth helpers.
// NEVER import this in Server Components — client-only.

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword as _signInWithEmail,
  signOut as _signOut,
  onAuthStateChanged as _onAuthStateChanged,
  createUserWithEmailAndPassword as _createUser,
  type User,
  type NextOrObserver,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

// Prevent duplicate app init during Next.js hot-reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

/** Sign in with email and password. Returns Firebase UserCredential. */
export async function signInWithEmail(email: string, password: string) {
  return _signInWithEmail(auth, email, password);
}

/** Create a new account with email and password. */
export async function createUserWithEmailAndPassword(
  email: string,
  password: string
) {
  return _createUser(auth, email, password);
}

/** Sign out the current user. */
export async function signOut() {
  return _signOut(auth);
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function — call it in useEffect cleanup.
 */
export function onAuthStateChanged(observer: NextOrObserver<User | null>) {
  return _onAuthStateChanged(auth, observer);
}

/**
 * Get the current user's Firebase ID token.
 * Pass forceRefresh=true to force-renew an expired token.
 * Returns null if no user is signed in.
 */
export async function getCurrentUserToken(
  forceRefresh = false
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export type { User };

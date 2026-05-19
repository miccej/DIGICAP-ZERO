import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
if (typeof window !== 'undefined') {
  console.log("[FIREBASE] Initializing with version 19.4 (Stable)");
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics
export const analytics = typeof window !== 'undefined' 
  ? isSupported().then(yes => yes ? getAnalytics(app) : null).catch(() => null)
  : Promise.resolve(null);

// STABILITY FIX: Use long-polling to bypass WebSocket issues in preview
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Authentication helper
export const ensureAuthenticated = async () => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser;
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Login Error:", error);
    throw error;
  }
};

// testConnection removed to avoid "offline" false positives in preview
// async function testConnection() { ... }

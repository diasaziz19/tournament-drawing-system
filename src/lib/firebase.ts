/**
 * Firebase Client SDK Configuration & Initialization
 * Safe for Next.js App Router (SSR & Client)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB5ggfDs3r3hdzQGGrteiZtW4vFgWVtVCI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dies-natalis-ums-2026.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dies-natalis-ums-2026",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dies-natalis-ums-2026.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "912617266657",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:912617266657:web:c6d163bd67cd5b83e506a0"
};

// Initialize Firebase singleton
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (typeof window !== 'undefined' || getApps().length > 0) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  // Server-side placeholder during Next.js prerender
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    // Graceful fallback
  }
}

export { app, db, auth };
export {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
};
export type { Unsubscribe };

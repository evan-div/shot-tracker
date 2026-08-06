import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Firebase is optional. Without `projectId` and `apiKey` (local dev with no
 * project, CI, tests) every repository falls back to localStorage, so the app
 * stays fully usable — it just isn't shared between devices.
 */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  firestore = getFirestore(app);

  // Point at a local Firestore emulator when asked, e.g.
  // VITE_FIREBASE_EMULATOR_HOST=127.0.0.1:8080
  const emulator = import.meta.env.VITE_FIREBASE_EMULATOR_HOST;
  if (emulator) {
    const [host, port] = emulator.split(':');
    connectFirestoreEmulator(firestore, host, Number(port));
  }
}

export const db: Firestore | null = firestore;

export const SHOTS_COLLECTION = 'shot_assignments';
export const REELS_COLLECTION = 'reel_ideas';

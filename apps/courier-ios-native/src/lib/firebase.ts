import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  Auth,
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from '../config/firebase';

const isValidConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza')
);

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;
let authInstance: Auth | undefined;

if (isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);

    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error: any) {
      if (error?.code === 'auth/already-initialized') {
        authInstance = getAuth(app);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
} else {
  console.error('Firebase config is invalid or missing.');
}

export { app };
export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export const isFirebaseReady = () => Boolean(dbInstance && authInstance);

export const getAuthSafe = () => authInstance ?? null;

export async function signInWithEmail(email: string, password: string) {
  if (!authInstance) throw new Error('Firebase Auth not initialized');
  return signInWithEmailAndPassword(authInstance, email, password);
}

export async function signOut() {
  if (!authInstance) throw new Error('Firebase Auth not initialized');
  return firebaseSignOut(authInstance);
}

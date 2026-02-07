import {getApp, getApps, initializeApp, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';

import {hasFirebaseConfig, runtimeConfig} from '../config/runtime';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export const getFirebaseServices = (): {app: FirebaseApp; auth: Auth; db: Firestore} | null => {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!app) {
    const config = runtimeConfig.firebase;
    app = getApps().length > 0 ? getApp() : initializeApp(config);
  }

  if (!auth && app) {
    auth = getAuth(app);
  }

  if (!db && app) {
    db = getFirestore(app);
  }

  if (!app || !auth || !db) {
    return null;
  }

  return {app, auth, db};
};

export const isFirebaseReady = (): boolean => getFirebaseServices() !== null;

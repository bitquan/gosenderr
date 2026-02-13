import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApp, getApps, initializeApp, type FirebaseApp} from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence} from 'firebase/auth';
import {connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore} from 'firebase/firestore';
import {Platform} from 'react-native';

import {hasFirebaseConfig, runtimeConfig} from '../config/runtime';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let firebaseTargetLogged = false;

type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => unknown;

const readEnv = (key: string): string => {
  const value = (process.env as Record<string, string | undefined>)[key];
  return value ? value.trim() : '';
};

const parseBoolean = (value: string, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'off' || normalized === 'no') {
    return false;
  }
  if (normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes') {
    return true;
  }

  return fallback;
};

const getEmulatorConfig = (): {
  enabled: boolean;
  firestoreHost: string;
  firestorePort: number;
  authHost: string;
  projectId: string;
} => {
  const defaultEnabled = runtimeConfig.envName === 'dev';
  const enabled = parseBoolean(readEnv('SENDERR_USE_FIREBASE_EMULATOR'), defaultEnabled);

  const firestoreAddress = readEnv('SENDERR_FIRESTORE_EMULATOR_HOST') || readEnv('FIRESTORE_EMULATOR_HOST');
  const [firestoreHostPart, firestorePortPart] = firestoreAddress.includes(':')
    ? firestoreAddress.split(':')
    : [firestoreAddress, ''];

  const defaultIosLanHost = '192.168.0.76';
  const explicitProjectId = readEnv('SENDERR_FIREBASE_PROJECT_ID') || readEnv('FIREBASE_PROJECT_ID');
  const projectId = explicitProjectId || 'demo-senderr';
  const firestoreHost = firestoreHostPart || '127.0.0.1';
  const firestorePort = Number(readEnv('SENDERR_FIRESTORE_EMULATOR_PORT') || firestorePortPart || '8080');
  const authHost =
    readEnv('SENDERR_FIREBASE_AUTH_EMULATOR_HOST') || readEnv('FIREBASE_AUTH_EMULATOR_HOST') || '127.0.0.1:9099';

  const shouldUseIosLanFallback =
    Platform.OS === 'ios' &&
    (firestoreHost === '127.0.0.1' || firestoreHost === 'localhost');

  const normalizedFirestoreHost = shouldUseIosLanFallback ? defaultIosLanHost : firestoreHost;
  const normalizedAuthHost =
    shouldUseIosLanFallback && (authHost === '127.0.0.1:9099' || authHost === 'localhost:9099')
      ? `${defaultIosLanHost}:9099`
      : authHost;

  return {
    enabled,
    firestoreHost: normalizedFirestoreHost,
    firestorePort: Number.isFinite(firestorePort) ? firestorePort : 8080,
    authHost: normalizedAuthHost,
    projectId,
  };
};

const createFirestore = (firebaseApp: FirebaseApp): Firestore => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
};

const logFirebaseTarget = (emulatorEnabled: boolean, firestoreHost: string, firestorePort: number): void => {
  if (firebaseTargetLogged) {
    return;
  }

  firebaseTargetLogged = true;
  if (emulatorEnabled) {
    console.log(`[firebase] using emulator Firestore target ${firestoreHost}:${firestorePort} (${Platform.OS})`);
    const localHostOnly = firestoreHost === '127.0.0.1' || firestoreHost === 'localhost';
    if (Platform.OS === 'ios' && localHostOnly) {
      console.log(
        '[firebase] if running on a physical iPhone, set SENDERR_FIRESTORE_EMULATOR_HOST to your Mac LAN IP (e.g. 192.168.x.x:8080).',
      );
    }
    return;
  }

  console.log(`[firebase] using remote Firestore project ${runtimeConfig.firebase.projectId}`);
};

export const getFirebaseServices = (): {app: FirebaseApp; auth: Auth; db: Firestore} | null => {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!app) {
    const emulator = getEmulatorConfig();
    const config = emulator.enabled
      ? {
          ...runtimeConfig.firebase,
          projectId: emulator.projectId,
          authDomain: `${emulator.projectId}.firebaseapp.com`,
          storageBucket: `${emulator.projectId}.appspot.com`,
        }
      : runtimeConfig.firebase;
    app = getApps().length > 0 ? getApp() : initializeApp(config);
  }

  if (!auth && app) {
    try {
      const getReactNativePersistence = (
        FirebaseAuth as unknown as {getReactNativePersistence?: ReactNativePersistenceFactory}
      ).getReactNativePersistence;

      if (getReactNativePersistence) {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage) as Persistence,
        });
      } else {
        auth = initializeAuth(app);
      }
    } catch {
      auth = getAuth(app);
    }

    const emulator = getEmulatorConfig();
    if (auth && emulator.enabled && !authEmulatorConnected) {
      connectAuthEmulator(auth, `http://${emulator.authHost}`, {disableWarnings: true});
      authEmulatorConnected = true;
    }
  }

  if (!db && app) {
    const emulator = getEmulatorConfig();
    db = createFirestore(app);
    logFirebaseTarget(emulator.enabled, emulator.firestoreHost, emulator.firestorePort);
    if (emulator.enabled && !firestoreEmulatorConnected) {
      connectFirestoreEmulator(db, emulator.firestoreHost, emulator.firestorePort);
      firestoreEmulatorConnected = true;
    }
  }

  if (!app || !auth || !db) {
    return null;
  }

  return {app, auth, db};
};

export const isFirebaseReady = (): boolean => getFirebaseServices() !== null;

// Return the currently active Firebase project id used at runtime (emulator overrides when enabled)
export const getActiveFirebaseProjectId = (): string => {
  const emulator = getEmulatorConfig();
  return emulator.enabled ? emulator.projectId : runtimeConfig.firebase.projectId || '';
};

export const isFirebaseEmulatorEnabled = (): boolean => getEmulatorConfig().enabled;

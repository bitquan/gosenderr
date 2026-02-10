import {afterAll, beforeAll, describe, expect, it, jest} from '@jest/globals';

// Provide a simple in-memory AsyncStorage implementation for integration runs
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store[k] ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
    },
  };
});

import {initializeApp, deleteApp, type FirebaseApp} from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  initializeApp as initializeAdminApp,
  getApps as getAdminApps,
} from 'firebase-admin/app';
import {getFirestore as getAdminFirestore} from 'firebase-admin/firestore';

import {configureRuntime} from '../../config/runtime';
import * as sut from '../locationUploadService';

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const [firestoreHost, firestorePortText] = FIRESTORE_HOST.split(':');
const firestorePort = Number(firestorePortText);
const hasEmulator = Boolean(firestoreHost) && Number.isFinite(firestorePort);

describe('locationUploadService integration (Firestore emulator)', () => {
  let app: FirebaseApp | null = null;
  let db: Firestore | null = null;
  const uid = `int-user-${Date.now()}`;

  beforeAll(async () => {
    if (!hasEmulator) return;

    // Ensure runtime config allows firebase client initialization
    configureRuntime({
      firebase: {
        apiKey: 'demo-key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo-senderr',
        storageBucket: 'demo.appspot.com',
        messagingSenderId: '0',
        appId: '1:demo:web:demo',
      },
    });

    app = initializeApp(
      {
        apiKey: 'demo-key',
        appId: '1:demo:web:demo',
        projectId: 'demo-senderr',
      },
      `location-int-${Date.now()}`,
    );

    db = getFirestore(app);
    connectFirestoreEmulator(db, firestoreHost, firestorePort);

    if (getAdminApps().length === 0) {
      initializeAdminApp({projectId: 'demo-senderr'});
    }
  });

  afterAll(async () => {
    if (app) {
      await deleteApp(app);
    }
  });

  const maybeIt = hasEmulator ? it : it.skip;

  maybeIt(
    'enqueue + flush updates user document and clears queue',
    async () => {
      // Enqueue a location for the uid
      await sut.enqueueLocation(uid, {
        latitude: 37.42,
        longitude: -122.08,
        timestamp: Date.now(),
        accuracy: 5,
      } as any);

      // ensure flush performs an upload to Firestore
      const res = await sut.flushQueuedLocationsForSession(uid);
      expect(res.flushed).toBe(1);

      // Verify via admin firestore that the user doc was updated
      const adminDb = getAdminFirestore();
      const docRef = adminDb.collection('users').doc(uid);
      const snap = await docRef.get();
      expect(snap.exists).toBe(true);
      const data = snap.data();
      expect(data).toBeTruthy();
      expect(data!.location).toBeTruthy();
      expect(typeof data!.location.lat).toBe('number');
      expect(typeof data!.location.lng).toBe('number');

      // The queue should be cleared (getItem returns null after remove)
      const storage =
        require('@react-native-async-storage/async-storage').default;
      const raw = await storage.getItem('@senderr/location-upload-queue');
      expect(raw).toBeNull();
    },
  );
});

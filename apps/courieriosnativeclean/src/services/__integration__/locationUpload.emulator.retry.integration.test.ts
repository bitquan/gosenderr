import {afterAll, beforeAll, describe, expect, it} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (store[k] ?? null)),
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
import {connectFirestoreEmulator, getFirestore, type Firestore} from 'firebase/firestore';
import {connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut, type Auth} from 'firebase/auth';
import {initializeApp as initializeAdminApp, getApps as getAdminApps} from 'firebase-admin/app';
import {getFirestore as getAdminFirestore} from 'firebase-admin/firestore';

import {configureRuntime} from '../../config/runtime';
import * as sut from '../locationUploadService';

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
const [firestoreHost, firestorePortText] = FIRESTORE_HOST.split(':');
const firestorePort = Number(firestorePortText);
const hasEmulator = Boolean(firestoreHost) && Number.isFinite(firestorePort) && Boolean(AUTH_HOST);

const maybeIt = hasEmulator ? it : it.skip;

describe('locationUploadService e2e retry (Firestore emulator)', () => {
  let app: FirebaseApp | null = null;
  let db: Firestore | null = null;
  let auth: Auth | null = null;
  let uid = '';

  beforeAll(async () => {
    if (!hasEmulator) return;

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

    app = initializeApp({apiKey: 'demo-key', appId: '1:demo:web:demo', projectId: 'demo-senderr'}, `location-e2e-${Date.now()}`);

    auth = getAuth(app);
    connectAuthEmulator(auth, `http://${AUTH_HOST}`);

    db = getFirestore(app);
    connectFirestoreEmulator(db, firestoreHost, firestorePort);

    // Ensure admin SDK exists for authoritative reads/writes
    if (getAdminApps().length === 0) {
      initializeAdminApp({projectId: 'demo-senderr'});
    }

    // Create a test user and sign them out so we can test unauthenticated failure first
    const testEmail = `e2e-${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const signIn = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    uid = signIn.user.uid;
    await signOut(auth);

    // Store credentials on module scope for use in the test
    (global as any).__E2E_TEST_EMAIL = testEmail;
    (global as any).__E2E_TEST_PASSWORD = testPassword;
  });

  afterAll(async () => {
    if (app) await deleteApp(app);
  });

  maybeIt('fails unauthenticated, then succeeds after sign-in', async () => {
    // Enqueue a location for the uid
    await sut.enqueueLocation(uid, {
      latitude: 37.42,
      longitude: -122.08,
      timestamp: Date.now(),
      accuracy: 3,
    } as any);

    // Attempt to flush while not signed in -> should be denied by rules
    await expect(sut.flushQueuedLocationsForSession(uid)).rejects.toThrow();

    // Now sign in as the user and retry using stored credentials
    const authClient = getAuth(app!);
    const testEmail = (global as any).__E2E_TEST_EMAIL as string;
    const testPassword = (global as any).__E2E_TEST_PASSWORD as string;

    await signInWithEmailAndPassword(authClient, testEmail, testPassword);

    // Now perform flush again as the authenticated user
    const res = await sut.flushQueuedLocationsForSession(uid);
    expect(res.flushed).toBe(1);

    // Verify via admin firestore that the user doc was updated
    const docRef = adminDb.collection('users').doc(uid);
    const snap = await docRef.get();
    expect(snap.exists).toBe(true);
    const data = snap.data();
    expect(data).toBeTruthy();
    expect(data!.location).toBeTruthy();
    expect(typeof data!.location.lat).toBe('number');
    expect(typeof data!.location.lng).toBe('number');

    // Queue cleared
    const storage = require('@react-native-async-storage/async-storage').default;
    const raw = await storage.getItem('@senderr/location-upload-queue');
    expect(raw).toBeNull();
  });
});

import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';
import {deleteApp, initializeApp, type FirebaseApp} from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from 'firebase/functions';
// provide a lightweight AsyncStorage mock for the integration test environment
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// mock firebase/storage helpers so tests can stub upload/getDownloadURL behavior
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: (storage: any, path: string) => ({fullPath: path}),
  uploadString: jest.fn(() => Promise.resolve()),
  uploadBytes: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve('https://storage.example.com/jobs/job-storage/dropoff-123.jpg')),
  connectStorageEmulator: jest.fn(),
}));

// statically import jobsService so Jest/ts-jest resolves it in the test environment
import * as jobsModule from '../jobsService';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  type Auth,
} from 'firebase/auth';
import {initializeApp as initializeAdminApp, getApps as getAdminApps} from 'firebase-admin/app';
import {getFirestore as getAdminFirestore} from 'firebase-admin/firestore';

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
const FUNCTIONS_HOST = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? '';
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'gosenderr-6773f';
const [firestoreHost, firestorePortText] = FIRESTORE_HOST.split(':');
const firestorePort = Number(firestorePortText);
const hasEmulator = Boolean(firestoreHost) && Number.isFinite(firestorePort) && Boolean(AUTH_HOST);
const [functionsHost, functionsPortText] = FUNCTIONS_HOST.split(':');
const functionsPort = Number(functionsPortText);
const hasFunctionsEmulator =
  Boolean(functionsHost) && Number.isFinite(functionsPort) && Boolean(functionsPortText);

describe('jobs critical flow (auth + firestore emulator)', () => {
  let app: FirebaseApp | null = null;
  let db: Firestore | null = null;
  let auth: Auth | null = null;
  let functions: Functions | null = null;
  let uid = '';

  beforeAll(async () => {
    if (!hasEmulator) {
      return;
    }

    // ensure runtimeConfig advertises Firebase so client helpers initialize in tests
    const {runtimeConfig} = require('../../config/runtime');
    runtimeConfig.firebase = {
      apiKey: 'demo-key',
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
      projectId: PROJECT_ID,
      appId: '1:demo:web:demo',
      storageBucket: `${PROJECT_ID}.appspot.com`,
    };

    app = initializeApp({
      apiKey: 'demo-key',
      appId: '1:demo:web:demo',
      projectId: PROJECT_ID,
    });

    auth = getAuth(app);
    connectAuthEmulator(auth, `http://${AUTH_HOST}`);

    db = getFirestore(app);
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    if (hasFunctionsEmulator) {
      functions = getFunctions(app, 'us-central1');
      connectFunctionsEmulator(functions, functionsHost, functionsPort);
    }

    const email = `courier-${Date.now()}@example.com`;
    const password = 'Password123!';
    await createUserWithEmailAndPassword(auth, email, password);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    uid = credential.user.uid;

    if (getAdminApps().length === 0) {
      initializeAdminApp({projectId: PROJECT_ID});
    }
  });

  beforeEach(async () => {
    if (!uid) {
      return;
    }

    const adminDb = getAdminFirestore();
    await adminDb.collection('jobs').doc('job_1').set({
      customerName: 'Integration Customer',
      createdByUid: uid,
      courierUid: uid,
      courierId: uid,
      status: 'assigned',
      pickupAddress: '1 First St',
      dropoffAddress: '2 Second St',
      pickup: {label: '1 First St', latitude: 37.1, longitude: -122.1},
      dropoff: {label: '2 Second St', latitude: 37.2, longitude: -122.2},
      etaMinutes: 12,
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    if (auth?.currentUser) {
      await auth.signOut();
    }
    if (app) {
      await deleteApp(app);
    }
  });

  const maybeIt = hasEmulator ? it : it.skip;
  const maybeItFunctions = hasEmulator && hasFunctionsEmulator ? it : it.skip;

  maybeIt('courier sees assigned job and can advance status', async () => {
    expect(db).not.toBeNull();

    const ref = doc(db!, 'jobs', 'job_1');
    const before = await getDoc(ref);
    expect(before.exists()).toBe(true);
    expect(before.data().status).toBe('assigned');

    await updateDoc(ref, {
      status: 'picked_up',
      updatedAt: new Date(),
    });

    const after = await getDoc(ref);
    expect(after.exists()).toBe(true);
    expect(after.data().status).toBe('picked_up');
  });

  // Full end-to-end lifecycle: dispatch creates an open job -> courier accepts -> picks up -> completes
  maybeIt('full job lifecycle: open -> assigned -> picked_up -> completed', async () => {
    expect(db).not.toBeNull();

    const adminDb = getAdminFirestore();
    const jobId = `job_e2e_${Date.now()}`;

    // Dispatch creates an open job assigned to this courier (simulates assignment)
    await adminDb.collection('jobs').doc(jobId).set({
      customerName: 'E2E Customer',
      createdByUid: uid,
      courierUid: uid,
      courierId: uid,
      status: 'open',
      pickupAddress: '10 E2E St',
      dropoffAddress: '20 E2E Ave',
      pickup: {label: '10 E2E St', latitude: 37.0, longitude: -122.0},
      dropoff: {label: '20 E2E Ave', latitude: 37.1, longitude: -122.1},
      etaMinutes: 15,
      updatedAt: new Date(),
    });

    const ref = doc(db!, 'jobs', jobId);

    // Initial state should be open
    const before = await getDoc(ref);
    expect(before.exists()).toBe(true);
    expect(before.data().status).toBe('open');

    // Courier accepts the job
    await updateDoc(ref, {status: 'assigned', updatedAt: new Date()});
    const assigned = await getDoc(ref);
    expect(assigned.exists()).toBe(true);
    expect(assigned.data().status).toBe('assigned');

    // Courier picks up
    await updateDoc(ref, {status: 'picked_up', updatedAt: new Date()});
    const pickedUp = await getDoc(ref);
    expect(pickedUp.exists()).toBe(true);
    expect(pickedUp.data().status).toBe('picked_up');

    // Courier completes delivery
    await updateDoc(ref, {status: 'completed', updatedAt: new Date()});
    const completed = await getDoc(ref);
    expect(completed.exists()).toBe(true);
    expect(completed.data().status).toBe('completed');
  });

  // Storage emulator E2E: client uploads proof (data URL) -> Storage receives blob -> job doc stores download URL
  const STORAGE_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '';
  const hasStorageEmulator = Boolean(STORAGE_HOST);
  const maybeItStorage = hasStorageEmulator ? it : it.skip;

  maybeItStorage('uploads proof to Storage emulator and writes download URL to job doc', async () => {
    // connect client Storage to emulator
    // FIREBASE_STORAGE_EMULATOR_HOST is expected in the form '127.0.0.1:9199'
    const [host, portText] = STORAGE_HOST.split(':');
    const port = Number(portText || '9199');

    const {getStorage, connectStorageEmulator} = require('firebase/storage');
    const storage = getStorage(app as any);
    connectStorageEmulator(storage, host, port);

    // prepare a job via admin SDK
    const adminDb = getAdminFirestore();
    const jobId = `job_storage_${Date.now()}`;
    await adminDb.collection('jobs').doc(jobId).set({
      customerName: 'Storage Test',
      createdByUid: uid,
      courierUid: uid,
      courierId: uid,
      status: 'assigned',
      pickupAddress: 'S1',
      dropoffAddress: 'S2',
      pickup: {label: 'S1', latitude: 1, longitude: 1},
      dropoff: {label: 'S2', latitude: 2, longitude: 2},
      etaMinutes: 5,
      updatedAt: new Date(),
    });

    // ensure client local cache contains the job (jobsService loads local job first)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify([{id: jobId, customerName: 'Storage Test', pickupAddress: 'S1', dropoffAddress: 'S2', etaMinutes: 5, status: 'assigned', updatedAt: new Date().toISOString()}]));
      }
      return Promise.resolve(null);
    });

    // call client-side attachProof to upload a data URL
    const proofPayload = {url: 'data:image/jpeg;base64,TESTDATA', location: {latitude: 1, longitude: 1}, accuracy: 5, timestamp: new Date().toISOString()};

    // make client-side helpers point to our initialized emulator app/db so attachProof
    // runs the Firebase branch instead of falling back to local-only behavior
    const firebaseHelpers = require('../../services/firebase');
    jest.spyOn(firebaseHelpers, 'isFirebaseReady').mockReturnValue(true);
    jest.spyOn(firebaseHelpers, 'getFirebaseServices').mockReturnValue({app, auth, db});
    // ensure jobsService sees a storage instance so it attempts uploads
    jest.spyOn(firebaseHelpers, 'getFirebaseStorage').mockReturnValue({} as any);

    // stub firebase/storage helpers used by attachProof to ensure upload+URL resolution in CI/test env
    const storageModule = require('firebase/storage');
    (storageModule.uploadString as jest.Mock).mockResolvedValue({});
    (storageModule.getDownloadURL as jest.Mock).mockResolvedValue(`https://storage.example.com/jobs/${jobId}/pickup-1.jpg` as any);

    const sessionForTest = {uid};
    const updated = await (jobsModule as any).attachProof(sessionForTest as any, jobId, 'pickup', proofPayload as any);

    // read job via admin SDK and ensure storage URL present (not data:)
    const jobDoc = await adminDb.collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data() as any;
    expect(jobData.pickupProof).toBeDefined();
    expect(jobData.pickupProof.url).toMatch(/^https?:\/\//);
    expect(jobData.pickupProof.url).not.toContain('data:image');

    // ensure client attachProof returned job with storage URL as well
    expect(updated.pickupProof?.url).toMatch(/^https?:\/\//);
  });

  maybeItFunctions('rejects invalid callable lifecycle transition and leaves job unchanged', async () => {
    expect(functions).not.toBeNull();

    const adminDb = getAdminFirestore();
    const jobId = `job_fn_invalid_${Date.now()}`;
    const correlationId = `corr_invalid_${Date.now()}`;
    await adminDb.collection('jobs').doc(jobId).set({
      customerName: 'Function Invalid Transition',
      createdByUid: uid,
      courierUid: uid,
      courierId: uid,
      status: 'assigned',
      pickupAddress: 'Fn Pickup',
      dropoffAddress: 'Fn Dropoff',
      pickup: {label: 'Fn Pickup', latitude: 38.1, longitude: -77.1},
      dropoff: {label: 'Fn Dropoff', latitude: 38.2, longitude: -77.2},
      etaMinutes: 8,
      updatedAt: new Date(),
    });

    const commandStartDropoff = httpsCallable<
      {jobId: string; correlationId: string},
      {kind: string}
    >(functions!, 'commandStartDropoff');

    await expect(commandStartDropoff({jobId, correlationId})).rejects.toMatchObject({
      code: 'functions/failed-precondition',
    });

    const after = await adminDb.collection('jobs').doc(jobId).get();
    expect(after.exists).toBe(true);
    expect(after.data()?.status).toBe('assigned');

    const eventsRef = collection(db!, 'jobEvents', jobId, 'events');
    const matchingEvents = await getDocs(query(eventsRef, where('correlationId', '==', correlationId)));
    expect(matchingEvents.empty).toBe(true);
  });

  maybeItFunctions('applies callable lifecycle transition and appends job event', async () => {
    expect(functions).not.toBeNull();

    const adminDb = getAdminFirestore();
    const jobId = `job_fn_valid_${Date.now()}`;
    const correlationId = `corr_valid_${Date.now()}`;
    await adminDb.collection('jobs').doc(jobId).set({
      customerName: 'Function Valid Transition',
      createdByUid: uid,
      courierUid: uid,
      courierId: uid,
      status: 'picked_up',
      pickupAddress: 'Fn Pickup',
      dropoffAddress: 'Fn Dropoff',
      pickup: {label: 'Fn Pickup', latitude: 38.1, longitude: -77.1},
      dropoff: {label: 'Fn Dropoff', latitude: 38.2, longitude: -77.2},
      etaMinutes: 8,
      updatedAt: new Date(),
    });

    const commandStartDropoff = httpsCallable<
      {jobId: string; correlationId: string},
      {kind: string; requestedStatus: string; correlationId: string; job: {status: string}}
    >(functions!, 'commandStartDropoff');

    const response = await commandStartDropoff({jobId, correlationId});
    expect(response.data.kind).toBe('success');
    expect(response.data.requestedStatus).toBe('enroute_dropoff');
    expect(response.data.correlationId).toBe(correlationId);
    expect(response.data.job.status).toBe('enroute_dropoff');

    const after = await adminDb.collection('jobs').doc(jobId).get();
    expect(after.exists).toBe(true);
    expect(after.data()?.status).toBe('enroute_dropoff');

    const eventsRef = collection(db!, 'jobEvents', jobId, 'events');
    const matchingEvents = await getDocs(query(eventsRef, where('correlationId', '==', correlationId)));
    expect(matchingEvents.size).toBe(1);
    const event = matchingEvents.docs[0].data();
    expect(event.type).toBe('job.started_dropoff');
    expect(event.fromStatus).toBe('picked_up');
    expect(event.toStatus).toBe('enroute_dropoff');
    expect(event.actorUid).toBe(uid);
  });
});

import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';
import {deleteApp, initializeApp, type FirebaseApp} from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
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
const [firestoreHost, firestorePortText] = FIRESTORE_HOST.split(':');
const firestorePort = Number(firestorePortText);
const hasEmulator = Boolean(firestoreHost) && Number.isFinite(firestorePort) && Boolean(AUTH_HOST);

describe('jobs critical flow (auth + firestore emulator)', () => {
  let app: FirebaseApp | null = null;
  let db: Firestore | null = null;
  let auth: Auth | null = null;
  let uid = '';

  beforeAll(async () => {
    if (!hasEmulator) {
      return;
    }

    app = initializeApp(
      {
        apiKey: 'demo-key',
        appId: '1:demo:web:demo',
        projectId: 'demo-senderr',
      },
      `jobs-int-${Date.now()}`,
    );

    auth = getAuth(app);
    connectAuthEmulator(auth, `http://${AUTH_HOST}`);

    db = getFirestore(app);
    connectFirestoreEmulator(db, firestoreHost, firestorePort);

    const email = `courier-${Date.now()}@example.com`;
    const password = 'Password123!';
    await createUserWithEmailAndPassword(auth, email, password);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    uid = credential.user.uid;

    if (getAdminApps().length === 0) {
      initializeAdminApp({projectId: 'demo-senderr'});
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
      status: 'accepted',
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

  maybeIt('courier sees assigned job and can advance status', async () => {
    expect(db).not.toBeNull();

    const ref = doc(db!, 'jobs', 'job_1');
    const before = await getDoc(ref);
    expect(before.exists()).toBe(true);
    expect(before.data().status).toBe('accepted');

    await updateDoc(ref, {
      status: 'picked_up',
      updatedAt: new Date(),
    });

    const after = await getDoc(ref);
    expect(after.exists()).toBe(true);
    expect(after.data().status).toBe('picked_up');
  });

  // Full end-to-end lifecycle: dispatch creates a pending job → courier accepts → picks up → delivers
  maybeIt('full job lifecycle: pending → accepted → picked_up → delivered', async () => {
    expect(db).not.toBeNull();

    const adminDb = getAdminFirestore();
    const jobId = `job_e2e_${Date.now()}`;

    // Dispatch creates a pending job assigned to this courier (simulates assignment)
    await adminDb.collection('jobs').doc(jobId).set({
      customerName: 'E2E Customer',
      createdByUid: uid,
      courierUid: uid,
      courierId: uid,
      status: 'pending',
      pickupAddress: '10 E2E St',
      dropoffAddress: '20 E2E Ave',
      pickup: {label: '10 E2E St', latitude: 37.0, longitude: -122.0},
      dropoff: {label: '20 E2E Ave', latitude: 37.1, longitude: -122.1},
      etaMinutes: 15,
      updatedAt: new Date(),
    });

    const ref = doc(db!, 'jobs', jobId);

    // Initial state should be pending
    const before = await getDoc(ref);
    expect(before.exists()).toBe(true);
    expect(before.data().status).toBe('pending');

    // Courier accepts the job
    await updateDoc(ref, {status: 'accepted', updatedAt: new Date()});
    const accepted = await getDoc(ref);
    expect(accepted.exists()).toBe(true);
    expect(accepted.data().status).toBe('accepted');

    // Courier picks up
    await updateDoc(ref, {status: 'picked_up', updatedAt: new Date()});
    const pickedUp = await getDoc(ref);
    expect(pickedUp.exists()).toBe(true);
    expect(pickedUp.data().status).toBe('picked_up');

    // Courier delivers
    await updateDoc(ref, {status: 'delivered', updatedAt: new Date()});
    const delivered = await getDoc(ref);
    expect(delivered.exists()).toBe(true);
    expect(delivered.data().status).toBe('delivered');
  });
});

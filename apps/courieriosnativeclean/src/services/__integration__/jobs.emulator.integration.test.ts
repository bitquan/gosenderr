import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {deleteApp, initializeApp, type FirebaseApp} from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
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
import {
  initializeApp as initializeAdminApp,
  getApps as getAdminApps,
} from 'firebase-admin/app';
import {getFirestore as getAdminFirestore} from 'firebase-admin/firestore';

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '';
const [firestoreHost, firestorePortText] = FIRESTORE_HOST.split(':');
const firestorePort = Number(firestorePortText);
const hasEmulator =
  Boolean(firestoreHost) &&
  Number.isFinite(firestorePort) &&
  Boolean(AUTH_HOST);

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
    await adminDb
      .collection('jobs')
      .doc('job_1')
      .set({
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
    const beforeData = before.data();
    expect(beforeData).toBeDefined();
    expect(beforeData!.status).toBe('accepted');

    await updateDoc(ref, {
      status: 'picked_up',
      updatedAt: new Date(),
    });

    const after = await getDoc(ref);
    expect(after.exists()).toBe(true);
    const afterData = after.data();
    expect(afterData).toBeDefined();
    expect(afterData!.status).toBe('picked_up');
  });
});

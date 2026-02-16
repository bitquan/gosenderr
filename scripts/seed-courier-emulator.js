const admin = require('firebase-admin');

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const replaceExistingSeed = parseBoolean(process.env.SEED_REPLACE, false);
const skipIfSeeded = parseBoolean(process.env.SEED_IF_MISSING, true);
const jobsCount = parseNumber(process.env.SEED_JOBS_COUNT, 25);
const defaultProjectList =
  process.env.SENDERR_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'gosenderr-6773f';

const targetProjectIds = defaultProjectList
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

async function removeExistingSeedJobs(db) {
  let deleted = 0;

  while (true) {
    const snapshot = await db.collection('jobs').where('testRecord', '==', true).limit(450).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function assignExistingSeedJobs(db, courierUid) {
  const snapshot = await db.collection('jobs').where('seededBy', '==', 'seed-courier-emulator').get();
  if (snapshot.empty) {
    return 0;
  }

  let updated = 0;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.courierUid === courierUid && data.courierId === courierUid) {
      continue;
    }

    batch.update(doc.ref, {
      courierUid,
      courierId: courierUid,
      notes: 'Seeded VA/DC test job - assigned to Demo Courier',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    updated += 1;
    ops += 1;

    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  return updated;
}

async function seedCourierAndJobs(projectId) {
  const appName = `seed-${projectId}`;
  const app = admin.apps.find(item => item.name === appName) ?? admin.initializeApp({projectId}, appName);
  const auth = app.auth();
  const db = app.firestore();

  const email = 'courier@example.com';
  const password = 'DemoPass123!';

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log('✓ Courier already exists:', user.uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
    user = await auth.createUser({
      email,
      password,
      displayName: 'Demo Courier',
    });
    console.log('✅ Created courier:', user.uid);
  }

  await auth.setCustomUserClaims(user.uid, {role: 'courier', courier: true});

  await db.collection('users').doc(user.uid).set(
    {
      email,
      displayName: 'Demo Courier',
      role: 'courier',
      courierProfileV1: {
        version: 1,
        fullName: 'Demo Courier',
        contact: {email, phoneNumber: '+1234567890'},
        availability: 'available',
        vehicle: {makeModel: 'Prius', plateNumber: 'EMU123', color: 'Blue'},
        settings: {acceptsNewJobs: true, autoStartTracking: false},
        rateCards: {
          packages: {baseFare: 3, perMile: 1.2, perMinute: 0.25, optionalFees: []},
          food: {baseFare: 2.5, perMile: 1.5, restaurantWaitPay: 0.15, optionalFees: []},
        },
        updatedAt: new Date().toISOString(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  const existingSeedJobs = await db.collection('jobs').where('testRecord', '==', true).limit(1).get();
  if (skipIfSeeded && !replaceExistingSeed && !existingSeedJobs.empty) {
    const reassigned = await assignExistingSeedJobs(db, user.uid);
    if (reassigned > 0) {
      console.log(`♻️ Reassigned ${reassigned} existing seeded jobs to courier ${user.uid} for project ${projectId}.`);
    } else {
      console.log(`↷ Seed jobs already exist for project ${projectId}; skipping job generation.`);
    }
    console.log('🧭 Project:', projectId);
    return;
  }

  if (replaceExistingSeed && !existingSeedJobs.empty) {
    const deleted = await removeExistingSeedJobs(db);
    console.log(`♻️ Removed ${deleted} existing seeded jobs for project: ${projectId}`);
  }

  const dc = {lat: 38.8977, lng: -77.0365};
  const va = {lat: 38.8521, lng: -77.0506};
  const randomBetween = (a, b) => a + Math.random() * (b - a);
  const baseSeedTag = `emulator-courier-v1:${projectId}`;

  for (let i = 0; i < jobsCount; i += 1) {
    const pickupLat = randomBetween(dc.lat, va.lat) + (Math.random() - 0.5) * 0.005;
    const pickupLng = randomBetween(dc.lng, va.lng) + (Math.random() - 0.5) * 0.005;
    const dropoffLat = pickupLat + (Math.random() - 0.5) * 0.02;
    const dropoffLng = pickupLng + (Math.random() - 0.5) * 0.02;

    const jobId = `seed-${projectId}-${i + 1}`;
    await db.collection('jobs').doc(jobId).set({
      status: 'open',
      courierUid: user.uid,
      courierId: user.uid,
      type: i % 3 === 0 ? 'food' : 'package',
      customerName: `Seed Customer ${i + 1}`,
      pickupAddress: `Seed Pickup ${i + 1} (VA/DC)`,
      dropoffAddress: `Seed Dropoff ${i + 1} (VA/DC)`,
      pickup: {lat: pickupLat, lng: pickupLng, label: `VA/DC Pickup ${i + 1}`},
      dropoff: {lat: dropoffLat, lng: dropoffLng, label: `VA/DC Dropoff ${i + 1}`},
      etaMinutes: 10 + Math.round(Math.random() * 30),
      notes: 'Seeded VA/DC test job - assigned to Demo Courier',
      testRecord: true,
      seedTag: baseSeedTag,
      seededBy: 'seed-courier-emulator',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`✅ Seeded ${jobsCount} open jobs (VA/DC area) for project: ${projectId}`);
  console.log('🧭 Project:', projectId);
  console.log('📧 Login:', email);
  console.log('🔑 Password:', password);
}

async function run() {
  for (const projectId of targetProjectIds) {
    await seedCourierAndJobs(projectId);
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });

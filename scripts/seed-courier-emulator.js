const admin = require('firebase-admin');

const targetProjectIds = (process.env.FIREBASE_PROJECT_ID || 'demo-senderr,gosenderr-6773f')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

async function seedCourierAndJob(projectId) {
  const appName = `seed-${projectId}`;
  const app = admin.apps.find(item => item.name === appName)
    ?? admin.initializeApp({projectId}, appName);
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

  await db
    .collection('users')
    .doc(user.uid)
    .set(
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

  const jobRef = await db.collection('jobs').add({
    status: 'pending',
    type: 'package',
    customerName: 'Assigned Seed Customer',
    pickupAddress: '1600 Pennsylvania Ave NW, Washington, DC 20500',
    dropoffAddress: '100 Maryland Ave NE, Washington, DC 20002',
    pickup: {lat: 38.9072, lng: -77.0369, label: 'Downtown DC Pickup'},
    dropoff: {lat: 38.8899, lng: -77.0091, label: 'Capitol Hill Dropoff'},
    etaMinutes: 20,
    notes: 'Seeded for courier emulator testing',
    courierUid: user.uid,
    courierId: user.uid,
    testRecord: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('✅ Seeded assigned pending job:', jobRef.id, `(${projectId})`);
  console.log('🧭 Project:', projectId);
  console.log('📧 Login:', email);
  console.log('🔑 Password:', password);
}

async function run() {
  for (const projectId of targetProjectIds) {
    await seedCourierAndJob(projectId);
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });

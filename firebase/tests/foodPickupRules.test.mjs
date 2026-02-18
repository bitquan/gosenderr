import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gosenderr-testing';

function resolveFirestoreEmulator() {
  const hostPort = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host, portRaw] = hostPort.split(':');
  const port = Number(portRaw || '8080');
  if (!host || !Number.isFinite(port)) {
    throw new Error(`Invalid FIRESTORE_EMULATOR_HOST: ${hostPort}`);
  }
  return { host, port };
}

async function run() {
  const rules = fs.readFileSync(`${process.cwd()}/firestore.rules`, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, ...resolveFirestoreEmulator() },
  });

  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('foodPickupRestaurants').doc('public-1').set({
      courierId: 'courier-1',
      restaurantName: 'Public Kitchen',
      isPublic: true,
      location: { address: '123 Main St', lat: 40.1, lng: -73.9 },
    });
    await db.collection('foodPickupRestaurants').doc('private-1').set({
      courierId: 'courier-1',
      restaurantName: 'Private Kitchen',
      isPublic: false,
      location: { address: '456 Elm St', lat: 40.2, lng: -73.8 },
    });
  });

  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(anonDb.collection('foodPickupRestaurants').doc('public-1').get());
  await assertSucceeds(
    anonDb.collection('foodPickupRestaurants').where('isPublic', '==', true).get(),
  );
  await assertFails(anonDb.collection('foodPickupRestaurants').doc('private-1').get());

  const ownerDb = testEnv.authenticatedContext('courier-1').firestore();
  await assertSucceeds(ownerDb.collection('foodPickupRestaurants').doc('private-1').get());
  await assertSucceeds(
    ownerDb.collection('foodPickupRestaurants').doc('owner-create-ok').set({
      courierId: 'courier-1',
      restaurantName: 'Owner Created',
      isPublic: true,
      location: { address: '789 Oak St', lat: 40.3, lng: -73.7 },
    }),
  );

  const otherCourierDb = testEnv.authenticatedContext('courier-2').firestore();
  await assertFails(otherCourierDb.collection('foodPickupRestaurants').doc('private-1').get());
  await assertFails(
    otherCourierDb.collection('foodPickupRestaurants').doc('bad-create').set({
      courierId: 'courier-1',
      restaurantName: 'Should Fail',
      isPublic: true,
      location: { address: '101 Pine St', lat: 40.4, lng: -73.6 },
    }),
  );

  const adminDb = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
  await assertSucceeds(adminDb.collection('foodPickupRestaurants').doc('private-1').get());

  await testEnv.cleanup();
  console.log('FoodPickup rules test: PASS');
}

run().catch((error) => {
  console.error('FoodPickup rules test: FAIL', error);
  process.exit(1);
});

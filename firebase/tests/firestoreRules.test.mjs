import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'gosenderr-testing';

async function run() {
  const rules = fs.readFileSync(`${process.cwd()}/firestore.rules`, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });

  // Clean up any existing data
  await testEnv.clearFirestore();

  // Test 1: vendor application creation by owner
  const user123 = testEnv.authenticatedContext('user123');
  const user123Db = user123.firestore();

  try {
    await assertSucceeds(
      user123Db.collection('sellerApplications').doc('user123').set({
        userId: 'user123',
        businessName: 'Test Vendor',
        status: 'pending',
        createdAt: new Date(),
      })
    );
    console.log('Test 1: PASS - owner can create sellerApplication');
  } catch (err) {
    console.error('Test 1: FAIL', err);
  }

  // Test 2: non-admin cannot approve
  const user456 = testEnv.authenticatedContext('user456').firestore();
  try {
    await assertFails(
      user456.collection('sellerApplications').doc('user123').update({ status: 'approved' })
    );
    console.log('Test 2: PASS - non-admin cannot approve');
  } catch (err) {
    console.error('Test 2: FAIL', err);
  }

  // Test 3: admin can approve
  const admin = testEnv.authenticatedContext('admin123', { admin: true });
  const adminDb = admin.firestore();
  try {
    await assertSucceeds(
      adminDb.collection('sellerApplications').doc('user123').update({ status: 'approved' })
    );
    console.log('Test 3: PASS - admin can approve');
  } catch (err) {
    console.error('Test 3: FAIL', err);
  }

  await testEnv.cleanup();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

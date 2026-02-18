import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'gosenderr-testing';

async function run() {
  const rules = fs.readFileSync(`${process.cwd()}/storage.rules`, 'utf8');
  const firestoreRules = fs.readFileSync(`${process.cwd()}/firestore.rules`, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('jobs').doc('jobAssignedVendor123').set({
      createdByUid: 'customer123',
      courierUid: 'vendor123',
      status: 'assigned',
    });
    await db.collection('jobs').doc('jobAssignedCourierABC').set({
      createdByUid: 'customer123',
      courierUid: 'courierABC',
      status: 'assigned',
    });
    await db.collection('users').doc('admin1').set({
      role: 'admin',
    });
  });

  // Test 1: Vendor can upload to own folder
  const vendor123 = testEnv.authenticatedContext('vendor123').storage();
  const admin1 = testEnv.authenticatedContext('admin1').storage();
  const smallBlob = Buffer.alloc(1024); // 1KB
  try {
    await assertSucceeds(vendor123.ref('marketplace/vendor123/photo.jpg').put(smallBlob, { contentType: 'image/jpeg' }));
    console.log('Storage Test 1: PASS - vendor can upload to own folder');
  } catch (err) {
    console.error('Storage Test 1: FAIL', err);
  }

  // Test 2: Vendor cannot upload to another's folder
  try {
    await assertFails(vendor123.ref('marketplace/vendor456/photo.jpg').put(smallBlob, { contentType: 'image/jpeg' }));
    console.log('Storage Test 2: PASS - vendor cannot upload to another folder');
  } catch (err) {
    console.error('Storage Test 2: FAIL', err);
  }

  // Test 3: File size limit enforced (11MB > 10MB max)
  const oversizedBlob = Buffer.alloc(11 * 1024 * 1024);
  try {
    await assertFails(
      vendor123.ref('marketplace/vendor123/large.jpg').put(oversizedBlob, { contentType: 'image/jpeg' })
    );
    console.log('Storage Test 3: PASS - large file rejected (permission denied)');
  } catch (err) {
    console.error('Storage Test 3: FAIL', err);
  }

  // Test 4: Content type validated (PDF)
  const pdfBlob = Buffer.alloc(1024); // small placeholder - contentType passed in metadata below
  try {
    await vendor123.ref('marketplace/vendor123/file.pdf').put(pdfBlob, { contentType: 'application/pdf' });
    console.error('Storage Test 4: FAIL - non-image upload unexpectedly succeeded');
  } catch (err) {
    if (err && err.message && err.message.includes('byteLength')) {
      console.warn('Storage Test 4: SKIPPED due to client SDK multipart upload handling in Node (byteLength error)');
    } else if (err && err.code === 'storage/unauthorized') {
      console.log('Storage Test 4: PASS - non-image rejected (permission denied)');
    } else {
      console.error('Storage Test 4: FAIL', err);
    }
  }

  // Test 5: Public read access
  // First upload a small image as vendor123
  await vendor123.ref('marketplace/vendor123/photo.jpg').put(smallBlob, { contentType: 'image/jpeg' });
  const anon = testEnv.unauthenticatedContext().storage();
  try {
    await assertSucceeds(anon.ref('marketplace/vendor123/photo.jpg').getDownloadURL());
    console.log('Storage Test 5: PASS - unauthenticated read allowed');
  } catch (err) {
    console.error('Storage Test 5: FAIL', err);
  }

  // Test 6: Assigned courier can upload delivery proof
  try {
    await assertSucceeds(
      vendor123
        .ref('delivery-photos/vendor123/jobAssignedVendor123/proof.jpg')
        .put(smallBlob, { contentType: 'image/jpeg' })
    );
    console.log('Storage Test 6: PASS - assigned courier can upload delivery proof');
  } catch (err) {
    console.error('Storage Test 6: FAIL', err);
  }

  // Test 7: Courier cannot upload proof for a job they are not assigned to
  try {
    await assertFails(
      vendor123
        .ref('delivery-photos/vendor123/jobAssignedCourierABC/proof.jpg')
        .put(smallBlob, { contentType: 'image/jpeg' })
    );
    console.log('Storage Test 7: PASS - unassigned courier upload is denied');
  } catch (err) {
    console.error('Storage Test 7: FAIL', err);
  }

  // Test 8: Admin can read courier documents
  try {
    await assertSucceeds(
      vendor123
        .ref('courierDocuments/vendor123/license.jpg')
        .put(smallBlob, { contentType: 'image/jpeg' })
    );
    await assertSucceeds(admin1.ref('courierDocuments/vendor123/license.jpg').getDownloadURL());
    console.log('Storage Test 8: PASS - admin can read protected courier document');
  } catch (err) {
    console.error('Storage Test 8: FAIL', err);
  }

  // Test 9: Courier expense receipts require a numeric year path segment
  try {
    await assertFails(
      vendor123
        .ref('courier-expenses/vendor123/not-a-year/receipt.jpg')
        .put(smallBlob, { contentType: 'image/jpeg' })
    );
    console.log('Storage Test 9: PASS - invalid year path is denied');
  } catch (err) {
    console.error('Storage Test 9: FAIL', err);
  }

  await testEnv.cleanup();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

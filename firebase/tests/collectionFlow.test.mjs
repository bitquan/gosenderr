import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

const PROJECT_ID = 'gosenderr-testing';

async function run() {
  const firestoreRules = fs.readFileSync(`${process.cwd()}/firestore.rules`, 'utf8');
  const storageRules = fs.readFileSync(`${process.cwd()}/storage.rules`, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules },
  });

  // Create vendor context
  const vendor = testEnv.authenticatedContext('vendorUser');
  const vendorDb = vendor.firestore();
  const vendorStorage = vendor.storage();

  // Upload images
  const img1 = Buffer.from('abc');
  const img2 = Buffer.from('def');

  await vendorStorage.ref('marketplace/vendorUser/img1.jpg').put(img1, { contentType: 'image/jpeg' });
  await vendorStorage.ref('marketplace/vendorUser/img2.jpg').put(img2, { contentType: 'image/jpeg' });

  // Get download URLs (should succeed for public read)
  const anon = testEnv.unauthenticatedContext().storage();
  const url1 = await anon.ref('marketplace/vendorUser/img1.jpg').getDownloadURL();
  const url2 = await anon.ref('marketplace/vendorUser/img2.jpg').getDownloadURL();

  // Now create an item in 'items' collection as vendor
  await assertSucceeds(
    vendorDb.collection('items').add({
      title: 'Test Product',
      description: 'Test description',
      price: 19.99,
      category: 'other',
      condition: 'new',
      images: [url1, url2],
      vendorId: 'vendorUser',
      status: 'available',
      createdAt: new Date(),
    })
  );

  // Verify read from public (unauthenticated) finds item via query
  const publicDb = testEnv.unauthenticatedContext().firestore();
  const qSnap = await publicDb.collection('items').where('status', '==', 'available').get();
  const items = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (items.length > 0) {
    console.log('Collection Flow Test: PASS - item created and visible in public items');
  } else {
    console.error('Collection Flow Test: FAIL - item not visible in public items');
  }

  await testEnv.cleanup();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
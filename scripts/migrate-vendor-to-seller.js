#!/usr/bin/env node
/*
  migrate-vendor-to-seller.js

  Scans known collections for documents containing `vendorId` and sets
  `sellerId = vendorId` where `sellerId` is missing. Optional `--remove-old`
  flag will remove `vendorId` after migration.

  Safety: By default this script requires FIRESTORE_EMULATOR_HOST to be set
  (prevents accidental runs against production). Use --force to bypass.
*/

const admin = require('firebase-admin');
const args = process.argv.slice(2);
const FORCE = args.includes('--force') || args.includes('-f');
const REMOVE_OLD = args.includes('--remove-old') || args.includes('-r');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'gosenderr-6773f';

if (!process.env.FIRESTORE_EMULATOR_HOST && !FORCE) {
  console.error('ERROR: FIRESTORE_EMULATOR_HOST is not set. This script defaults to emulator-only runs for safety. Use --force to override.');
  process.exit(1);
}

console.log('Starting migration vendorId -> sellerId');
console.log(`Project: ${PROJECT_ID}`);
console.log(`Remove old vendorId fields after copy: ${REMOVE_OLD}`);

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

const collectionsToScan = [
  'marketplaceItems',
  'marketplaceOrders',
  'items',
  'orders',
  'disputes',
  'deliveryJobs'
];

async function migrateCollection(coll) {
  console.log(`\nScanning collection: ${coll}`);
  const snapshot = await db.collection(coll).get();
  if (snapshot.empty) {
    console.log('  No documents found');
    return { scanned: 0, updated: 0 };
  }

  let scanned = 0;
  let updated = 0;

  for (const doc of snapshot.docs) {
    scanned++;
    const data = doc.data();
    if (data && data.vendorId && (!data.sellerId || data.sellerId === '')) {
      const updates = { sellerId: data.vendorId };
      if (REMOVE_OLD) updates.vendorId = admin.firestore.FieldValue.delete();
      await doc.ref.update(updates);
      console.log(`  Updated ${coll}/${doc.id}: sellerId set to ${data.vendorId}${REMOVE_OLD ? ' (vendorId removed)' : ''}`);
      updated++;
    }
  }

  console.log(`  Scanned ${scanned}, Updated ${updated}`);
  return { scanned, updated };
}

(async function main() {
  let totalScanned = 0; let totalUpdated = 0;
  for (const coll of collectionsToScan) {
    const { scanned, updated } = await migrateCollection(coll);
    totalScanned += scanned; totalUpdated += updated;
  }

  console.log('\nMigration complete');
  console.log(`Total scanned: ${totalScanned}, total updated: ${totalUpdated}`);
  process.exit(0);
})();

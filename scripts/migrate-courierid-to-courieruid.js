#!/usr/bin/env node
/*
  migrate-courierid-to-courieruid.js

  Scan a set of known collections for documents containing `courierId` and:
    - set `courierUid = courierId` when `courierUid` is missing or empty
    - optionally remove the legacy `courierId` when `--remove-old` is passed

  Safety: Defaults to running only when FIRESTORE_EMULATOR_HOST is set. Use
  --force to run against non-emulator (dangerous). Use --dry-run to preview.
*/

const admin = require('firebase-admin');
const args = process.argv.slice(2);
const FORCE = args.includes('--force') || args.includes('-f');
const REMOVE_OLD = args.includes('--remove-old') || args.includes('-r');
const DRY_RUN = args.includes('--dry-run') || args.includes('-d');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'gosenderr-6773f';

if (!process.env.FIRESTORE_EMULATOR_HOST && !FORCE) {
  console.error('ERROR: FIRESTORE_EMULATOR_HOST is not set. This migration defaults to emulator-only runs for safety. Use --force to override.');
  process.exit(1);
}

console.log('Starting migration courierId -> courierUid');
console.log(`Project: ${PROJECT_ID}`);
console.log(`Options: remove-old=${REMOVE_OLD} dry-run=${DRY_RUN}`);

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

// Collections likely to contain legacy courierId references. Add more if you find others.
const collectionsToScan = [
  'jobs',
  'orders',
  'marketplaceOrders',
  'routes',
  'jobPhotos',
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

  for (const docSnap of snapshot.docs) {
    scanned++;
    const data = docSnap.data();
    if (!data) continue;

    const hasLegacy = data.courierId !== undefined && data.courierId !== null && data.courierId !== '';
    const needsCopy = hasLegacy && (!data.courierUid || data.courierUid === '');

    if (needsCopy) {
      const updates = { courierUid: data.courierId };
      if (REMOVE_OLD) updates.courierId = admin.firestore.FieldValue.delete();

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would update ${coll}/${docSnap.id}: set courierUid=${data.courierId}${REMOVE_OLD ? ' (remove courierId)' : ''}`);
      } else {
        await docSnap.ref.update(updates);
        console.log(`  Updated ${coll}/${docSnap.id}: courierUid set to ${data.courierId}${REMOVE_OLD ? ' (courierId removed)' : ''}`);
      }
      updated++;
    } else if (hasLegacy && data.courierUid && REMOVE_OLD) {
      // courierUid already exists but legacy courierId remains — remove it when requested
      const updates = { courierId: admin.firestore.FieldValue.delete() };
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would remove legacy courierId from ${coll}/${docSnap.id}`);
      } else {
        await docSnap.ref.update(updates);
        console.log(`  Removed legacy courierId from ${coll}/${docSnap.id}`);
      }
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

  if (DRY_RUN) console.log('Dry-run mode: no documents were modified.');

  process.exit(0);
})();
#!/usr/bin/env node
/*
  verify-migration-courierid.js

  Quick verification helper for local emulator runs. It will:
   - seed a document with `courierId` only
   - run the migration script (non-dry-run)
   - verify that `courierUid` was written

  Requires FIRESTORE_EMULATOR_HOST to be set (emulator only).
*/

const admin = require('firebase-admin');
const { spawnSync } = require('child_process');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('ERROR: FIRESTORE_EMULATOR_HOST is not set. Run against emulator only.');
  process.exit(1);
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gosenderr-6773f';
admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

(async function main(){
  const docRef = db.collection('jobs').doc('migration-test-job');
  await docRef.set({ courierId: 'legacy-courier-42', foo: 'bar' });
  console.log('Seeded jobs/migration-test-job with courierId=legacy-courier-42');

  console.log('Running migration script...');
  const res = spawnSync('node', ['scripts/migrate-courierid-to-courieruid.js'], { stdio: 'inherit', env: process.env });
  if (res.error) {
    console.error('Migration script failed to run:', res.error);
    process.exit(2);
  }

  const snap = await docRef.get();
  const data = snap.data() || {};
  console.log('Post-migration document data:', data);
  if (data.courierUid === 'legacy-courier-42') {
    console.log('✅ Migration verification succeeded');
    process.exit(0);
  }

  console.error('❌ Migration verification failed');
  process.exit(3);
})();
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function main() {
  // Ensure FIRESTORE_EMULATOR_HOST is set when running emulators
  console.log('FIRESTORE_EMULATOR_HOST', process.env.FIRESTORE_EMULATOR_HOST || 'not set');

  initializeApp({ projectId: process.env.GCP_PROJECT || 'gosenderr-6773f' });
  const db = getFirestore();

  const itemsSnap = await db.collection('items').get();
  console.log('Items count:', itemsSnap.size);
  itemsSnap.forEach(doc => console.log(doc.id, doc.data()));
}

main().catch(err => { console.error(err); process.exit(1); });
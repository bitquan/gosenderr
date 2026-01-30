const admin = require('firebase-admin');

const jobId = process.argv[2];
const newStatus = process.argv[3] || 'pending';
if (!jobId) {
  console.error('Usage: node scripts/set-job-status.js <jobId> [status]');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'gosenderr-6773f' });
  const db = admin.firestore();
  db.settings({ host: 'localhost:8080', ssl: false });
}

const db = admin.firestore();

async function setStatus() {
  try {
    await db.collection('jobs').doc(jobId).update({ status: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`✅ Job ${jobId} status set to ${newStatus}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to set job status:', err);
    process.exit(1);
  }
}

setStatus();

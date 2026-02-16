const admin = require('firebase-admin');
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.SENDERR_FIREBASE_PROJECT_ID || 'gosenderr-6773f';

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
  const db = admin.firestore();
  db.settings({ host: 'localhost:8080', ssl: false });
}

const db = admin.firestore();

async function checkJobs() {
  console.log('🔍 Checking jobs in database...\n');
  console.log('🧭 Project:', projectId);
  
  const snapshot = await db.collection('jobs').where('status', '==', 'open').get();
  console.log('📊 Total open jobs:', snapshot.size);
  console.log('');
  
  if (snapshot.empty) {
    console.log('❌ No open jobs found!');
    console.log('💡 Run: node scripts/create-test-job.js');
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('📦 Job ID:', doc.id);
      console.log('   Status:', data.status);
      console.log('   Pickup:', data.pickup?.label);
      console.log('   Dropoff:', data.dropoff?.label);
      console.log('   Vehicle:', data.vehicleType);
      console.log('   Created:', data.createdAt?.toDate?.() || 'just now');
      console.log('');
    });
  }
}

checkJobs().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

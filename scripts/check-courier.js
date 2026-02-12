const admin = require('firebase-admin');
const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-senderr';

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
  const db = admin.firestore();
  db.settings({ host: 'localhost:8080', ssl: false });
}

const db = admin.firestore();

async function checkCourierSetup() {
  console.log('🔍 Checking courier profiles...\n');
  console.log('🧭 Project:', projectId);
  
  const usersSnapshot = await db.collection('users').get();
  
  if (usersSnapshot.empty) {
    console.log('❌ No users found! You need to sign in first.');
    return;
  }
  
  console.log('📊 Total users:', usersSnapshot.size);
  console.log('');
  
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    const profile = data.courierProfile;
    
    if (profile || data.role === 'courier') {
      console.log('🚗 Courier:', doc.id);
      console.log('   Email:', data.email || 'N/A');
      console.log('   Role:', data.role || 'N/A');
      console.log('   Online:', profile?.isOnline || false);
      console.log('   Has location:', !!profile?.currentLocation);
      console.log('   Location:', profile?.currentLocation);
      console.log('   Package rate card:', !!profile?.packageRateCard);
      console.log('   Food rate card:', !!profile?.foodRateCard);
      console.log('   Work modes:', profile?.workModes);
      console.log('');
    }
  });
}

checkCourierSetup().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

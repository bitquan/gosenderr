const admin = require('firebase-admin');

// Initialize admin SDK
admin.initializeApp({
  projectId: 'gosenderr-6773f',
});

const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false
});

async function checkRateCard() {
  try {
    const courierUid = 'lTql4xxKQegnoGc5n5kKWlKpDiH2';
    
    console.log('\n🔍 Checking rate card for courier:', courierUid);
    
    const userDoc = await db.collection('users').doc(courierUid).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found');
      return;
    }
    
    const userData = userDoc.data();
    const courierProfile = userData.courierProfile;
    
    if (!courierProfile) {
      console.log('❌ No courier profile');
      return;
    }
    
    console.log('\n📍 Current Location:', courierProfile.currentLocation);
    console.log('\n💳 Package Rate Card:');
    console.log(JSON.stringify(courierProfile.packageRateCard, null, 2));
    
    console.log('\n💳 Food Rate Card:');
    console.log(JSON.stringify(courierProfile.foodRateCard, null, 2));
    
    console.log('\n⚙️ Work Modes:', courierProfile.workModes);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkRateCard();

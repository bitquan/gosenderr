const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'gosenderr-6773f',
  });
  
  // Connect to Firestore emulator
  const db = admin.firestore();
  db.settings({
    host: 'localhost:8080',
    ssl: false
  });
  
  console.log('✅ Firebase Admin initialized (Emulator mode)');
}

const db = admin.firestore();

async function createCompletedJob(courierUid) {
  try {
    console.log('📦 Creating completed delivery job for earnings...');

    const completedJob = {
      // Job basics
      status: 'completed',
      type: 'package',
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000)), // 1 day ago
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600000)), // 1 hour ago
      
      // Courier assignment
      courierUid: courierUid,
      courierFee: 18.75,
      
      // Customer info
      customerId: 'test-customer-' + Date.now(),
      customerName: 'Completed Test Customer',
      customerPhone: '+1234567890',
      
      // Pickup location
      pickup: {
        lat: 37.7849,
        lng: -122.4094,
        label: 'Union Square SF',
        address: '333 Post St, San Francisco, CA 94108'
      },
      
      // Dropoff location
      dropoff: {
        lat: 37.7899,
        lng: -122.3944,
        label: 'Ferry Building',
        address: '1 Ferry Building, San Francisco, CA 94111'
      },
      
      // Package details
      description: 'Completed delivery - Documents package',
      weight: 1.5,
      
      // Metadata
      testRecord: true,
      notes: 'This is a completed test job for earnings testing'
    };

    const docRef = await db.collection('jobs').add(completedJob);
    
    console.log('✅ Completed job created successfully!');
    console.log('📋 Job ID:', docRef.id);
    console.log('💰 Courier Fee: $' + completedJob.courierFee);
    console.log('\n📊 Check the earnings page to see this completed job!');
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating completed job:', error);
    process.exit(1);
  }
}

// Get courierUid from command line or use default test uid
const courierUid = process.argv[2] || 'test-courier-uid';

console.log('🚗 Creating completed job for courier:', courierUid);
console.log('💡 Usage: node create-completed-job.js <courierUid>');
console.log('');

createCompletedJob(courierUid).then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});

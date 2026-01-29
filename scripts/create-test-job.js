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

async function createTestJob() {
  try {
    console.log('📦 Creating test delivery job...');

    const testJob = {
      // Job basics
      status: 'open',
      type: 'package',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Customer info (test customer)
      customerId: 'test-customer-' + Date.now(),
      customerName: 'Test Customer',
      customerPhone: '+1234567890',
      
      // Pickup location (Washington DC - Downtown)
      pickup: {
        lat: 38.9072,
        lng: -77.0369,
        label: 'Downtown DC Pickup',
        address: '1600 Pennsylvania Ave NW, Washington, DC 20500'
      },
      
      // Dropoff location (Washington DC - Capitol Hill)
      dropoff: {
        lat: 38.8899,
        lng: -77.0091,
        label: 'Capitol Hill Dropoff',
        address: '100 Maryland Ave NE, Washington, DC 20002'
      },
      
      // Package details
      description: 'Test package delivery - Small box with documents',
      weight: 2.5,
      dimensions: '12x8x4 inches',
      
      // Pricing
      estimatedFee: 15.50,
      
      // Requirements
      vehicleType: 'car',
      requiresProofPhoto: true,
      
      // Metadata
      testRecord: true,
      notes: 'This is a test job created for courier app testing'
    };

    const docRef = await db.collection('jobs').add(testJob);
    
    console.log('✅ Test job created successfully!');
    console.log('📋 Job ID:', docRef.id);
    console.log('📍 Pickup:', testJob.pickup.label);
    console.log('🎯 Dropoff:', testJob.dropoff.label);
    console.log('💰 Estimated Fee: $' + testJob.estimatedFee);
    console.log('\n🚀 Open the courier app and accept this job to test the delivery flow!');
    console.log('🔗 Job URL: http://localhost:5174/jobs/' + docRef.id);
    
  } catch (error) {
    console.error('❌ Error creating test job:', error);
    process.exit(1);
  }
}

createTestJob().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});

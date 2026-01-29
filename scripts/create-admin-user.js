// Quick script to create admin user in Auth emulator
const admin = require('firebase-admin');

// Initialize with emulators
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({
  projectId: 'gosenderr-6773f'
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  try {
    // Try to get user first
    let user;
    try {
      user = await auth.getUserByEmail('admin@example.com');
      console.log('✓ User admin@example.com already exists');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user
        user = await auth.createUser({
          email: 'admin@example.com',
          password: 'DemoPass123!',
          displayName: 'Demo Admin'
        });
        console.log('✅ Created user admin@example.com');
      } else {
        throw error;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
    console.log('✅ Set admin custom claims');

    // Create/update user document
    await db.collection('users').doc(user.uid).set({
      email: 'admin@example.com',
      displayName: 'Demo Admin',
      role: 'admin',
      admin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Created user document');

    console.log('\n🎉 Admin user ready!');
    console.log('   Email: admin@example.com');
    console.log('   Password: DemoPass123!');
    console.log('   UID:', user.uid);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();

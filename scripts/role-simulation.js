const admin = require('firebase-admin');

// Use environment variables set by emulator startup if available
// FIRESTORE_EMULATOR_HOST (e.g., localhost:8080)
// FIREBASE_AUTH_EMULATOR_HOST (e.g., localhost:9099)

// Initialize admin SDK (emulator will be used automatically when env vars are set)
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT || 'gosenderr-6773f' });

async function run() {
  try {
    console.log('🔧 Running role simulation against emulators...');

    // 1) Create Auth user
    const email = `sim-courier+${Date.now()}@example.com`;
    const password = 'Sup3rSecret!';
    const displayName = 'Sim Courier';

    console.log('📝 Creating auth user:', email);
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    const uid = userRecord.uid;
    console.log('✅ Auth user created with uid:', uid);

    // 2) Set custom claims for courier role (simulate onUserCreate behavior)
    await admin.auth().setCustomUserClaims(uid, { role: 'courier', admin: false });
    console.log('🔐 Custom claims set for', uid);

    // 3) Create Firestore users doc with basic courierProfile
    const initialDoc = {
      email: email.toLowerCase(),
      fullName: displayName,
      phone: '',
      role: 'courier',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      courierProfile: {
        isOnline: false,
        workModes: { packagesEnabled: true, foodEnabled: true },
        status: 'pending',
        stats: { totalDeliveries: 0, totalEarnings: 0 },
      },
    };

    console.log('📤 Writing users doc for', uid);
    await admin.firestore().doc(`users/${uid}`).set(initialDoc);
    console.log('✅ User document created');

    // 4) Simulate completing onboarding (write rate cards)
    const packageRateCard = { baseFee: 8, perMile: 2, perMinute: 0.3 };
    const foodRateCard = { baseFee: 3.5, perMile: 1.25 };

    await admin.firestore().doc(`users/${uid}`).update({
      'courierProfile.packageRateCard': packageRateCard,
      'courierProfile.foodRateCard': foodRateCard,
      'courierProfile.status': 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Onboarding data saved (rate cards + status)');

    // 5) Query for couriers that admin UI would find
    console.log('🔍 Querying couriers visible to admin (role==courier & courierProfile exists)');
    const snapshot = await admin.firestore().collection('users').where('role', '==', 'courier').get();
    const couriers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${couriers.length} courier(s) in Firestore`);

    const found = couriers.find(c => c.id === uid);
    if (found) {
      console.log('✅ The simulated courier appears in the users collection (admin should see it):', {
        id: found.id,
        email: found.email,
        status: found.courierProfile?.status,
      });
    } else {
      console.error('❌ Simulated courier was NOT found in users collection');
    }

    // 6) Clean up (optional): delete test user and doc
    // await admin.auth().deleteUser(uid);
    // await admin.firestore().doc(`users/${uid}`).delete();
    // console.log('🧹 Cleanup done');

    process.exit(0);
  } catch (err) {
    console.error('❌ Role simulation failed:', err);
    process.exit(1);
  }
}

run();

const admin = require('./firebase-admin-wrapper');

const email = process.argv[2];
const role = process.argv[3] || 'courier';

if (!email) {
  console.error('Usage: node scripts/create-user-doc.js <email> [role]');
  process.exit(1);
}

async function run() {
  try {
    const auth = admin.auth();
    const db = admin.firestore();

    const user = await auth.getUserByEmail(email);
    const uid = user.uid;

    console.log(`Found user: ${email} (uid: ${uid})`);

    const baseDoc = {
      role,
      email: user.email,
      displayName: user.displayName || user.email,
      averageRating: 0,
      totalRatings: 0,
      totalDeliveries: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (role === 'courier') {
      baseDoc.courierProfile = {
        isOnline: false,
        transportMode: 'car',
        packageRateCard: null,
        foodRateCard: null,
        workModes: {
          packagesEnabled: false,
          foodEnabled: false,
        },
      };
      baseDoc.location = {
        lat: null,
        lng: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    await db.collection('users').doc(uid).set(baseDoc, { merge: true });

    console.log('✅ User document created/updated for', email);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create user doc:', err);
    process.exit(1);
  }
}

run();
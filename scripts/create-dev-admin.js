const admin = require('firebase-admin');

admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT || 'gosenderr-6773f' });

async function run() {
  try {
    const email = 'admin@send.com';
    const password = 'admin123';
    console.log('Creating admin user:', email);

    // Create user or get existing
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists:', userRecord.uid);
    } catch (e) {
      userRecord = await admin.auth().createUser({ email, password, displayName: 'Dev Admin' });
      console.log('Created new auth user:', userRecord.uid);
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin', admin: true });
    console.log('Custom claims set (role=admin)');

    // Create firestore doc
    const userDoc = {
      email: email.toLowerCase(),
      fullName: 'Dev Admin',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      admin: true,
    };

    await admin.firestore().doc(`users/${userRecord.uid}`).set(userDoc, { merge: true });
    console.log('Firestore user doc created/updated');

    // Verify admin is visible in query used by CourierApproval (role === 'courier' && courierProfile) not applicable; admin users appear elsewhere. We'll confirm users collection contains the admin.
    const snapshot = await admin.firestore().collection('users').where('role', '==', 'admin').get();
    console.log('Admins found in Firestore:', snapshot.docs.map(d => ({ id: d.id, email: d.data().email })));

    console.log('Done. Credentials: admin@send.com / admin123');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

run();
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreateUserRequest {
  email: string;
  password: string;
  displayName?: string;
  role: string; // courier | admin | customer | vendor | package_runner
}

export const createUserForAdmin = functions.https.onCall(async (data: CreateUserRequest, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Ensure only admins can call
  const callerDoc = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }

  const { email, password, displayName, role } = data || {};
  if (!email || !password || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'email, password and role are required');
  }

  // Restrict roles to allowed set
  const validRoles = ['courier', 'admin', 'customer', 'vendor', 'package_runner'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', `role must be one of ${validRoles.join(',')}`);
  }

  // Safety: only allow creation when running against emulator or non-prod
  if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT === 'gosenderr-6773f') {
    throw new functions.https.HttpsError('failed-precondition', 'This function is disabled for production');
  }

  try {
    // Create auth user
    const userRecord = await admin.auth().createUser({ email, password, displayName });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, admin: role === 'admin' });

    // Create Firestore user document
    const userDoc: any = {
      email: email.toLowerCase(),
      fullName: displayName || null,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Default profiles
    if (role === 'courier') {
      userDoc.courierProfile = {
        isOnline: false,
        workModes: { packagesEnabled: false, foodEnabled: false },
        status: 'pending',
        stats: { totalDeliveries: 0, totalEarnings: 0 },
      };
    }

    if (role === 'admin') {
      userDoc.adminProfile = { permissions: ['all'], isSuperAdmin: false };
    }

    await admin.firestore().doc(`users/${userRecord.uid}`).set(userDoc);

    // Log admin action
    await admin.firestore().collection('adminActionLog').add({
      adminId: context.auth.uid,
      action: 'create_user',
      targetUserId: userRecord.uid,
      email,
      role,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    functions.logger.error('createUserForAdmin error', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create user');
  }
});
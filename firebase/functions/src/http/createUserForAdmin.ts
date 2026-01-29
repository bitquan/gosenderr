import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreateUserRequest {
  email: string;
  password: string;
  displayName?: string;
  role: string; // courier | admin | customer | vendor | package_runner
}

export async function createUserForAdminHandler(data: CreateUserRequest, context: functions.https.CallableContext) {
  functions.logger.info('createUserForAdmin invoked', { auth: context.auth || null })

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Ensure only admins can call
  const callerRef = admin.firestore().doc(`users/${context.auth.uid}`)
  const callerDoc = await callerRef.get();
  functions.logger.info('createUserForAdmin callerDoc', { exists: callerDoc.exists, data: callerDoc.data?.() })

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
    functions.logger.info('createUserForAdmin creating auth user', { email });
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    functions.logger.info('createUserForAdmin created auth user', { uid: userRecord.uid });

    // Provide a safe server timestamp (FieldValue may be undefined in some emulator contexts)
    const getServerTimestamp = () => {
      const fv = (admin.firestore as any).FieldValue
      if (fv && typeof fv.serverTimestamp === 'function') {
        functions.logger.info('using FieldValue.serverTimestamp')
        return fv.serverTimestamp()
      }

      const ts = (admin.firestore as any).Timestamp
      if (ts && typeof ts.fromDate === 'function') {
        functions.logger.info('using Timestamp.fromDate fallback')
        return ts.fromDate(new Date())
      }

      functions.logger.warn('Firestore Timestamp unavailable; falling back to JS Date')
      return new Date()
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, admin: role === 'admin' });

    // Create Firestore user document
    const userDoc: any = {
      email: email.toLowerCase(),
      fullName: displayName || null,
      role,
      createdAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
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
      timestamp: getServerTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    functions.logger.error('createUserForAdmin error', { message: error?.message || String(error), code: error?.code || null, stack: error?.stack || null });

    // Map common auth errors to HttpsError codes for clearer client errors
    if (error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
      throw new functions.https.HttpsError('already-exists', error.message || 'Auth error');
    }

    throw new functions.https.HttpsError('internal', error?.message || 'Internal error in createUserForAdmin');
  }
}

export const createUserForAdmin = functions.https.onCall(createUserForAdminHandler);
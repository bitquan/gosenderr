import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface RunTestFlowRequest {
  targetUserId: string;
  steps?: string[]; // optional specific steps to run
  cleanup?: boolean; // whether to delete test artifacts on completion
}

export const runTestFlow = functions.https.onCall(async (data: RunTestFlowRequest, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Admin only
  const callerDoc = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
  }

  const { targetUserId, steps = [], cleanup = false } = data || {};
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required');
  }

  // Safety: only run in emulator/dev
  if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT === 'gosenderr-6773f') {
    throw new functions.https.HttpsError('failed-precondition', 'Test flows are blocked in production');
  }

  const runLogRef = admin.firestore().collection('adminFlowLogs').doc();
  const log = (msg: string, meta: any = {}) => runLogRef.collection('entries').add({ message: msg, meta, ts: admin.firestore.FieldValue.serverTimestamp() });

  await runLogRef.set({
    adminId: context.auth.uid,
    targetUserId,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'running',
  });

  try {
    await log('Starting test flow', { steps, cleanup });

    const userRef = admin.firestore().doc(`users/${targetUserId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error('Target user does not exist');
    const user = userSnap.data();

    // Default flow based on role
    const role = user?.role || 'customer';
    await log('Detected role for user', { role });

    // Step: simulate onboarding
    if (steps.length === 0 || steps.includes('onboarding')) {
      await log('Running onboarding step');
      const updates: any = {
        'courierProfile.vehicleType': 'car',
        'courierProfile.serviceRadius': 15,
        'courierProfile.workModes': { packagesEnabled: true, foodEnabled: true },
        'courierProfile.status': role === 'courier' ? 'pending' : admin.firestore.FieldValue.delete(),
        'courierProfile.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      };

      if (role === 'courier') {
        updates['courierProfile.packageRateCard'] = { baseFee: 8, perMile: 2, perMinute: 0.3 };
        updates['courierProfile.foodRateCard'] = { baseFee: 3.5, perMile: 1.25 };
      }

      await userRef.set(updates, { merge: true });
      await log('Onboarding data written', { updates });
    }

    // Step: marketplace (for vendor)
    if (role === 'vendor' && (steps.length === 0 || steps.includes('marketplace'))) {
      await log('Creating marketplace item for vendor');
      const item = {
        title: 'Test Item',
        price: 12.5,
        vendorId: targetUserId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const itemRef = await admin.firestore().collection('marketplaceItems').add(item);
      await log('Marketplace item created', { itemId: itemRef.id });
    }

    // Step: simulate stripe onboarding by setting a flag
    if (steps.length === 0 || steps.includes('stripe')) {
      await log('Simulating Stripe onboarding (flag)');
      await userRef.set({ 'stripe.connected': true }, { merge: true });
      await log('Stripe simulated');
    }

    // Finalize
    await runLogRef.update({ status: 'complete', finishedAt: admin.firestore.FieldValue.serverTimestamp() });
    await log('Test flow completed');

    // Cleanup if requested
    if (cleanup) {
      await log('Cleanup requested: removing test artifacts');
      // Example: remove marketplace items created by this run
      const itemsSnap = await admin.firestore().collection('marketplaceItems').where('vendorId', '==', targetUserId).get();
      for (const d of itemsSnap.docs) await d.ref.delete();
      await log('Cleanup finished');
    }

    return { success: true, runLogId: runLogRef.id };
  } catch (error: any) {
    await runLogRef.update({ status: 'failed', error: error.message || String(error), finishedAt: admin.firestore.FieldValue.serverTimestamp() });
    await log('Test flow failed', { error: error.message });
    functions.logger.error('runTestFlow error', error);
    throw new functions.https.HttpsError('internal', error.message || 'Test flow failed');
  }
});
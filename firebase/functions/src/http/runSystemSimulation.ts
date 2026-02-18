import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Lightweight system simulation used by integration tests. Creates a run log and
// some entries so tests can verify wiring. This is intentionally deterministic
// and minimal — it does not try to emulate the full system.

export async function runSystemSimulationHandler(data: { intensity?: number; cleanup?: boolean }, context: any) {
  if (!context?.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const db = admin.firestore();
  const runRef = db.collection('adminFlowLogs').doc();
  const runLogId = runRef.id;

  await runRef.set({
    adminId: context.auth.uid,
    intensity: Number(data?.intensity || 1),
    status: 'running',
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const entriesColl = runRef.collection('entries');
  // write a few entries
  await entriesColl.add({ message: 'step: init', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await entriesColl.add({ message: 'step: simulate', createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await entriesColl.add({ message: 'step: complete', createdAt: admin.firestore.FieldValue.serverTimestamp() });

  // mark run as complete
  await runRef.update({ status: 'complete', completedAt: admin.firestore.FieldValue.serverTimestamp() });

  // Optionally cleanup (no-op for now)
  if (data?.cleanup) {
    // noop — tests will cleanup read documents themselves
  }

  return { runLogId };
}

export const runSystemSimulation = functions.https.onCall(async (data, context) => {
  return runSystemSimulationHandler(data || {}, context);
});

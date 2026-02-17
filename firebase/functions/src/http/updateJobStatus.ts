import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface UpdateJobStatusRequest {
  jobId?: string;
  nextStatus?: string;
  idempotencyKey?: string;
}

function getNextStatus(currentStatus: string): string | null {
  const transitions: Record<string, string | null> = {
    open: 'assigned',
    assigned: 'enroute_pickup',
    enroute_pickup: 'arrived_pickup',
    arrived_pickup: 'picked_up',
    picked_up: 'enroute_dropoff',
    enroute_dropoff: 'arrived_dropoff',
    arrived_dropoff: 'completed',
    completed: null,
    cancelled: null,
    disputed: null,
    expired: null,
    failed: null,
  };
  return transitions[currentStatus] ?? null;
}

export const updateJobStatus = functions.https.onCall(
  async (data: UpdateJobStatusRequest, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const jobId = (data?.jobId || '').trim();
    const nextStatus = (data?.nextStatus || '').trim();

    if (!jobId || !nextStatus) {
      throw new functions.https.HttpsError('invalid-argument', 'jobId and nextStatus are required');
    }

    const jobRef = admin.firestore().doc(`jobs/${jobId}`);
    const idempotencyKey = (data?.idempotencyKey || '').trim() || null;
    const actorUid = context.auth!.uid;
    const idemRef = idempotencyKey ? admin.firestore().doc(`idempotency/${actorUid}:${idempotencyKey}`) : null;

    // short-circuit if idempotency key already recorded
    if (idemRef) {
      const existing = await idemRef.get();
      if (existing.exists) {
        return { ok: true, duplicate: true };
      }
    }

    try {
      await admin.firestore().runTransaction(async (tx) => {
        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Job not found');
        }

        const jobData = jobSnap.data() as Record<string, any>;

        // Only assigned courier may progress lifecycle (server-side guard)
        if (!jobData.courierUid || jobData.courierUid !== actorUid) {
          throw new functions.https.HttpsError('permission-denied', 'Only the assigned courier can update job status');
        }

        const expected = getNextStatus(jobData.status);
        if (!expected) {
          throw new functions.https.HttpsError('failed-precondition', `Cannot advance from status: ${jobData.status}`);
        }

        if (nextStatus !== expected) {
          throw new functions.https.HttpsError('invalid-argument', `Invalid status transition. Expected: ${expected}, Received: ${nextStatus}`);
        }

        const updatedAtValue = (admin.firestore && (admin.firestore as any).FieldValue && (admin.firestore as any).FieldValue.serverTimestamp)
          ? (admin.firestore as any).FieldValue.serverTimestamp()
          : new Date().toISOString()

        tx.update(jobRef, {
          status: nextStatus,
          updatedAt: updatedAtValue,
        });

        if (idemRef) {
          console.log('updateJobStatus: writing idempotency doc', idemRef.path)
          tx.set(idemRef, {
            command: 'updateJobStatus',
            jobId,
            nextStatus,
            createdAt: updatedAtValue,
            actorUid,
          });
        }
      });
    } catch (err: any) {
      console.error('updateJobStatus handler error:', err && err.stack ? err.stack : err)
      throw new functions.https.HttpsError('internal', (err && err.message) || 'internal error')
    }

    return { ok: true };
  },
);

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface ClaimJobRequest {
  jobId?: string;
  agreedFee?: number;
  idempotencyKey?: string;
}

export const claimJob = functions.https.onCall(
  async (data: ClaimJobRequest, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const jobId = (data?.jobId || '').trim();
    const agreedFee = Number(data?.agreedFee || 0);
    const idempotencyKey = (data?.idempotencyKey || '').trim() || null;

    if (!jobId || !Number.isFinite(agreedFee) || agreedFee <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'jobId and agreedFee are required');
    }

    const courierUid = context.auth.uid;
    const jobRef = admin.firestore().doc(`jobs/${jobId}`);
    const courierRef = admin.firestore().doc(`users/${courierUid}`);
    const idemRef = idempotencyKey ? admin.firestore().doc(`idempotency/${courierUid}:${idempotencyKey}`) : null;

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
        const courierSnap = await tx.get(courierRef);

        if (!jobSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Job not found');
        }

        if (!courierSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Courier not found');
        }

        const jobData = jobSnap.data() as Record<string, any>;
        const courierData = courierSnap.data() as Record<string, any>;

        if (jobData.status !== 'open' || jobData.courierUid != null) {
          throw new functions.https.HttpsError('failed-precondition', 'Job already claimed or not available');
        }

        if (!courierData?.courierProfile?.currentLocation) {
          throw new functions.https.HttpsError('failed-precondition', 'Courier location not available');
        }

        // Minimal server-side checks (parity with client safety checks)
        const isFoodJob = jobData.isFoodItem || false;
        const rateCard = isFoodJob
          ? courierData.courierProfile?.foodRateCard
          : courierData.courierProfile?.packageRateCard;

        if (!rateCard) {
          throw new functions.https.HttpsError('failed-precondition', 'Courier rate card not configured');
        }

        const updatedAtValue = (admin.firestore && (admin.firestore as any).FieldValue && (admin.firestore as any).FieldValue.serverTimestamp)
          ? (admin.firestore as any).FieldValue.serverTimestamp()
          : new Date().toISOString();

        tx.update(jobRef, {
          courierUid,
          agreedFee,
          status: 'assigned',
          updatedAt: updatedAtValue,
        });

        if (idemRef) {
          tx.set(idemRef, {
            command: 'claimJob',
            jobId,
            agreedFee,
            createdAt: updatedAtValue,
            actorUid: courierUid,
          });
        }
      });
    } catch (err: any) {
      console.error('claimJob handler error:', err && err.stack ? err.stack : err)
      throw new functions.https.HttpsError('internal', (err && err.message) || 'internal error')
    }

    return { ok: true };
  },
);

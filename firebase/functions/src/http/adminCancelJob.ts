import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

interface AdminCancelJobRequest {
  jobId: string;
  reason: string;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "cancelled",
  "disputed",
  "expired",
  "failed",
]);

/**
 * HTTP Callable Function: adminCancelJob
 *
 * Command-pathway entry for admin-triggered job cancellation.
 * Replaces direct client writes to lifecycle fields.
 */
export const adminCancelJob = functions.https.onCall(
  async (data: AdminCancelJobRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { jobId, reason } = data || ({} as AdminCancelJobRequest);

    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId is required",
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "reason is required",
      );
    }

    const callerUid = context.auth.uid;
    const callerRef = admin.firestore().doc(`users/${callerUid}`);
    const jobRef = admin.firestore().doc(`jobs/${jobId}`);

    const callerSnap = await callerRef.get();
    const isAdminRole = callerSnap.exists && callerSnap.data()?.role === "admin";
    const hasAdminClaim = context.auth.token.admin === true;

    if (!isAdminRole && !hasAdminClaim) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    await admin.firestore().runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);

      if (!jobSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Job not found");
      }

      const job = jobSnap.data();
      const status = (job?.status || "open") as string;

      if (TERMINAL_STATUSES.has(status)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot cancel job from terminal status: ${status}`,
        );
      }

      tx.update(jobRef, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledBy: "admin",
        cancelledByUid: callerUid,
        cancelReason: reason.trim(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await admin.firestore().collection("adminActionLog").add({
      adminId: callerUid,
      action: "cancel_job",
      targetJobId: jobId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        reason: reason.trim(),
        pathway: "adminCancelJob_callable",
      },
    });

    return {
      success: true,
      jobId,
      status: "cancelled",
    };
  },
);

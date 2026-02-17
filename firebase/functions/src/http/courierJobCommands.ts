import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

type JobStatus =
  | "open"
  | "pending"
  | "assigned"
  | "in_progress"
  | "enroute_pickup"
  | "arrived_pickup"
  | "picked_up"
  | "enroute_dropoff"
  | "arrived_dropoff"
  | "completed"
  | "cancelled"
  | "disputed"
  | "expired"
  | "failed"
  | "delivered";

interface ClaimCourierJobRequest {
  jobId: string;
  agreedFee: number;
}

interface AdvanceCourierJobStatusRequest {
  jobId: string;
  nextStatus: JobStatus;
}

function getExpectedNextStatus(currentStatus: JobStatus): JobStatus | null {
  const transitions: Record<JobStatus, JobStatus | null> = {
    open: null,
    pending: "assigned",
    assigned: "enroute_pickup",
    in_progress: "completed",
    enroute_pickup: "arrived_pickup",
    arrived_pickup: "picked_up",
    picked_up: "enroute_dropoff",
    enroute_dropoff: "arrived_dropoff",
    arrived_dropoff: "completed",
    completed: null,
    cancelled: null,
    disputed: null,
    expired: null,
    failed: null,
    delivered: null,
  };

  return transitions[currentStatus] ?? null;
}

export const claimCourierJob = functions.https.onCall(
  async (data: ClaimCourierJobRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { jobId, agreedFee } = data || ({} as ClaimCourierJobRequest);

    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId is required",
      );
    }

    if (typeof agreedFee !== "number" || !Number.isFinite(agreedFee) || agreedFee <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "agreedFee must be a positive number",
      );
    }

    const courierUid = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);
    const userRef = db.doc(`users/${courierUid}`);

    try {
      await db.runTransaction(async (tx) => {
        const [jobSnap, userSnap] = await Promise.all([
          tx.get(jobRef),
          tx.get(userRef),
        ]);

        if (!jobSnap.exists) {
          throw new functions.https.HttpsError("not-found", "Job not found");
        }

        if (!userSnap.exists) {
          throw new functions.https.HttpsError("failed-precondition", "Courier profile not found");
        }

        const jobData = jobSnap.data() as { status?: JobStatus; courierUid?: string | null };
        const status = jobData?.status;

        if (!status || !(status === "open" || status === "pending")) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Job is not claimable from status: ${status || "unknown"}`,
          );
        }

        if (jobData?.courierUid && jobData.courierUid !== courierUid) {
          throw new functions.https.HttpsError(
            "already-exists",
            "Job already claimed by another courier",
          );
        }

        const userData = userSnap.data() as { role?: string; courierProfile?: { status?: string } };
        const isCourierRole = userData?.role === "courier" || context.auth?.token?.courier === true;
        const isApprovedCourier = userData?.courierProfile?.status === "approved";

        if (!isCourierRole || !isApprovedCourier) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Courier approval required to claim jobs",
          );
        }

        tx.update(jobRef, {
          courierUid,
          agreedFee,
          status: "assigned",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      return {
        success: true,
        jobId,
        courierUid,
        status: "assigned",
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      functions.logger.error("claimCourierJob failed", { jobId, courierUid, error });
      throw new functions.https.HttpsError("internal", "Failed to claim job");
    }
  },
);

export const advanceCourierJobStatus = functions.https.onCall(
  async (data: AdvanceCourierJobStatusRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { jobId, nextStatus } = data || ({} as AdvanceCourierJobStatusRequest);

    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId is required",
      );
    }

    if (!nextStatus || typeof nextStatus !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "nextStatus is required",
      );
    }

    const courierUid = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);

    try {
      await db.runTransaction(async (tx) => {
        const jobSnap = await tx.get(jobRef);

        if (!jobSnap.exists) {
          throw new functions.https.HttpsError("not-found", "Job not found");
        }

        const jobData = jobSnap.data() as { status?: JobStatus; courierUid?: string | null };

        if (!jobData?.courierUid || jobData.courierUid !== courierUid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Only assigned courier can update this job",
          );
        }

        const currentStatus = (jobData.status || "open") as JobStatus;
        const expectedNextStatus = getExpectedNextStatus(currentStatus);

        if (!expectedNextStatus) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Cannot advance from status: ${currentStatus}`,
          );
        }

        if (nextStatus !== expectedNextStatus) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Invalid transition: ${currentStatus} -> ${nextStatus}. Expected: ${expectedNextStatus}`,
          );
        }

        tx.update(jobRef, {
          status: nextStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      return {
        success: true,
        jobId,
        status: nextStatus,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      functions.logger.error("advanceCourierJobStatus failed", { jobId, nextStatus, courierUid, error });
      throw new functions.https.HttpsError("internal", "Failed to update job status");
    }
  },
);
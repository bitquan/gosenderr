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

interface SubmitCourierJobProofRequest {
  jobId: string;
  type: "pickup" | "dropoff";
  photoUrl: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface SubmitLegacyDeliveryProofRequest {
  jobId: string;
  photoUrl: string;
  notes?: string;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function calcMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
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

export const submitCourierJobProof = functions.https.onCall(
  async (data: SubmitCourierJobProofRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { jobId, type, photoUrl, coordinates } =
      data || ({} as SubmitCourierJobProofRequest);

    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    if (!(type === "pickup" || type === "dropoff")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "type must be pickup or dropoff",
      );
    }

    if (!photoUrl || typeof photoUrl !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "photoUrl is required");
    }

    if (
      !coordinates ||
      typeof coordinates.latitude !== "number" ||
      typeof coordinates.longitude !== "number" ||
      typeof coordinates.accuracy !== "number"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "coordinates are required",
      );
    }

    const MAX_ACCURACY_METERS = 100;
    const MAX_DISTANCE_MILES = 0.2;

    if (!Number.isFinite(coordinates.accuracy) || coordinates.accuracy > MAX_ACCURACY_METERS) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Location accuracy too low",
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

        const jobData = jobSnap.data() as {
          courierUid?: string | null;
          pickup?: { lat?: number; lng?: number };
          dropoff?: { lat?: number; lng?: number };
        };

        if (!jobData?.courierUid || jobData.courierUid !== courierUid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Only assigned courier can submit proof",
          );
        }

        const target = type === "pickup" ? jobData.pickup : jobData.dropoff;
        if (
          !target ||
          typeof target.lat !== "number" ||
          typeof target.lng !== "number"
        ) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Target location missing on job",
          );
        }

        const distance = calcMiles(
          { lat: coordinates.latitude, lng: coordinates.longitude },
          { lat: target.lat, lng: target.lng },
        );

        if (distance > MAX_DISTANCE_MILES) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Courier is not at the required location",
          );
        }

        const proofPayload = {
          url: photoUrl,
          location: {
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          },
          accuracy: coordinates.accuracy,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        tx.update(jobRef, {
          ...(type === "pickup" ? { pickupProof: proofPayload } : { dropoffProof: proofPayload }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      return { success: true, jobId, type };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      functions.logger.error("submitCourierJobProof failed", { jobId, courierUid, type, error });
      throw new functions.https.HttpsError("internal", "Failed to submit proof");
    }
  },
);

export const submitLegacyDeliveryProof = functions.https.onCall(
  async (data: SubmitLegacyDeliveryProofRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { jobId, photoUrl, notes } = data || ({} as SubmitLegacyDeliveryProofRequest);

    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    if (!photoUrl || typeof photoUrl !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "photoUrl is required");
    }

    const courierUid = context.auth.uid;
    const jobRef = admin.firestore().doc(`jobs/${jobId}`);

    const snap = await jobRef.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Job not found");
    }

    const dataJob = snap.data() as { courierUid?: string | null };
    if (!dataJob?.courierUid || dataJob.courierUid !== courierUid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only assigned courier can submit delivery proof",
      );
    }

    await jobRef.update({
      proofOfDelivery: {
        photoURL: photoUrl,
        notes: notes || "Delivery completed",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      status: "delivered",
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, jobId, status: "delivered" };
  },
);
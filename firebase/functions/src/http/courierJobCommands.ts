import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const serverTimestamp = (): Date => new Date();

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

interface DeclineCourierJobOfferRequest {
  jobId: string;
}

interface ReassignCourierJobAdminRequest {
  jobId: string;
  courierUid: string;
}

interface CancelCourierJobAdminRequest {
  jobId: string;
}

interface CancelCourierJobRequest {
  jobId: string;
}

interface SubmitCourierJobDisputeRequest {
  jobId: string;
  reason: string;
  description: string;
}

interface UpdateLegacyCourierJobStatusRequest {
  jobId: string;
  status: "in_progress" | "completed";
}

interface RejectRunnerJobRequest {
  jobId: string;
  reasonLabel: string;
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

async function isAdminCaller(uid: string, token: Record<string, unknown> = {}): Promise<boolean> {
  if (token.admin === true || token.role === "admin") {
    return true;
  }

  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const userData = userSnap.data() as { role?: string } | undefined;
  return userData?.role === "admin";
}

async function refundTokenCommitForJob(
  jobId: string,
  reason: "job_cancelled" | "job_disputed",
  actorUid: string,
): Promise<void> {
  const db = admin.firestore();
  const commitSnap = await db
    .collection("tokenTransactions")
    .where("type", "==", "commit")
    .where("metadata.jobId", "==", jobId)
    .limit(1)
    .get();

  if (commitSnap.empty) {
    return;
  }

  const commitDoc = commitSnap.docs[0];
  const commitData = commitDoc.data() as {
    uid?: string;
    amount?: number;
    reservationId?: string;
    action?: string;
  };

  const uid = commitData.uid;
  const amount = Number(commitData.amount || 0);
  if (!uid || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const refundTxRef = db.doc(`tokenTransactions/auto_refund_${reason}_${jobId}`);
  const walletRef = db.doc(`tokenWallets/${uid}`);
  const reservationRef = commitData.reservationId
    ? db.doc(`tokenReservations/${commitData.reservationId}`)
    : null;

  await db.runTransaction(async (tx) => {
    const [existingRefundSnap, walletSnap, reservationSnap] = await Promise.all([
      tx.get(refundTxRef),
      tx.get(walletRef),
      reservationRef ? tx.get(reservationRef) : Promise.resolve(null),
    ]);

    if (existingRefundSnap.exists) {
      return;
    }

    const walletData = walletSnap.exists ? walletSnap.data() || {} : {};
    const currentAvailable = Number(walletData.available || 0);
    const currentReserved = Number(walletData.reserved || 0);
    const currentPurchased = Number(walletData.lifetimePurchased || 0);
    const currentSpent = Number(walletData.lifetimeSpent || 0);
    const currentAdjusted = Number(walletData.lifetimeAdjusted || 0);

    tx.set(walletRef, {
      available: currentAvailable + amount,
      reserved: currentReserved,
      lifetimePurchased: currentPurchased,
      lifetimeSpent: currentSpent,
      lifetimeAdjusted: currentAdjusted,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (reservationRef && reservationSnap?.exists) {
      tx.set(reservationRef, {
        status: "refunded",
        refundedAt: serverTimestamp(),
        refundSource: reason,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    tx.set(refundTxRef, {
      uid,
      type: "refund",
      actorType: "system",
      action: commitData.action || "jobUnlockStandard",
      amount,
      idempotencyKey: `auto_refund_${reason}_${jobId}`,
      reservationId: commitData.reservationId || null,
      reason,
      metadata: {
        sourceCommitTxId: commitDoc.id,
        jobId,
        actorUid,
      },
      createdAt: serverTimestamp(),
    }, { merge: true });
  });
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
          updatedAt: serverTimestamp(),
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
          updatedAt: serverTimestamp(),
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
          timestamp: serverTimestamp(),
        };

        tx.update(jobRef, {
          ...(type === "pickup" ? { pickupProof: proofPayload } : { dropoffProof: proofPayload }),
          updatedAt: serverTimestamp(),
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
        timestamp: serverTimestamp(),
      },
      status: "delivered",
      deliveredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, jobId, status: "delivered" };
  },
);

export const declineCourierJobOffer = functions.https.onCall(
  async (data: DeclineCourierJobOfferRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId } = data || ({} as DeclineCourierJobOfferRequest);
    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    const courierUid = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Job not found");
      }

      const jobData = jobSnap.data() as {
        offerQueue?: unknown;
        offerCourierUid?: string | null;
      };

      const offerQueue = Array.isArray(jobData?.offerQueue)
        ? (jobData.offerQueue as string[])
        : [];

      const isInQueue = offerQueue.includes(courierUid);
      const isCurrentOffer = jobData?.offerCourierUid === courierUid;
      if (!isInQueue && !isCurrentOffer) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Courier is not part of this offer queue",
        );
      }

      const remaining = offerQueue.filter((uid) => uid !== courierUid);
      const nextCourierUid = remaining[0] || null;

      tx.update(jobRef, {
        offerQueue: remaining,
        offerCourierUid: nextCourierUid,
        offerStatus: nextCourierUid ? "pending" : "open",
        offerExpiresAt: nextCourierUid
          ? admin.firestore.Timestamp.fromMillis(Date.now() + 90 * 1000)
          : null,
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true, jobId };
  },
);

export const reassignCourierJobAdmin = functions.https.onCall(
  async (data: ReassignCourierJobAdminRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId, courierUid } = data || ({} as ReassignCourierJobAdminRequest);
    if (!jobId || typeof jobId !== "string" || !courierUid || typeof courierUid !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "jobId and courierUid are required",
      );
    }

    const adminUid = context.auth.uid;
    const callerIsAdmin = await isAdminCaller(adminUid, context.auth.token as Record<string, unknown>);
    if (!callerIsAdmin) {
      throw new functions.https.HttpsError("permission-denied", "Admin privileges required");
    }

    const db = admin.firestore();
    const [jobSnap, courierSnap] = await Promise.all([
      db.doc(`jobs/${jobId}`).get(),
      db.doc(`users/${courierUid}`).get(),
    ]);

    if (!jobSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Job not found");
    }

    if (!courierSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Courier not found");
    }

    await db.doc(`jobs/${jobId}`).update({
      courierUid,
      status: "assigned",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      adminLastActionBy: adminUid,
    });

    return { success: true, jobId, courierUid, status: "assigned" };
  },
);

export const cancelCourierJobAdmin = functions.https.onCall(
  async (data: CancelCourierJobAdminRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId } = data || ({} as CancelCourierJobAdminRequest);
    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    const adminUid = context.auth.uid;
    const callerIsAdmin = await isAdminCaller(adminUid, context.auth.token as Record<string, unknown>);
    if (!callerIsAdmin) {
      throw new functions.https.HttpsError("permission-denied", "Admin privileges required");
    }

    await admin.firestore().doc(`jobs/${jobId}`).update({
      status: "cancelled",
      updatedAt: serverTimestamp(),
      adminLastActionBy: adminUid,
    });

    await refundTokenCommitForJob(jobId, "job_cancelled", adminUid);

    return { success: true, jobId, status: "cancelled" };
  },
);

export const cancelCourierJob = functions.https.onCall(
  async (data: CancelCourierJobRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId } = data || ({} as CancelCourierJobRequest);
    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    const callerUid = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Job not found");
      }

      const jobData = jobSnap.data() as {
        status?: JobStatus;
        createdByUid?: string;
      };

      if (!jobData.createdByUid || jobData.createdByUid !== callerUid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only job creator can cancel this job",
        );
      }

      if (!jobData.status || !["open", "pending", "assigned"].includes(jobData.status)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot cancel from status: ${jobData.status || "unknown"}`,
        );
      }

      tx.update(jobRef, {
        status: "cancelled",
        cancelledBy: callerUid,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await refundTokenCommitForJob(jobId, "job_cancelled", callerUid);

    return { success: true, jobId, status: "cancelled" };
  },
);

export const submitCourierJobDispute = functions.https.onCall(
  async (data: SubmitCourierJobDisputeRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId, reason, description } = data || ({} as SubmitCourierJobDisputeRequest);
    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    if (!reason || typeof reason !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "reason is required");
    }

    if (!description || typeof description !== "string" || description.trim().length < 20) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "description must be at least 20 characters",
      );
    }

    const callerUid = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Job not found");
      }

      const jobData = jobSnap.data() as {
        status?: JobStatus;
        createdByUid?: string;
      };

      if (!jobData.createdByUid || jobData.createdByUid !== callerUid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only job creator can submit disputes",
        );
      }

      if (!jobData.status || !["completed", "delivered"].includes(jobData.status)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot dispute from status: ${jobData.status || "unknown"}`,
        );
      }

      tx.update(jobRef, {
        status: "disputed",
        disputedBy: callerUid,
        disputedAt: serverTimestamp(),
        disputeReason: reason,
        disputeDescription: description.trim(),
        updatedAt: serverTimestamp(),
      });

      const disputeRef = db.collection("disputes").doc();
      tx.set(disputeRef, {
        jobId,
        customerUid: callerUid,
        reason,
        description: description.trim(),
        status: "open",
        type: "delivery",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await refundTokenCommitForJob(jobId, "job_disputed", callerUid);

    return { success: true, jobId, status: "disputed" };
  },
);

export const updateLegacyCourierJobStatus = functions.https.onCall(
  async (data: UpdateLegacyCourierJobStatusRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId, status } = data || ({} as UpdateLegacyCourierJobStatusRequest);
    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    if (!(status === "in_progress" || status === "completed")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "status must be in_progress or completed",
      );
    }

    const courierUid = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Job not found");
      }

      const jobData = jobSnap.data() as { status?: string; courierUid?: string | null };
      if (!jobData?.courierUid || jobData.courierUid !== courierUid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only assigned courier can update this job",
        );
      }

      if (status === "in_progress" && jobData.status !== "assigned") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot set in_progress from ${jobData.status || "unknown"}`,
        );
      }

      if (status === "completed" && !["assigned", "in_progress"].includes(jobData.status || "")) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot complete from ${jobData.status || "unknown"}`,
        );
      }

      tx.update(jobRef, {
        status,
        ...(status === "completed"
          ? { completedAt: serverTimestamp() }
          : {}),
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true, jobId, status };
  },
);

export const rejectRunnerJob = functions.https.onCall(
  async (data: RejectRunnerJobRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const { jobId, reasonLabel, notes } = data || ({} as RejectRunnerJobRequest);
    if (!jobId || typeof jobId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "jobId is required");
    }

    if (!reasonLabel || typeof reasonLabel !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "reasonLabel is required");
    }

    const runnerId = context.auth.uid;
    const db = admin.firestore();
    const jobRef = db.doc(`jobs/${jobId}`);

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Job not found");
      }

      const jobData = jobSnap.data() as { courierUid?: string | null };
      if (!jobData?.courierUid || jobData.courierUid !== runnerId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only assigned runner can reject this job",
        );
      }

      tx.update(jobRef, {
        status: "pending",
        courierUid: null,
        agreedFee: null,
        rejectedBy: runnerId,
        rejectedAt: serverTimestamp(),
        rejectionReason: reasonLabel,
        rejectionNotes: notes || "",
        updatedAt: serverTimestamp(),
      });

      const eventRef = db.collection("jobEvents").doc();
      tx.set(eventRef, {
        jobId,
        runnerId,
        eventType: "rejection",
        reason: reasonLabel,
        notes: notes || "",
        timestamp: serverTimestamp(),
      });
    });

    return { success: true, jobId, status: "pending" };
  },
);
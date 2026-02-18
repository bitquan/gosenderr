import {
  collection,
  addDoc,
<<<<<<< HEAD
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import {
  GeoPoint,
  JobStatus,
  PackageInfo,
  JobPhoto,
} from "./types";
=======
  runTransaction,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  GeoPoint,
  JobStatus,
  UserDoc,
  Job,
  PackageInfo,
  JobPhoto,
} from "./types";
import { calcMiles } from "./pricing";
import { getEligibilityReason } from "./eligibility";
import { getNextStatus } from "./status";
>>>>>>> senderr_app

interface CreateJobPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package: PackageInfo;
  photos: JobPhoto[];
}

<<<<<<< HEAD
interface JobProofPayload {
  type: "pickup" | "dropoff";
  photoUrl: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface TokenPolicy {
  enabled: boolean;
  finalSale: boolean;
  tokenValueUsd: number;
  costs: Record<string, number>;
  packs: Array<{
    id: string;
    tokens: number;
    priceUsd: number;
    stripePriceId?: string;
  }>;
}

interface TokenWalletSummary {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeAdjusted: number;
}

export interface TokenClaimReadiness {
  payoutMode: "cash" | "token";
  useTokenMode: boolean;
  requiredTokens: number;
  availableTokens: number;
  canClaim: boolean;
  reason?: string;
}

export async function getTokenClaimReadiness(
  courierUid: string,
): Promise<TokenClaimReadiness> {
  const userSnap = await getDoc(doc(db, "users", courierUid));
  const payoutMode =
    (userSnap.data()?.courierProfile?.payoutMode as string | undefined) === "token"
      ? "token"
      : "cash";

  if (payoutMode !== "token") {
    return {
      payoutMode,
      useTokenMode: false,
      requiredTokens: 0,
      availableTokens: 0,
      canClaim: true,
    };
  }

  const [policy, wallet] = await Promise.all([
    getTokenPolicy(),
    getTokenWalletSummary(),
  ]);

  const requiredTokens = Number(policy.costs?.jobUnlockStandard || 1);
  const availableTokens = Number(wallet.available || 0);

  if (!policy.enabled) {
    return {
      payoutMode,
      useTokenMode: true,
      requiredTokens,
      availableTokens,
      canClaim: false,
      reason: "Token mode is enabled but token purchases are currently disabled.",
    };
  }

  if (availableTokens < requiredTokens) {
    return {
      payoutMode,
      useTokenMode: true,
      requiredTokens,
      availableTokens,
      canClaim: false,
      reason: `Insufficient tokens. Requires ${requiredTokens}, available ${availableTokens}.`,
    };
  }

  return {
    payoutMode,
    useTokenMode: true,
    requiredTokens,
    availableTokens,
    canClaim: true,
  };
}

=======
>>>>>>> senderr_app
export async function createJob(
  userUid: string,
  payload: CreateJobPayload,
): Promise<string> {
  const jobsRef = collection(db, "jobs");
  const docRef = await addDoc(jobsRef, {
    createdByUid: userUid,
    status: "open" as JobStatus,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    package: payload.package,
    photos: payload.photos,
    courierUid: null,
    agreedFee: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function cancelJob(jobId: string, userUid: string): Promise<void> {
<<<<<<< HEAD
  if (!userUid) {
    throw new Error("User is required");
  }

  const cancelCourierJobCallable = httpsCallable<
    { jobId: string },
    { success: boolean; status: JobStatus }
  >(functions, "cancelCourierJob");

  await cancelCourierJobCallable({ jobId });
=======
  const jobRef = doc(db, "jobs", jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error("Job not found");
  }

  const jobData = jobSnap.data();

  // Only the creator can cancel
  if (jobData.createdByUid !== userUid) {
    throw new Error("Only the job creator can cancel this job");
  }

  // Can only cancel if status is 'open' or 'assigned'
  if (jobData.status !== "open" && jobData.status !== "assigned") {
    throw new Error("Job can only be cancelled if status is open or assigned");
  }

  await updateDoc(jobRef, {
    status: "cancelled" as JobStatus,
    updatedAt: serverTimestamp(),
  });
>>>>>>> senderr_app
}

export async function claimJob(
  jobId: string,
  courierUid: string,
  agreedFee: number,
): Promise<void> {
<<<<<<< HEAD
  if (!courierUid) {
    throw new Error("Courier is required");
  }

  const claimCourierJobCallable = httpsCallable<
    { jobId: string; agreedFee: number },
    { success: boolean; status: JobStatus }
  >(functions, "claimCourierJob");

  const readiness = await getTokenClaimReadiness(courierUid);
  const useTokenMode = readiness.useTokenMode;

  if (!readiness.canClaim) {
    throw new Error(readiness.reason || "Unable to claim this job in token mode");
  }

  const reserveKey = `claim_${jobId}_${courierUid}`;
  const commitKey = `claim_commit_${jobId}_${courierUid}`;
  const releaseKey = `claim_release_${jobId}_${courierUid}`;

  try {
    if (useTokenMode) {
      await tokenReserve(
        "jobUnlockStandard",
        readiness.requiredTokens,
        reserveKey,
        { jobId, courierUid },
      );
    }

    await claimCourierJobCallable({ jobId, agreedFee });

    if (useTokenMode) {
      await tokenCommit(
        reserveKey,
        commitKey,
        { jobId, courierUid },
      );
    }
  } catch (error) {
    if (useTokenMode) {
      try {
        await tokenRelease(
          reserveKey,
          releaseKey,
          "claim_failed",
          { jobId, courierUid },
        );
      } catch (releaseError) {
        console.error("Failed to release reserved tokens after claim failure", releaseError);
      }
    }
    throw error;
  }
=======
  const jobRef = doc(db, "jobs", jobId);
  const courierRef = doc(db, "users", courierUid);

  await runTransaction(db, async (transaction) => {
    const jobDoc = await transaction.get(jobRef);
    const courierDoc = await transaction.get(courierRef);

    if (!jobDoc.exists()) {
      throw new Error("Job not found");
    }

    if (!courierDoc.exists()) {
      throw new Error("Courier not found");
    }

    const jobData = jobDoc.data();
    const courierData = courierDoc.data() as UserDoc;

    if (jobData.status !== "open" || jobData.courierUid !== null) {
      throw new Error("Job already claimed or not available");
    }

    // Server-side eligibility check - use courierProfile
    if (!courierData.courierProfile?.currentLocation) {
      throw new Error("Senderr location not available");
    }

    // Determine appropriate rate card based on job type
    const isFoodJob = jobData.isFoodItem || false;
    const rateCard = isFoodJob
      ? courierData.courierProfile.foodRateCard
      : courierData.courierProfile.packageRateCard;

    if (!rateCard) {
      throw new Error(
        `Senderr ${isFoodJob ? "food" : "package"} rate card not configured`,
      );
    }

    const courierLocation = courierData.courierProfile.currentLocation;
    const pickup = jobData.pickup as GeoPoint;
    const dropoff = jobData.dropoff as GeoPoint;

    const pickupMiles = calcMiles(courierLocation, pickup);
    const jobMiles = calcMiles(pickup, dropoff);

    const eligibilityResult = getEligibilityReason(
      rateCard,
      jobMiles,
      pickupMiles,
    );

    if (!eligibilityResult.eligible) {
      throw new Error(
        `not-eligible: ${eligibilityResult.reason || "Job exceeds distance limits"}`,
      );
    }

    // All checks passed - claim the job
    transaction.update(jobRef, {
      courierUid,
      agreedFee,
      status: "assigned" as JobStatus,
      updatedAt: serverTimestamp(),
    });
  });
>>>>>>> senderr_app
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  actorUid?: string,
): Promise<void> {
<<<<<<< HEAD
  if (actorUid === "") {
    throw new Error("Invalid actor");
  }

  const advanceCourierJobStatusCallable = httpsCallable<
    { jobId: string; nextStatus: JobStatus },
    { success: boolean; status: JobStatus }
  >(functions, "advanceCourierJobStatus");

  await advanceCourierJobStatusCallable({ jobId, nextStatus });
}

export async function submitCourierJobProof(
  jobId: string,
  payload: JobProofPayload,
): Promise<void> {
  const submitCourierJobProofCallable = httpsCallable<
    {
      jobId: string;
      type: "pickup" | "dropoff";
      photoUrl: string;
      coordinates: {
        latitude: number;
        longitude: number;
        accuracy: number;
      };
    },
    { success: boolean }
  >(functions, "submitCourierJobProof");

  await submitCourierJobProofCallable({ jobId, ...payload });
}

export async function submitLegacyDeliveryProof(
  jobId: string,
  photoUrl: string,
  notes?: string,
): Promise<void> {
  const submitLegacyDeliveryProofCallable = httpsCallable<
    { jobId: string; photoUrl: string; notes?: string },
    { success: boolean; status: string }
  >(functions, "submitLegacyDeliveryProof");

  await submitLegacyDeliveryProofCallable({ jobId, photoUrl, notes });
}

export async function declineCourierJobOffer(jobId: string): Promise<void> {
  const declineCourierJobOfferCallable = httpsCallable<
    { jobId: string },
    { success: boolean }
  >(functions, "declineCourierJobOffer");

  await declineCourierJobOfferCallable({ jobId });
}

export async function reassignCourierJobAdmin(
  jobId: string,
  courierUid: string,
): Promise<void> {
  const reassignCourierJobAdminCallable = httpsCallable<
    { jobId: string; courierUid: string },
    { success: boolean; status: JobStatus }
  >(functions, "reassignCourierJobAdmin");

  await reassignCourierJobAdminCallable({ jobId, courierUid });
}

export async function cancelCourierJobAdmin(jobId: string): Promise<void> {
  const cancelCourierJobAdminCallable = httpsCallable<
    { jobId: string },
    { success: boolean; status: JobStatus }
  >(functions, "cancelCourierJobAdmin");

  await cancelCourierJobAdminCallable({ jobId });
}

export async function updateLegacyCourierJobStatus(
  jobId: string,
  status: "in_progress" | "completed",
): Promise<void> {
  const updateLegacyCourierJobStatusCallable = httpsCallable<
    { jobId: string; status: "in_progress" | "completed" },
    { success: boolean; status: "in_progress" | "completed" }
  >(functions, "updateLegacyCourierJobStatus");

  await updateLegacyCourierJobStatusCallable({ jobId, status });
}

export async function rejectRunnerJob(
  jobId: string,
  reasonLabel: string,
  notes?: string,
): Promise<void> {
  const rejectRunnerJobCallable = httpsCallable<
    { jobId: string; reasonLabel: string; notes?: string },
    { success: boolean; status: JobStatus }
  >(functions, "rejectRunnerJob");

  await rejectRunnerJobCallable({ jobId, reasonLabel, notes });
}

export async function submitCourierJobDispute(
  jobId: string,
  reason: string,
  description: string,
): Promise<void> {
  const submitCourierJobDisputeCallable = httpsCallable<
    { jobId: string; reason: string; description: string },
    { success: boolean; status: JobStatus }
  >(functions, "submitCourierJobDispute");

  await submitCourierJobDisputeCallable({ jobId, reason, description });
}

export async function getTokenPolicy(): Promise<TokenPolicy> {
  const callable = httpsCallable<undefined, TokenPolicy>(functions, "getTokenPolicy");
  const result = await callable();
  return result.data;
}

export async function getTokenWalletSummary(): Promise<TokenWalletSummary> {
  const callable = httpsCallable<undefined, TokenWalletSummary>(functions, "getTokenWalletSummary");
  const result = await callable();
  return result.data;
}

export async function tokenReserve(
  action: string,
  amount: number,
  idempotencyKey: string,
  metadata?: Record<string, unknown>,
): Promise<{ reservationId: string; wallet: TokenWalletSummary }> {
  const callable = httpsCallable<
    { action: string; amount: number; idempotencyKey: string; metadata?: Record<string, unknown> },
    { reservationId: string; wallet: TokenWalletSummary }
  >(functions, "tokenReserve");
  const result = await callable({ action, amount, idempotencyKey, metadata });
  return result.data;
}

export async function tokenCommit(
  reservationId: string,
  idempotencyKey: string,
  metadata?: Record<string, unknown>,
): Promise<{ reservationId: string; wallet: TokenWalletSummary | null }> {
  const callable = httpsCallable<
    { reservationId: string; idempotencyKey: string; metadata?: Record<string, unknown> },
    { reservationId: string; wallet: TokenWalletSummary | null }
  >(functions, "tokenCommit");
  const result = await callable({ reservationId, idempotencyKey, metadata });
  return result.data;
}

export async function tokenRelease(
  reservationId: string,
  idempotencyKey: string,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<{ reservationId: string; wallet: TokenWalletSummary | null }> {
  const callable = httpsCallable<
    {
      reservationId: string;
      idempotencyKey: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
    { reservationId: string; wallet: TokenWalletSummary | null }
  >(functions, "tokenRelease");
  const result = await callable({ reservationId, idempotencyKey, reason, metadata });
  return result.data;
}

export async function tokenRefund(
  reservationId: string,
  idempotencyKey: string,
  amount?: number,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<{ reservationId: string; wallet: TokenWalletSummary | null }> {
  const callable = httpsCallable<
    {
      reservationId: string;
      idempotencyKey: string;
      amount?: number;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
    { reservationId: string; wallet: TokenWalletSummary | null }
  >(functions, "tokenRefund");
  const result = await callable({ reservationId, idempotencyKey, amount, reason, metadata });
  return result.data;
}

export async function tokenCreateCheckoutSession(
  packId: string,
  successUrl: string,
  cancelUrl: string,
  idempotencyKey: string,
): Promise<{ sessionId: string; url: string | null }> {
  const callable = httpsCallable<
    { packId: string; successUrl: string; cancelUrl: string; idempotencyKey: string },
    { sessionId: string; url: string | null }
  >(functions, "tokenCreateCheckoutSession");
  const result = await callable({ packId, successUrl, cancelUrl, idempotencyKey });
  return result.data;
=======
  const jobRef = doc(db, "jobs", jobId);

  await runTransaction(db, async (transaction) => {
    const jobDoc = await transaction.get(jobRef);

    if (!jobDoc.exists()) {
      throw new Error("Job not found");
    }

    const jobData = jobDoc.data() as Job;

    // Server-side guard: Only assigned courier can update status
    if (actorUid && jobData.courierUid !== actorUid) {
      throw new Error("Only the assigned courier can update job status");
    }

    // Validate status progression
    const expectedNextStatus = getNextStatus(jobData.status);
    if (!expectedNextStatus) {
      throw new Error(`Cannot advance from status: ${jobData.status}`);
    }

    if (nextStatus !== expectedNextStatus) {
      throw new Error(
        `Invalid status transition. Expected: ${expectedNextStatus}, Received: ${nextStatus}`,
      );
    }

    // All checks passed - update status
    transaction.update(jobRef, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  });
>>>>>>> senderr_app
}

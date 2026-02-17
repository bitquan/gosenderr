import {
  collection,
  addDoc,
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

interface CreateJobPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package: PackageInfo;
  photos: JobPhoto[];
}

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
  if (!userUid) {
    throw new Error("User is required");
  }

  const cancelCourierJobCallable = httpsCallable<
    { jobId: string },
    { success: boolean; status: JobStatus }
  >(functions, "cancelCourierJob");

  await cancelCourierJobCallable({ jobId });
}

export async function claimJob(
  jobId: string,
  courierUid: string,
  agreedFee: number,
): Promise<void> {
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
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  actorUid?: string,
): Promise<void> {
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
}

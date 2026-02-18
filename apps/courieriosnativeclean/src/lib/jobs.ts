import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { app, db, storage } from './firebase';
import type { Job, JobStatus } from '../types/job';

type LifecycleCommandResult = {
  queued: boolean;
};

type ClaimCourierJobCallableRequest = {
  jobId: string;
  agreedFee: number;
  idempotencyKey: string;
  reservationId?: string;
};

type TokenPolicyResponse = {
  enabled?: boolean;
  costs?: Record<string, number>;
  packs?: Array<{
    id: string;
    tokens: number;
    priceUsd: number;
    stripePriceId?: string;
    name?: string;
    active?: boolean;
  }>;
};

type TokenWalletSummaryResponse = {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased?: number;
  lifetimeSpent?: number;
  lifetimeAdjusted?: number;
};

type TokenReserveCallableRequest = {
  action: string;
  amount: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  walletType?: 'utility';
};

type TokenReserveCallableResponse = {
  reservationId: string;
  wallet?: TokenWalletSummaryResponse;
};

type TokenReleaseCallableRequest = {
  reservationId: string;
  idempotencyKey: string;
  reason: string;
  walletType?: 'utility';
};

type TokenReleaseCallableResponse = {
  reservationId: string;
  wallet?: TokenWalletSummaryResponse;
};

type TokenCheckoutSessionResponse = {
  sessionId: string;
  url: string;
};

type TokenFinalizeCheckoutSessionRequest = {
  idempotencyKey?: string;
  sessionId?: string;
};

type TokenFinalizeCheckoutSessionResponse = {
  finalized?: boolean;
  credited?: boolean;
  paymentStatus?: string;
  sessionId?: string;
  wallet?: TokenWalletSummaryResponse;
};

type TokenClaimReadiness = {
  useTokenMode: boolean;
  canClaim: boolean;
  requiredTokens: number;
  availableTokens: number;
  reason?: string;
};

type AdvanceCourierJobStatusCallableRequest = {
  jobId: string;
  nextStatus: JobStatus;
  idempotencyKey: string;
};

type SubmitCourierJobProofCallableRequest = {
  jobId: string;
  type: 'pickup' | 'dropoff';
  photoUrl: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
};

let idempotencyCounter = 0;

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function createIdempotencyKey(command: 'claim' | 'advance', jobId: string): string {
  idempotencyCounter += 1;
  const safeJobId = sanitizeIdPart(jobId);
  return `${command}_${safeJobId}_${Date.now()}_${idempotencyCounter}`;
}

function getFunctionsInstance() {
  return app ? getFunctions(app) : getFunctions();
}

async function callClaimCourierJob(payload: ClaimCourierJobCallableRequest): Promise<void> {
  const callable = httpsCallable<ClaimCourierJobCallableRequest, { success: boolean }>(
    getFunctionsInstance(),
    'claimCourierJob',
  );
  await callable(payload);
}

async function callTokenReserve(payload: TokenReserveCallableRequest): Promise<TokenReserveCallableResponse> {
  const callable = httpsCallable<TokenReserveCallableRequest, TokenReserveCallableResponse>(
    getFunctionsInstance(),
    'tokenReserve',
  );
  const result = await callable(payload);
  return result.data;
}

async function callTokenRelease(payload: TokenReleaseCallableRequest): Promise<TokenReleaseCallableResponse> {
  const callable = httpsCallable<TokenReleaseCallableRequest, TokenReleaseCallableResponse>(
    getFunctionsInstance(),
    'tokenRelease',
  );
  const result = await callable(payload);
  return result.data;
}

async function callAdvanceCourierJobStatus(payload: AdvanceCourierJobStatusCallableRequest): Promise<void> {
  const callable = httpsCallable<AdvanceCourierJobStatusCallableRequest, { success: boolean }>(
    getFunctionsInstance(),
    'advanceCourierJobStatus',
  );
  await callable(payload);
}

async function callSubmitCourierJobProof(payload: SubmitCourierJobProofCallableRequest): Promise<void> {
  const callable = httpsCallable<SubmitCourierJobProofCallableRequest, { success: boolean }>(
    getFunctionsInstance(),
    'submitCourierJobProof',
  );
  await callable(payload);
}

export async function claimJob(job: Job, _courierUid: string, agreedFee?: number): Promise<LifecycleCommandResult> {
  const resolvedFee = Number(agreedFee ?? job.agreedFee ?? 0);
  if (!Number.isFinite(resolvedFee) || resolvedFee <= 0) {
    throw new Error('Cannot claim job: agreed fee is missing.');
  }

  const tokenPolicy = await getTokenPolicy();
  const requiredTokens = getRequiredTokensForJob(job, tokenPolicy);

  let reservationId: string | undefined;
  if (requiredTokens > 0 && tokenPolicy.enabled !== false) {
    const reserveResult = await reserveJobClaimTokens(job.id, requiredTokens);
    reservationId = reserveResult.reservationId;
  }

  try {
    await callClaimCourierJob({
      jobId: job.id,
      agreedFee: resolvedFee,
      idempotencyKey: createIdempotencyKey('claim', job.id),
      reservationId,
    });
  } catch (error) {
    if (reservationId) {
      try {
        await releaseJobClaimTokens(reservationId, 'claim_failed');
      } catch {
        // Best effort rollback; original claim error should surface.
      }
    }
    throw error;
  }

  return { queued: false };
}

export async function updateJobStatus(jobId: string, nextStatus: JobStatus): Promise<LifecycleCommandResult> {
  await callAdvanceCourierJobStatus({
    jobId,
    nextStatus,
    idempotencyKey: createIdempotencyKey('advance', jobId),
  });

  return { queued: false };
}

async function createProofPhoto(params: {
  jobId: string;
  photoDataUrl: string;
}) {
  const { jobId, photoDataUrl } = params;
  const photoId = `${Date.now()}_${sanitizeIdPart(jobId)}`;
  let photoUrl: string | null = null;
  let photoDataUrlStored: string | null = null;

  if (storage) {
    try {
      const storageRef = ref(storage, `job-photos/${jobId}/${photoId}.jpg`);
      await uploadString(storageRef, photoDataUrl, 'data_url');
      photoUrl = await getDownloadURL(storageRef);
    } catch (error) {
      console.warn('Storage upload failed, falling back to inline photo payload:', error);
      photoDataUrlStored = photoDataUrl;
    }
  } else {
    photoDataUrlStored = photoDataUrl;
  }

  return { photoUrl: photoUrl ?? photoDataUrlStored };
}

export async function completeDeliveryWithProof(params: {
  jobId: string;
  courierUid: string;
  photoDataUrl: string;
  notes?: string;
  location?: { lat: number; lng: number; accuracy?: number | null } | null;
}) {
  const { jobId, courierUid, photoDataUrl, location } = params;
  if (!photoDataUrl) {
    throw new Error('Delivery photo is required');
  }

  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = jobSnap.data() as Job;
  if (job.courierUid && job.courierUid !== courierUid) {
    throw new Error('Job is assigned to another courier');
  }

  const fallbackLocation =
    job.dropoff?.lat && job.dropoff?.lng
      ? { lat: job.dropoff.lat, lng: job.dropoff.lng }
      : null;
  const proofLocation = location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : fallbackLocation;
  const proofAccuracy = typeof location?.accuracy === 'number' ? location?.accuracy : null;
  if (!proofLocation) {
    throw new Error('Dropoff location is missing for proof submission');
  }

  const uploaded = await createProofPhoto({
    jobId,
    photoDataUrl,
  });

  if (!uploaded.photoUrl) {
    throw new Error('Failed to upload proof photo');
  }

  await callSubmitCourierJobProof({
    jobId,
    type: 'dropoff',
    photoUrl: uploaded.photoUrl,
    coordinates: {
      latitude: proofLocation.lat,
      longitude: proofLocation.lng,
      accuracy: proofAccuracy ?? 0,
    },
  });

  await updateJobStatus(jobId, 'completed');
}

export async function completePickupWithProof(params: {
  jobId: string;
  courierUid: string;
  photoDataUrl: string;
  notes?: string;
  location?: { lat: number; lng: number; accuracy?: number | null } | null;
}) {
  const { jobId, courierUid, photoDataUrl, location } = params;
  if (!photoDataUrl) {
    throw new Error('Pickup photo is required');
  }

  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = jobSnap.data() as Job;
  if (job.courierUid && job.courierUid !== courierUid) {
    throw new Error('Job is assigned to another courier');
  }

  const fallbackLocation =
    job.pickup?.lat && job.pickup?.lng
      ? { lat: job.pickup.lat, lng: job.pickup.lng }
      : null;
  const proofLocation = location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : fallbackLocation;
  const proofAccuracy = typeof location?.accuracy === 'number' ? location?.accuracy : null;
  if (!proofLocation) {
    throw new Error('Pickup location is missing for proof submission');
  }

  const uploaded = await createProofPhoto({
    jobId,
    photoDataUrl,
  });

  if (!uploaded.photoUrl) {
    throw new Error('Failed to upload proof photo');
  }

  await callSubmitCourierJobProof({
    jobId,
    type: 'pickup',
    photoUrl: uploaded.photoUrl,
    coordinates: {
      latitude: proofLocation.lat,
      longitude: proofLocation.lng,
      accuracy: proofAccuracy ?? 0,
    },
  });

  await updateJobStatus(jobId, 'picked_up');
}

export async function getTokenPolicy(): Promise<TokenPolicyResponse> {
  const callable = httpsCallable<unknown, TokenPolicyResponse>(
    getFunctionsInstance(),
    'getTokenPolicy',
  );
  const result = await callable({});
  return result.data;
}

export async function getTokenWalletSummary(): Promise<TokenWalletSummaryResponse> {
  const callable = httpsCallable<{ walletType: 'utility' }, TokenWalletSummaryResponse>(
    getFunctionsInstance(),
    'getTokenWalletSummary',
  );
  const result = await callable({ walletType: 'utility' });
  return result.data;
}

export async function tokenCreateCheckoutSession(
  packId: string,
  successUrl: string,
  cancelUrl: string,
  idempotencyKey: string,
): Promise<TokenCheckoutSessionResponse> {
  const callable = httpsCallable<
    { packId: string; successUrl: string; cancelUrl: string; idempotencyKey: string },
    TokenCheckoutSessionResponse
  >(getFunctionsInstance(), 'tokenCreateCheckoutSession');

  const result = await callable({
    packId,
    successUrl,
    cancelUrl,
    idempotencyKey,
  });

  return result.data;
}

export async function tokenFinalizeCheckoutSession(
  request: TokenFinalizeCheckoutSessionRequest,
): Promise<TokenFinalizeCheckoutSessionResponse> {
  const callable = httpsCallable<TokenFinalizeCheckoutSessionRequest, TokenFinalizeCheckoutSessionResponse>(
    getFunctionsInstance(),
    'tokenFinalizeCheckoutSession',
  );

  const result = await callable(request);
  return result.data;
}

export function getRequiredTokensForJob(job: Job, policy: TokenPolicyResponse): number {
  const costs = policy?.costs || {};
  const size = String(job?.package?.size || '').trim().toLowerCase();
  const flags = (job as any)?.package?.flags || {};

  const isHeavy =
    size === 'xl' ||
    flags.needsSuvVan === true ||
    flags.heavyTwoPerson === true ||
    flags.oversized === true;

  const toNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  if (isHeavy) {
    return Math.max(toNumber(costs.jobUnlockHeavy ?? costs.jobUnlockPriority ?? costs.jobUnlockStandard ?? costs.claimJob ?? 0), 0);
  }

  if (size === 'large') {
    return Math.max(toNumber(costs.jobUnlockPriority ?? costs.jobUnlockStandard ?? costs.claimJob ?? 0), 0);
  }

  return Math.max(toNumber(costs.jobUnlockStandard ?? costs.claimJob ?? 0), 0);
}

export async function getTokenClaimReadiness(_uid: string, job: Job): Promise<TokenClaimReadiness> {
  const [policy, wallet] = await Promise.all([
    getTokenPolicy(),
    getTokenWalletSummary(),
  ]);

  const requiredTokens = getRequiredTokensForJob(job, policy);
  const availableTokens = Math.max(wallet?.available ?? 0, 0);
  const useTokenMode = Boolean(policy?.enabled) && requiredTokens > 0;
  const canClaim = !useTokenMode || availableTokens >= requiredTokens;

  return {
    useTokenMode,
    canClaim,
    requiredTokens,
    availableTokens,
    reason: canClaim
      ? undefined
      : `Insufficient tokens. Requires ${requiredTokens}, available ${availableTokens}.`,
  };
}

export async function reserveJobClaimTokens(
  jobId: string,
  amount: number,
): Promise<TokenReserveCallableResponse> {
  const idempotencyKey = `claim_preview_${sanitizeIdPart(jobId)}_${Date.now()}_${idempotencyCounter + 1}`;
  return callTokenReserve({
    action: 'jobUnlockPreview',
    amount,
    idempotencyKey,
    metadata: { jobId },
    walletType: 'utility',
  });
}

export async function releaseJobClaimTokens(
  reservationId: string,
  reason: string,
): Promise<TokenReleaseCallableResponse> {
  const idempotencyKey = `claim_preview_release_${sanitizeIdPart(reservationId)}_${Date.now()}_${idempotencyCounter + 1}`;
  return callTokenRelease({
    reservationId,
    idempotencyKey,
    reason,
    walletType: 'utility',
  });
}

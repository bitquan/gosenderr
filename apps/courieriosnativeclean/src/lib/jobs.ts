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

  await callClaimCourierJob({
    jobId: job.id,
    agreedFee: resolvedFee,
    idempotencyKey: createIdempotencyKey('claim', job.id),
  });

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

import { collection, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Job, JobStatus } from '../types/job';

export async function claimJob(job: Job, courierUid: string, agreedFee?: number) {
  const jobRef = doc(db, 'jobs', job.id);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    if (!snapshot.exists()) {
      throw new Error('Job does not exist');
    }

    const data = snapshot.data() as Job;
    const effectiveStatus = data.statusDetail ?? data.status;
    if (!(effectiveStatus === 'open' || effectiveStatus === 'pending') || data.courierUid) {
      throw new Error('Job is no longer available');
    }

    transaction.update(jobRef, {
      courierUid,
      courierId: courierUid,
      agreedFee: agreedFee ?? data.agreedFee ?? null,
      status: 'assigned',
      statusDetail: 'assigned',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateJobStatus(jobId: string, statusDetail: JobStatus) {
  const jobRef = doc(db, 'jobs', jobId);
  const status =
    statusDetail === 'completed'
      ? 'completed'
      : statusDetail === 'cancelled'
      ? 'cancelled'
      : statusDetail === 'assigned'
      ? 'assigned'
      : 'in_progress';

  await updateDoc(jobRef, {
    status,
    statusDetail,
    updatedAt: serverTimestamp(),
    ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
  });
}

async function createProofPhoto(params: {
  jobId: string;
  courierUid: string;
  photoDataUrl: string;
  notes?: string;
  type: 'pickup' | 'dropoff';
  location?: { lat: number; lng: number } | null;
  accuracy?: number | null;
}) {
  const { jobId, courierUid, photoDataUrl, notes, type, location, accuracy } = params;
  const photoId = doc(collection(db, 'jobPhotos')).id;
  let photoUrl: string | null = null;
  let photoDataUrlStored: string | null = null;

  if (storage) {
    try {
      const storageRef = ref(storage, `job-photos/${jobId}/${photoId}.jpg`);
      await uploadString(storageRef, photoDataUrl, 'data_url');
      photoUrl = await getDownloadURL(storageRef);
    } catch (error) {
      console.warn('Storage upload failed, falling back to Firestore:', error);
      photoDataUrlStored = photoDataUrl;
    }
  } else {
    photoDataUrlStored = photoDataUrl;
  }

  const photoRef = doc(db, 'jobPhotos', photoId);
  await setDoc(photoRef, {
    jobId,
    courierUid,
    photoUrl: photoUrl ?? null,
    photoDataUrl: photoDataUrlStored ?? null,
    url: photoUrl ?? photoDataUrlStored ?? null,
    location: location ?? null,
    accuracy: accuracy ?? null,
    notes: notes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    type,
  });

  return { photoId, photoUrl, photoDataUrl: photoDataUrlStored };
}

export async function completeDeliveryWithProof(params: {
  jobId: string;
  courierUid: string;
  photoDataUrl: string;
  notes?: string;
  location?: { lat: number; lng: number; accuracy?: number | null } | null;
}) {
  const { jobId, courierUid, photoDataUrl, notes, location } = params;
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

  const { photoId, photoUrl, photoDataUrl: photoDataUrlStored } = await createProofPhoto({
    jobId,
    courierUid,
    photoDataUrl,
    notes,
    type: 'dropoff',
    location: proofLocation,
    accuracy: proofAccuracy,
  });

  const proofPayload = {
    photoId,
    photoUrl: photoUrl ?? null,
    photoDataUrl: photoDataUrlStored ?? null,
    url: photoUrl ?? photoDataUrlStored ?? null,
    location: proofLocation ?? null,
    accuracy: proofAccuracy,
    notes: notes ?? null,
    createdAt: serverTimestamp(),
    timestamp: serverTimestamp(),
  };

  await updateDoc(jobRef, {
    status: 'completed',
    statusDetail: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deliveryProof: proofPayload,
    dropoffProof: proofPayload,
  });
}

export async function completePickupWithProof(params: {
  jobId: string;
  courierUid: string;
  photoDataUrl: string;
  notes?: string;
  location?: { lat: number; lng: number; accuracy?: number | null } | null;
}) {
  const { jobId, courierUid, photoDataUrl, notes, location } = params;
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

  const { photoId, photoUrl, photoDataUrl: photoDataUrlStored } = await createProofPhoto({
    jobId,
    courierUid,
    photoDataUrl,
    notes,
    type: 'pickup',
    location: proofLocation,
    accuracy: proofAccuracy,
  });

  const proofPayload = {
    photoId,
    photoUrl: photoUrl ?? null,
    photoDataUrl: photoDataUrlStored ?? null,
    url: photoUrl ?? photoDataUrlStored ?? null,
    location: proofLocation ?? null,
    accuracy: proofAccuracy,
    notes: notes ?? null,
    createdAt: serverTimestamp(),
    timestamp: serverTimestamp(),
  };

  await updateDoc(jobRef, {
    status: 'in_progress',
    statusDetail: 'picked_up',
    updatedAt: serverTimestamp(),
    pickupProof: proofPayload,
  });
}

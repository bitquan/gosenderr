import {
  collection,
  addDoc,
  runTransaction,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { GeoPoint, JobStatus } from './types';

interface CreateJobPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
}

export async function createJob(
  userUid: string,
  payload: CreateJobPayload
): Promise<string> {
  const jobsRef = collection(db, 'jobs');
  const docRef = await addDoc(jobsRef, {
    createdByUid: userUid,
    status: 'open' as JobStatus,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    courierUid: null,
    agreedFee: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function claimJob(
  jobId: string,
  courierUid: string,
  agreedFee: number
): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);

  await runTransaction(db, async (transaction) => {
    const jobDoc = await transaction.get(jobRef);

    if (!jobDoc.exists()) {
      throw new Error('Job not found');
    }

    const jobData = jobDoc.data();

    if (jobData.status !== 'open' || jobData.courierUid !== null) {
      throw new Error('Job already claimed or not available');
    }

    transaction.update(jobRef, {
      courierUid,
      agreedFee,
      status: 'assigned' as JobStatus,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus
): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });
}

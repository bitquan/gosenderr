import { doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
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

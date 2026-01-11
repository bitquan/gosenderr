import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { app } from './client';
import { 
  UserDoc, 
  UserRole, 
  JobDoc, 
  JobStatus, 
  TransportMode, 
  RateCard,
  CourierData 
} from '@gosenderr/shared';

export const db = getFirestore(app);

/**
 * User operations
 */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserDoc) : null;
}

export async function setUserRole(
  uid: string,
  role: UserRole,
  phone?: string,
  displayName?: string
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  const existing = await getDoc(docRef);

  if (existing.exists()) {
    await setDoc(
      docRef,
      {
        role,
        ...(phone && { phone }),
        ...(displayName && { displayName }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await setDoc(docRef, {
      role,
      ...(phone && { phone }),
      ...(displayName && { displayName }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateCourierSettings(
  uid: string,
  courier: CourierData
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    courier,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCourierLocation(
  uid: string,
  lat: number,
  lng: number,
  heading?: number
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    location: {
      lat,
      lng,
      heading,
      updatedAt: serverTimestamp(),
    },
  });
}

/**
 * Job operations
 */
export async function createJob(
  createdByUid: string,
  pickup: { lat: number; lng: number; label?: string },
  dropoff: { lat: number; lng: number; label?: string }
): Promise<string> {
  const jobsRef = collection(db, 'jobs');
  const docRef = await addDoc(jobsRef, {
    createdByUid,
    courierUid: null,
    agreedFee: null,
    status: JobStatus.OPEN,
    pickup,
    dropoff,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getJobsByUser(uid: string): Promise<Array<JobDoc & { id: string }>> {
  const jobsRef = collection(db, 'jobs');
  const q = query(jobsRef, where('createdByUid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as JobDoc),
  }));
}

export async function getOpenJobs(): Promise<Array<JobDoc & { id: string }>> {
  const jobsRef = collection(db, 'jobs');
  const q = query(jobsRef, where('status', '==', JobStatus.OPEN));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as JobDoc),
  }));
}

export async function getJob(jobId: string): Promise<(JobDoc & { id: string }) | null> {
  const docRef = doc(db, 'jobs', jobId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists()
    ? { id: docSnap.id, ...(docSnap.data() as JobDoc) }
    : null;
}

export function subscribeToJob(
  jobId: string,
  callback: (job: (JobDoc & { id: string }) | null) => void
): () => void {
  const docRef = doc(db, 'jobs', jobId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...(snapshot.data() as JobDoc) });
    } else {
      callback(null);
    }
  });
}

export function subscribeToOpenJobs(
  callback: (jobs: Array<JobDoc & { id: string }>) => void
): () => void {
  const jobsRef = collection(db, 'jobs');
  const q = query(jobsRef, where('status', '==', JobStatus.OPEN));
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as JobDoc),
    }));
    callback(jobs);
  });
}

export async function claimJob(
  jobId: string,
  courierUid: string,
  agreedFee: number,
  courierSnapshot?: { displayName?: string; transportMode?: TransportMode }
): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  
  await runTransaction(db, async (transaction) => {
    const jobDoc = await transaction.get(jobRef);
    
    if (!jobDoc.exists()) {
      throw new Error('Job does not exist');
    }
    
    const jobData = jobDoc.data() as JobDoc;
    
    if (jobData.status !== JobStatus.OPEN || jobData.courierUid !== null) {
      throw new Error('Job is no longer available');
    }
    
    transaction.update(jobRef, {
      courierUid,
      agreedFee,
      status: JobStatus.ASSIGNED,
      ...(courierSnapshot && { courierSnapshot }),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus
): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  await updateDoc(jobRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  await updateJobStatus(jobId, JobStatus.CANCELLED);
}
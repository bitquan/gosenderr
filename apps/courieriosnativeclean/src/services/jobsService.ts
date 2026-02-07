import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import {getFirebaseServices, isFirebaseReady} from './firebase';
import type {AuthSession} from '../types/auth';
import type {Job, JobStatus} from '../types/jobs';

const STORAGE_KEY = '@senderr/jobs';

const seedJobs: Job[] = [
  {
    id: 'job_1001',
    customerName: 'Ava Thompson',
    pickupAddress: '42 Market St, San Francisco, CA',
    dropoffAddress: '220 Pine St, San Francisco, CA',
    notes: 'Fragile package. Ring doorbell at delivery.',
    etaMinutes: 18,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'job_1002',
    customerName: 'Noah Rivera',
    pickupAddress: '500 Howard St, San Francisco, CA',
    dropoffAddress: '160 Spear St, San Francisco, CA',
    notes: 'Customer prefers contactless drop-off.',
    etaMinutes: 25,
    status: 'accepted',
    updatedAt: new Date().toISOString(),
  },
];

const normalizeStatus = (status: string): JobStatus => {
  if (status === 'accepted' || status === 'picked_up' || status === 'delivered' || status === 'cancelled') {
    return status;
  }
  return 'pending';
};

const mapFirestoreJob = (id: string, data: Record<string, unknown>): Job => {
  const pickup = data.pickup as {label?: string} | undefined;
  const dropoff = data.dropoff as {label?: string} | undefined;

  return {
    id,
    customerName: String(data.customerName ?? 'Customer'),
    pickupAddress: pickup?.label ?? String(data.pickupAddress ?? 'Pickup address unavailable'),
    dropoffAddress: dropoff?.label ?? String(data.dropoffAddress ?? 'Dropoff address unavailable'),
    notes: data.notes ? String(data.notes) : undefined,
    etaMinutes: Number(data.etaMinutes ?? 20),
    status: normalizeStatus(String(data.status ?? 'pending')),
    updatedAt: new Date().toISOString(),
  };
};

const persistJobs = async (jobs: Job[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
};

const loadLocalJobs = async (): Promise<Job[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    await persistJobs(seedJobs);
    return seedJobs;
  }

  try {
    const parsed = JSON.parse(raw) as Job[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // no-op, falls through to seed reset
  }

  await persistJobs(seedJobs);
  return seedJobs;
};

export const fetchJobs = async (session: AuthSession): Promise<Job[]> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      const jobsRef = collection(services.db, 'jobs');
      const jobsQuery = query(
        jobsRef,
        where('courierUid', '==', session.uid),
        orderBy('updatedAt', 'desc'),
      );
      const snap = await getDocs(jobsQuery);
      if (!snap.empty) {
        return snap.docs.map(d => mapFirestoreJob(d.id, d.data() as Record<string, unknown>));
      }
    }
  }

  return loadLocalJobs();
};

export const getJobById = async (session: AuthSession, id: string): Promise<Job | null> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      const ref = doc(services.db, 'jobs', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return mapFirestoreJob(snap.id, snap.data() as Record<string, unknown>);
      }
    }
  }

  const local = await loadLocalJobs();
  return local.find(job => job.id === id) ?? null;
};

export const updateJobStatus = async (
  session: AuthSession,
  id: string,
  nextStatus: JobStatus,
): Promise<Job> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      const ref = doc(services.db, 'jobs', id);
      await updateDoc(ref, {
        status: nextStatus,
        courierUid: session.uid,
        updatedAt: serverTimestamp(),
      });

      const updated = await getDoc(ref);
      if (updated.exists()) {
        return mapFirestoreJob(updated.id, updated.data() as Record<string, unknown>);
      }
    }
  }

  const local = await loadLocalJobs();
  const index = local.findIndex(job => job.id === id);
  if (index === -1) {
    throw new Error('Job not found.');
  }

  const updated: Job = {
    ...local[index],
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  local[index] = updated;
  await persistJobs(local);
  return updated;
};

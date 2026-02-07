import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

import {getFirebaseServices, isFirebaseReady} from './firebase';
import {runtimeConfig} from '../config/runtime';
import type {JobsSubscription, JobsSubscriptionHandlers, JobsSyncState} from './ports/jobsPort';
import type {AuthSession} from '../types/auth';
import type {Job, JobStatus} from '../types/jobs';

const STORAGE_KEY = '@senderr/jobs';
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

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
  const updatedAt = data.updatedAt as {toDate?: () => Date} | string | Date | undefined;

  let normalizedUpdatedAt = new Date().toISOString();
  if (typeof updatedAt === 'string') {
    normalizedUpdatedAt = updatedAt;
  } else if (updatedAt instanceof Date) {
    normalizedUpdatedAt = updatedAt.toISOString();
  } else if (updatedAt?.toDate) {
    normalizedUpdatedAt = updatedAt.toDate().toISOString();
  }

  return {
    id,
    customerName: String(data.customerName ?? 'Customer'),
    pickupAddress: pickup?.label ?? String(data.pickupAddress ?? 'Pickup address unavailable'),
    dropoffAddress: dropoff?.label ?? String(data.dropoffAddress ?? 'Dropoff address unavailable'),
    notes: data.notes ? String(data.notes) : undefined,
    etaMinutes: Number(data.etaMinutes ?? 20),
    status: normalizeStatus(String(data.status ?? 'pending')),
    updatedAt: normalizedUpdatedAt,
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

const logFirebaseFallback = (operation: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[jobsService] ${operation} failed in Firebase mode; falling back to local mock data.`, message);
};

const shouldUseLocalFallback = (): boolean => runtimeConfig.envName !== 'prod';

const buildQueryForSession = (db: Firestore, session: AuthSession) => {
  const jobsRef = collection(db, 'jobs');
  return query(
    jobsRef,
    where('courierUid', '==', session.uid),
    orderBy('updatedAt', 'desc'),
  );
};

const buildFirebaseError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`[jobsService] ${operation} failed in Firebase mode: ${message}`);
};

const localFallbackOrThrow = async (operation: string, error: unknown): Promise<Job[]> => {
  if (shouldUseLocalFallback()) {
    logFirebaseFallback(operation, error);
    return loadLocalJobs();
  }
  throw buildFirebaseError(operation, error);
};

export const fetchJobs = async (session: AuthSession): Promise<Job[]> => {
  if (!isFirebaseReady()) {
    if (shouldUseLocalFallback()) {
      return loadLocalJobs();
    }
    throw new Error('Firebase is required in production and is not configured.');
  }

  const services = getFirebaseServices();
  if (!services) {
    if (shouldUseLocalFallback()) {
      return loadLocalJobs();
    }
    throw new Error('Firebase services are unavailable in production mode.');
  }

  try {
    const snap = await getDocs(buildQueryForSession(services.db, session));
    if (!snap.empty) {
      return snap.docs.map(d => mapFirestoreJob(d.id, d.data() as Record<string, unknown>));
    }
    return [];
  } catch (error) {
    return localFallbackOrThrow('fetchJobs', error);
  }
};

export const getJobById = async (session: AuthSession, id: string): Promise<Job | null> => {
  if (!isFirebaseReady()) {
    if (shouldUseLocalFallback()) {
      const local = await loadLocalJobs();
      return local.find(job => job.id === id) ?? null;
    }
    throw new Error('Firebase is required in production and is not configured.');
  }

  const services = getFirebaseServices();
  if (!services) {
    if (shouldUseLocalFallback()) {
      const local = await loadLocalJobs();
      return local.find(job => job.id === id) ?? null;
    }
    throw new Error('Firebase services are unavailable in production mode.');
  }

  try {
    const ref = doc(services.db, 'jobs', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return mapFirestoreJob(snap.id, snap.data() as Record<string, unknown>);
    }
    return null;
  } catch (error) {
    if (shouldUseLocalFallback()) {
      logFirebaseFallback('getJobById', error);
      const local = await loadLocalJobs();
      return local.find(job => job.id === id) ?? null;
    }
    throw buildFirebaseError('getJobById', error);
  }
};

export const updateJobStatus = async (
  session: AuthSession,
  id: string,
  nextStatus: JobStatus,
): Promise<Job> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      try {
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
      } catch (error) {
        if (!shouldUseLocalFallback()) {
          throw buildFirebaseError('updateJobStatus', error);
        }
        logFirebaseFallback('updateJobStatus', error);
      }
    } else if (!shouldUseLocalFallback()) {
      throw new Error('Firebase services are unavailable in production mode.');
    }
  } else if (!shouldUseLocalFallback()) {
    throw new Error('Firebase is required in production and is not configured.');
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

const createSyncState = (partial: Partial<JobsSyncState>): JobsSyncState => ({
  status: partial.status ?? 'idle',
  stale: partial.stale ?? false,
  reconnectAttempt: partial.reconnectAttempt ?? 0,
  lastSyncedAt: partial.lastSyncedAt ?? null,
  message: partial.message ?? null,
  source: partial.source ?? 'firebase',
});

export const subscribeJobs = (session: AuthSession, handlers: JobsSubscriptionHandlers): JobsSubscription => {
  const services = isFirebaseReady() ? getFirebaseServices() : null;

  if (!services) {
    if (!shouldUseLocalFallback()) {
      const message = 'Firebase is required in production mode and no fallback is allowed.';
      handlers.onSyncState(
        createSyncState({
          status: 'error',
          stale: true,
          message,
          source: 'firebase',
        }),
      );
      return {
        unsubscribe: () => {},
        refresh: async () => {
          throw new Error(message);
        },
      };
    }

    handlers.onSyncState(
      createSyncState({
        status: 'stale',
        stale: true,
        message: 'Using local jobs fallback. Live updates are unavailable.',
        source: 'local',
      }),
    );

    return {
      unsubscribe: () => {},
      refresh: async () => {
        const jobs = await loadLocalJobs();
        handlers.onJobs(jobs);
        return jobs;
      },
    };
  }

  let reconnectAttempt = 0;
  let lastSyncedAt: string | null = null;
  let active = true;
  let detachSnapshot: (() => void) | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const publishState = (state: Partial<JobsSyncState>): void => {
    if (!active) {
      return;
    }
    handlers.onSyncState(createSyncState(state));
  };

  const publishJobs = (jobs: Job[]): void => {
    if (!active) {
      return;
    }
    handlers.onJobs(jobs);
  };

  const clearReconnectTimer = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const clearSnapshot = (): void => {
    if (detachSnapshot) {
      detachSnapshot();
      detachSnapshot = null;
    }
  };

  const connect = (): void => {
    if (!active) {
      return;
    }

    clearReconnectTimer();
    clearSnapshot();

    publishState({
      status: reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
      stale: reconnectAttempt > 0,
      reconnectAttempt,
      lastSyncedAt,
      message: reconnectAttempt > 0 ? 'Reconnecting to live jobs feed...' : 'Connecting to live jobs feed...',
      source: 'firebase',
    });

    try {
      detachSnapshot = onSnapshot(
        buildQueryForSession(services.db, session),
        {includeMetadataChanges: true},
        snapshot => {
          const jobs = snapshot.docs.map(d => mapFirestoreJob(d.id, d.data() as Record<string, unknown>));
          const fromCache = snapshot.metadata.fromCache;

          if (!fromCache) {
            reconnectAttempt = 0;
            lastSyncedAt = new Date().toISOString();
          }

          publishJobs(jobs);
          publishState({
            status: fromCache ? (reconnectAttempt > 0 ? 'reconnecting' : 'stale') : 'live',
            stale: fromCache,
            reconnectAttempt,
            lastSyncedAt,
            message: fromCache ? 'Showing cached jobs while reconnecting.' : null,
            source: 'firebase',
          });
        },
        error => {
          const reason = error instanceof Error ? error.message : String(error);
          clearSnapshot();
          reconnectAttempt += 1;
          const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);

          publishState({
            status: 'reconnecting',
            stale: true,
            reconnectAttempt,
            lastSyncedAt,
            message: `Live jobs feed disconnected (${reason}). Retrying in ${Math.ceil(delay / 1000)}s.`,
            source: 'firebase',
          });

          reconnectTimer = setTimeout(() => {
            connect();
          }, delay);
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      reconnectAttempt += 1;
      const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);

      publishState({
        status: 'reconnecting',
        stale: true,
        reconnectAttempt,
        lastSyncedAt,
        message: `Unable to attach live jobs feed (${reason}). Retrying in ${Math.ceil(delay / 1000)}s.`,
        source: 'firebase',
      });

      reconnectTimer = setTimeout(() => {
        connect();
      }, delay);
    }
  };

  connect();

  return {
    unsubscribe: () => {
      active = false;
      clearReconnectTimer();
      clearSnapshot();
    },
    refresh: async () => {
      const jobs = await fetchJobs(session);
      publishJobs(jobs);
      lastSyncedAt = new Date().toISOString();
      publishState({
        status: 'live',
        stale: false,
        reconnectAttempt,
        lastSyncedAt,
        message: null,
        source: isFirebaseReady() ? 'firebase' : 'local',
      });
      return jobs;
    },
  };
};

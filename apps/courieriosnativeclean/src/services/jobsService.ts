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
const STATUS_UPDATE_QUEUE_KEY = '@senderr/jobs/status-update-queue';
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

type QueuedStatusUpdate = {
  jobId: string;
  sessionUid: string;
  nextStatus: JobStatus;
  enqueuedAt: string;
  attempts: number;
  lastError: string | null;
};

type QueueFlushResult = {
  flushed: number;
  remaining: number;
};

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
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // no-op, falls through to seed reset
  }

  await persistJobs(seedJobs);
  return seedJobs;
};

const upsertLocalJob = async (job: Job): Promise<void> => {
  const local = await loadLocalJobs();
  const index = local.findIndex(entry => entry.id === job.id);
  if (index >= 0) {
    local[index] = job;
  } else {
    local.unshift(job);
  }
  await persistJobs(local);
};

const updateLocalJobStatus = async (id: string, nextStatus: JobStatus): Promise<Job> => {
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

const readQueuedStatusUpdates = async (): Promise<QueuedStatusUpdate[]> => {
  const raw = await AsyncStorage.getItem(STATUS_UPDATE_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as QueuedStatusUpdate[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // no-op
  }

  return [];
};

const persistQueuedStatusUpdates = async (queue: QueuedStatusUpdate[]): Promise<void> => {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(STATUS_UPDATE_QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(STATUS_UPDATE_QUEUE_KEY, JSON.stringify(queue));
};

const queueSizeForSession = (queue: QueuedStatusUpdate[], session: AuthSession): number =>
  queue.filter(entry => entry.sessionUid === session.uid).length;

const enqueueStatusUpdate = async (
  session: AuthSession,
  id: string,
  nextStatus: JobStatus,
  error: unknown,
): Promise<number> => {
  const queue = await readQueuedStatusUpdates();
  const message = error instanceof Error ? error.message : String(error);
  const index = queue.findIndex(entry => entry.jobId === id && entry.sessionUid === session.uid);

  if (index >= 0) {
    queue[index] = {
      ...queue[index],
      nextStatus,
      enqueuedAt: new Date().toISOString(),
      attempts: queue[index].attempts + 1,
      lastError: message,
    };
  } else {
    queue.push({
      jobId: id,
      sessionUid: session.uid,
      nextStatus,
      enqueuedAt: new Date().toISOString(),
      attempts: 1,
      lastError: message,
    });
  }

  await persistQueuedStatusUpdates(queue);
  return queueSizeForSession(queue, session);
};

const dequeueStatusUpdate = async (session: AuthSession, id: string): Promise<void> => {
  const queue = await readQueuedStatusUpdates();
  const nextQueue = queue.filter(entry => !(entry.jobId === id && entry.sessionUid === session.uid));
  if (nextQueue.length !== queue.length) {
    await persistQueuedStatusUpdates(nextQueue);
  }
};

const isLikelyConnectivityError = (error: unknown): boolean => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as {code?: unknown}).code ?? '')
          .toLowerCase()
          .trim()
      : '';

  const messageMatches =
    message.includes('offline') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timed out') ||
    message.includes('unavailable');

  const codeMatches =
    code.includes('unavailable') ||
    code.includes('network-request-failed') ||
    code.includes('deadline-exceeded') ||
    code.includes('resource-exhausted');

  return messageMatches || codeMatches;
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

const flushQueuedStatusUpdates = async (session: AuthSession, db: Firestore): Promise<QueueFlushResult> => {
  const queue = await readQueuedStatusUpdates();
  const sessionQueue = queue
    .filter(entry => entry.sessionUid === session.uid)
    .sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));

  if (sessionQueue.length === 0) {
    return {flushed: 0, remaining: 0};
  }

  const queueByKey = new Map<string, QueuedStatusUpdate>();
  for (const entry of queue) {
    queueByKey.set(`${entry.sessionUid}:${entry.jobId}`, entry);
  }

  let flushed = 0;

  for (const entry of sessionQueue) {
    const key = `${entry.sessionUid}:${entry.jobId}`;
    const latest = queueByKey.get(key);
    if (!latest) {
      continue;
    }

    try {
      const ref = doc(db, 'jobs', latest.jobId);
      await updateDoc(ref, {
        status: latest.nextStatus,
        courierUid: session.uid,
        updatedAt: serverTimestamp(),
      });
      queueByKey.delete(key);
      flushed += 1;
    } catch (error) {
      queueByKey.set(key, {
        ...latest,
        attempts: latest.attempts + 1,
        lastError: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  const nextQueue = Array.from(queueByKey.values());
  await persistQueuedStatusUpdates(nextQueue);

  return {
    flushed,
    remaining: queueSizeForSession(nextQueue, session),
  };
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
    const jobs = snap.docs.map(d => mapFirestoreJob(d.id, d.data() as Record<string, unknown>));
    await persistJobs(jobs);
    return jobs;
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
      const job = mapFirestoreJob(snap.id, snap.data() as Record<string, unknown>);
      await upsertLocalJob(job);
      return job;
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

        await dequeueStatusUpdate(session, id);
        void flushQueuedStatusUpdates(session, services.db);

        const updated = await getDoc(ref);
        if (updated.exists()) {
          const mapped = mapFirestoreJob(updated.id, updated.data() as Record<string, unknown>);
          await upsertLocalJob(mapped);
          return mapped;
        }

        return updateLocalJobStatus(id, nextStatus);
      } catch (error) {
        if (!isLikelyConnectivityError(error) && !shouldUseLocalFallback()) {
          throw buildFirebaseError('updateJobStatus', error);
        }

        if (shouldUseLocalFallback()) {
          logFirebaseFallback('updateJobStatus', error);
        }

        const queuedCount = await enqueueStatusUpdate(session, id, nextStatus, error);
        const updatedLocal = await updateLocalJobStatus(id, nextStatus);
        console.warn(
          `[jobsService] queued status update for ${id} (${nextStatus}) while offline. pending updates: ${queuedCount}`,
        );
        return updatedLocal;
      }
    } else if (!shouldUseLocalFallback()) {
      throw new Error('Firebase services are unavailable in production mode.');
    }
  } else if (!shouldUseLocalFallback()) {
    throw new Error('Firebase is required in production and is not configured.');
  }

  return updateLocalJobStatus(id, nextStatus);
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
  let queueFlushPromise: Promise<void> | null = null;

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

  const flushQueue = (): void => {
    if (queueFlushPromise) {
      return;
    }

    queueFlushPromise = flushQueuedStatusUpdates(session, services.db)
      .then(async result => {
        if (!active || (result.flushed === 0 && result.remaining === 0)) {
          return;
        }

        if (result.flushed > 0) {
          const refreshed = await fetchJobs(session);
          publishJobs(refreshed);
          lastSyncedAt = new Date().toISOString();
        }

        publishState({
          status: result.remaining > 0 ? 'reconnecting' : 'live',
          stale: result.remaining > 0,
          reconnectAttempt,
          lastSyncedAt,
          message:
            result.remaining > 0
              ? `${result.remaining} job update(s) still pending sync.`
              : `Synced ${result.flushed} queued job update(s).`,
          source: 'firebase',
        });
      })
      .catch(error => {
        if (!active) {
          return;
        }
        const reason = error instanceof Error ? error.message : String(error);
        publishState({
          status: 'reconnecting',
          stale: true,
          reconnectAttempt: reconnectAttempt + 1,
          lastSyncedAt,
          message: `Queued updates are waiting for network (${reason}).`,
          source: 'firebase',
        });
      })
      .finally(() => {
        queueFlushPromise = null;
      });
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
            void persistJobs(jobs);
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

          if (!fromCache) {
            flushQueue();
          }
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
      const queueResult = await flushQueuedStatusUpdates(session, services.db);
      const jobs = await fetchJobs(session);
      publishJobs(jobs);
      lastSyncedAt = new Date().toISOString();
      publishState({
        status: queueResult.remaining > 0 ? 'reconnecting' : 'live',
        stale: queueResult.remaining > 0,
        reconnectAttempt,
        lastSyncedAt,
        message:
          queueResult.remaining > 0
            ? `${queueResult.remaining} job update(s) pending sync.`
            : queueResult.flushed > 0
              ? `Synced ${queueResult.flushed} queued job update(s).`
              : null,
        source: isFirebaseReady() ? 'firebase' : 'local',
      });
      return jobs;
    },
  };
};

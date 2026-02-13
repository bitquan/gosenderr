import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

import {getFirebaseServices, isFirebaseReady} from './firebase';
import {featureFlagsService} from './featureFlagsService';
import {runtimeConfig} from '../config/runtime';
import {buildTransitionConflictMessage, canTransitionJobStatus} from './jobTransitionRules';
import type {JobStatusCommandResult, JobsSubscription, JobsSubscriptionHandlers, JobsSyncState} from './ports/jobsPort';
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
    pickupLocation: {
      latitude: 37.79367,
      longitude: -122.39678,
      label: '42 Market St, San Francisco, CA',
    },
    dropoffLocation: {
      latitude: 37.79261,
      longitude: -122.39885,
      label: '220 Pine St, San Francisco, CA',
    },
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
    pickupLocation: {
      latitude: 37.78847,
      longitude: -122.39654,
      label: '500 Howard St, San Francisco, CA',
    },
    dropoffLocation: {
      latitude: 37.79102,
      longitude: -122.39095,
      label: '160 Spear St, San Francisco, CA',
    },
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

const normalizeLocation = (value: unknown): Job['pickupLocation'] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const location = value as Record<string, unknown>;
  const latitudeSource = location.latitude ?? location.lat;
  const longitudeSource = location.longitude ?? location.lng;
  const latitude = typeof latitudeSource === 'number' ? latitudeSource : Number(latitudeSource);
  const longitude = typeof longitudeSource === 'number' ? longitudeSource : Number(longitudeSource);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  const label = typeof location.label === 'string' ? location.label : undefined;
  return {
    latitude,
    longitude,
    label,
  };
};

const mapFirestoreJob = (id: string, data: Record<string, unknown>): Job => {
  const pickup = data.pickup as {label?: string} | undefined;
  const dropoff = data.dropoff as {label?: string} | undefined;
  const pickupLocation = normalizeLocation(data.pickup) ?? normalizeLocation(data.pickupLocation);
  const dropoffLocation = normalizeLocation(data.dropoff) ?? normalizeLocation(data.dropoffLocation);
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
    pickupLocation,
    dropoffLocation,
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
    // In local smoke/dev builds don't auto-seed persistent jobs so emulator
    // assigned jobs show correctly after clearing cache. Persist an empty
    // list instead of the hardcoded demo seed to avoid confusing developers.
    if (runtimeConfig.envName === 'dev') {
      await persistJobs([]);
      return [];
    }

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

  const codeMatches =
    code.includes('unavailable') ||
    code.includes('network-request-failed') ||
    code.includes('deadline-exceeded') ||
    code.includes('resource-exhausted');

  // Keep message checks strict to avoid queuing validation errors like
  // "pickup location unavailable" as if they were network failures.
  const messageMatches =
    message.includes('client is offline') ||
    message.includes('network request failed') ||
    message.includes('network unavailable') ||
    message.includes('failed to get document because the client is offline') ||
    message.includes('timed out') ||
    message.includes('connection reset') ||
    message.includes('connection failed');

  return codeMatches || messageMatches;
};

const logFirebaseFallback = (operation: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[jobsService] ${operation} failed in Firebase mode; falling back to local mock data.`, message);
};

const shouldUseLocalFallback = (): boolean => runtimeConfig.envName !== 'prod';

const buildQueryForSession = (db: Firestore, session: AuthSession) => {
  const jobsRef = collection(db, 'jobs');
  // Keep for backwards-compatibility (used nowhere else) — realtime now
  // listens to assigned + pending feeds and merges them.
  return query(jobsRef, where('courierUid', '==', session.uid));
};

const mergeAssignedAndPendingDocs = (
  assignedDocs: Array<{id: string; data: () => Record<string, unknown>}>,
  assignedByIdDocs: Array<{id: string; data: () => Record<string, unknown>}>,
  pendingDocs: Array<{id: string; data: () => Record<string, unknown>}>,
): Job[] => {
  const map = new Map<string, {id: string; data: () => Record<string, unknown>}>(
    assignedDocs.map(d => [d.id, d]),
  );
  for (const d of assignedByIdDocs) {
    map.set(d.id, d);
  }

  for (const p of pendingDocs) {
    const data = p.data();
    // include only truly unassigned pending jobs (no courierUid/courierId)
    if (!('courierUid' in data) && !('courierId' in data)) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
  }

  return sortJobsByNewest(Array.from(map.values()).map(d => mapFirestoreJob(d.id, d.data() as Record<string, unknown>)));
};

const mergeJobDocs = (
  docs: Array<{id: string; data: () => Record<string, unknown>}>,
): Job[] =>
  sortJobsByNewest(docs.map(d => mapFirestoreJob(d.id, d.data() as Record<string, unknown>)));

const readSnapshotDocs = (snapshot: unknown): Array<{id: string; data: () => Record<string, unknown>}> => {
  if (!snapshot || typeof snapshot !== 'object') {
    return [];
  }

  const docs = (snapshot as {docs?: unknown}).docs;
  if (!Array.isArray(docs)) {
    return [];
  }

  return docs.filter(
    (doc): doc is {id: string; data: () => Record<string, unknown>} =>
      Boolean(doc) && typeof (doc as {id?: unknown}).id === 'string' && typeof (doc as {data?: unknown}).data === 'function',
  );
};

const parseUpdatedAtMs = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortJobsByNewest = (jobs: Job[]): Job[] =>
  [...jobs].sort((left, right) => parseUpdatedAtMs(right.updatedAt) - parseUpdatedAtMs(left.updatedAt));

const buildFirebaseError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`[jobsService] ${operation} failed in Firebase mode: ${message}`);
};

const MAX_QUEUED_UPDATE_ATTEMPTS = 5;

// Lightweight in-memory telemetry for queued-flush behavior (testable)
const _queueFlushTelemetry = {
  drops: 0,
  retryableErrors: 0,
};

export const getQueueFlushTelemetry = () => ({..._queueFlushTelemetry});

export const flushQueuedStatusUpdates = async (session: AuthSession, db: Firestore): Promise<QueueFlushResult> => {
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

    // Drop entries that have retried too many times to avoid stuck queues
    if (latest.attempts >= MAX_QUEUED_UPDATE_ATTEMPTS) {
      _queueFlushTelemetry.drops += 1;
      console.warn(`[jobsService] dropping queued status update for ${latest.jobId} after ${latest.attempts} attempts`);
      queueByKey.delete(key);
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
      const lastError = error instanceof Error ? error.message : String(error);
      const retryable = isLikelyConnectivityError(error);

      if (retryable) {
        _queueFlushTelemetry.retryableErrors += 1;
        queueByKey.set(key, {
          ...latest,
          attempts: latest.attempts + 1,
          lastError,
        });
        break;
      }

      // Drop non-network failures (permission/conflict/validation) so sync status can recover.
      _queueFlushTelemetry.drops += 1;
      console.warn(
        `[jobsService] dropping queued status update for ${latest.jobId} after non-retryable error: ${lastError}`,
      );
      queueByKey.delete(key);
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
    const jobsRef = collection(services.db, 'jobs');

    const [byCourierUid, byCourierId, pendingSnapshot] = await Promise.all([
      getDocs(query(jobsRef, where('courierUid', '==', session.uid))),
      getDocs(query(jobsRef, where('courierId', '==', session.uid))),
      // include global pending/unassigned jobs so couriers can see offers
      getDocs(query(jobsRef, where('status', '==', 'pending'))),
    ]);

    const byUidDocs = readSnapshotDocs(byCourierUid);
    const byIdDocs = readSnapshotDocs(byCourierId);
    const pendingDocs = readSnapshotDocs(pendingSnapshot);

    // Merge assigned (courierUid/courierId) + pending/unassigned offers
    const jobsMerged = mergeAssignedAndPendingDocs(byUidDocs, byIdDocs, pendingDocs);
    let jobs = jobsMerged;

    // Dev-only recovery path: if auth UID drifts but email is the same,
    // gather alternate courier user docs by email and include their jobs.
    if (jobs.length === 0 && runtimeConfig.envName !== 'prod' && session.email) {
      const usersRef = collection(services.db, 'users');
      const usersByEmail = await getDocs(query(usersRef, where('email', '==', session.email)));
      const usersByEmailDocs = readSnapshotDocs(usersByEmail);
      const aliasUids = usersByEmailDocs
        .map(d => d.id)
        .filter(uid => uid !== session.uid);

      if (aliasUids.length > 0) {
        const aliasDocs: Array<{id: string; data: () => Record<string, unknown>}> = [];
        for (const aliasUid of aliasUids) {
          const [aliasByUid, aliasById] = await Promise.all([
            getDocs(query(jobsRef, where('courierUid', '==', aliasUid))),
            getDocs(query(jobsRef, where('courierId', '==', aliasUid))),
          ]);

          readSnapshotDocs(aliasByUid).forEach(d => aliasDocs.push(d));
          readSnapshotDocs(aliasById).forEach(d => aliasDocs.push(d));
        }

        if (aliasDocs.length > 0) {
          const mergedAlias = new Map<string, {id: string; data: () => Record<string, unknown>}>(
            aliasDocs.map(d => [d.id, d]),
          );
          jobs = mergeJobDocs(Array.from(mergedAlias.values()));
        }
      }
    }

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

const loadLocalJobById = async (id: string): Promise<Job | null> => {
  const local = await loadLocalJobs();
  return local.find(job => job.id === id) ?? null;
};

const buildCommandResultSuccess = (
  job: Job,
  requestedStatus: JobStatus,
  idempotent: boolean,
  message: string | null,
): JobStatusCommandResult => ({
  kind: 'success',
  job,
  requestedStatus,
  idempotent,
  message,
});

const buildCommandResultConflict = (job: Job, requestedStatus: JobStatus, message: string): JobStatusCommandResult => ({
  kind: 'conflict',
  job,
  requestedStatus,
  message,
});

const buildCommandResultRetryable = (job: Job, requestedStatus: JobStatus, message: string): JobStatusCommandResult => ({
  kind: 'retryable_error',
  job,
  requestedStatus,
  message,
});

const buildCommandResultFatal = (
  requestedStatus: JobStatus,
  message: string,
  job: Job | null = null,
): JobStatusCommandResult => ({
  kind: 'fatal_error',
  job,
  requestedStatus,
  message,
});

const validateTransitionAgainstJob = (job: Job, nextStatus: JobStatus): JobStatusCommandResult | null => {
  if (job.status === nextStatus) {
    return buildCommandResultSuccess(job, nextStatus, true, 'Job status is already up to date.');
  }

  if (!canTransitionJobStatus(job.status, nextStatus)) {
    return buildCommandResultConflict(
      job,
      nextStatus,
      `${buildTransitionConflictMessage(job.status, nextStatus)} Refresh job state and retry.`,
    );
  }

  return null;
};

export const updateJobStatus = async (
  session: AuthSession,
  id: string,
  nextStatus: JobStatus,
): Promise<JobStatusCommandResult> => {
  if (!featureFlagsService.isEnabled('jobStatusActions')) {
    return buildCommandResultFatal(nextStatus, 'Status updates are temporarily disabled by rollout controls.');
  }

  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      try {
        const ref = doc(services.db, 'jobs', id);
        const transactionOutcome = await runTransaction(services.db, async transaction => {
          const snap = await transaction.get(ref);
          if (!snap.exists()) {
            return {kind: 'missing' as const};
          }

          const remoteJob = mapFirestoreJob(snap.id, snap.data() as Record<string, unknown>);
          const validation = validateTransitionAgainstJob(remoteJob, nextStatus);
          if (validation?.kind === 'conflict') {
            return {kind: 'conflict' as const, job: remoteJob};
          }
          if (validation?.kind === 'success' && validation.idempotent) {
            return {kind: 'idempotent' as const, job: remoteJob};
          }

          transaction.update(ref, {
            status: nextStatus,
            courierUid: session.uid,
            updatedAt: serverTimestamp(),
          });

          return {kind: 'updated' as const};
        });

        if (transactionOutcome.kind === 'missing') {
          return buildCommandResultFatal(nextStatus, 'Job no longer exists. Refresh your jobs list and retry.');
        }

        if (transactionOutcome.kind === 'conflict') {
          await upsertLocalJob(transactionOutcome.job);
          return buildCommandResultConflict(
            transactionOutcome.job,
            nextStatus,
            `${buildTransitionConflictMessage(transactionOutcome.job.status, nextStatus)} Refresh and retry.`,
          );
        }

        if (transactionOutcome.kind === 'idempotent') {
          await upsertLocalJob(transactionOutcome.job);
          await dequeueStatusUpdate(session, id);
          return buildCommandResultSuccess(transactionOutcome.job, nextStatus, true, 'Job status is already up to date.');
        }

        await dequeueStatusUpdate(session, id);
        void flushQueuedStatusUpdates(session, services.db);

        const updated = await getDoc(ref);
        if (updated.exists()) {
          const mapped = mapFirestoreJob(updated.id, updated.data() as Record<string, unknown>);
          await upsertLocalJob(mapped);
          return buildCommandResultSuccess(mapped, nextStatus, false, null);
        }

        const updatedLocal = await updateLocalJobStatus(id, nextStatus);
        return buildCommandResultSuccess(updatedLocal, nextStatus, false, null);
      } catch (error) {
        const localJob = await loadLocalJobById(id);
        if (!localJob) {
          return buildCommandResultFatal(nextStatus, 'Job was not found in local cache.', null);
        }

        const localValidation = validateTransitionAgainstJob(localJob, nextStatus);
        if (localValidation) {
          return localValidation;
        }

        if (!isLikelyConnectivityError(error) && !shouldUseLocalFallback()) {
          return buildCommandResultFatal(nextStatus, buildFirebaseError('updateJobStatus', error).message, localJob);
        }

        if (shouldUseLocalFallback()) {
          logFirebaseFallback('updateJobStatus', error);
        }

        const queuedCount = await enqueueStatusUpdate(session, id, nextStatus, error);
        const updatedLocal = await updateLocalJobStatus(id, nextStatus);
        const queuedMessage = `Status update queued while connection recovers. Pending updates: ${queuedCount}.`;
        console.warn(
          `[jobsService] queued status update for ${id} (${nextStatus}) while offline. pending updates: ${queuedCount}`
        );
        return buildCommandResultRetryable(updatedLocal, nextStatus, queuedMessage);
      }
    }

    if (!shouldUseLocalFallback()) {
      return buildCommandResultFatal(nextStatus, 'Firebase services are unavailable in production mode.');
    }
  } else if (!shouldUseLocalFallback()) {
    return buildCommandResultFatal(nextStatus, 'Firebase is required in production and is not configured.');
  }

  const localJob = await loadLocalJobById(id);
  if (!localJob) {
    return buildCommandResultFatal(nextStatus, 'Job not found.');
  }

  const validation = validateTransitionAgainstJob(localJob, nextStatus);
  if (validation) {
    return validation;
  }

  const updatedLocal = await updateLocalJobStatus(id, nextStatus);
  return buildCommandResultSuccess(updatedLocal, nextStatus, false, 'Status updated locally.');
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
      // Attach three listeners and merge their results:
      //  - assigned by courierUid
      //  - assigned by courierId
      //  - pending (unassigned offers)
      let detachA: (() => void) | null = null;
      let detachB: (() => void) | null = null;
      let detachC: (() => void) | null = null;

      const assignedByUidMap = new Map<string, {id: string; data: () => Record<string, unknown>}>([]);
      const assignedByIdMap = new Map<string, {id: string; data: () => Record<string, unknown>}>([]);
      const pendingMap = new Map<string, {id: string; data: () => Record<string, unknown>}>([]);
      const listenerMetadata: Record<string, boolean> = {assignedUid: true, assignedId: true, pending: true};

      // Resilience: track listener error counts and fall back to polling if unstable
      let listenerErrorCount = 0;
      let listenerFirstErrorAt: number | null = null;
      let pollingFallback = false;
      let pollingInterval: ReturnType<typeof setInterval> | null = null;
      const LISTENER_ERROR_WINDOW_MS = 60_000; // window to count errors
      const LISTENER_ERROR_THRESHOLD = 3; // errors within window to trigger fallback
      const POLLING_INTERVAL_MS = 5000; // when fallback active

      const enablePollingFallback = (): void => {
        if (pollingFallback) return;
        pollingFallback = true;
        publishState({
          status: 'reconnecting',
          stale: true,
          reconnectAttempt,
          lastSyncedAt,
          message: 'Watch stream unstable — switching to polling fallback.',
          source: 'firebase',
        });

        // detach real-time listeners (they will be cleaned by detachSnapshot when unsubscribe is called)
        if (detachA) detachA();
        if (detachB) detachB();
        if (detachC) detachC();
        detachA = detachB = detachC = null;

        // start polling
        pollingInterval = setInterval(async () => {
          try {
            const jobs = await fetchJobs(session);
            publishJobs(jobs);
            publishState({status: 'reconnecting', stale: true, reconnectAttempt, lastSyncedAt: new Date().toISOString(), message: 'Polling for jobs while Watch stream is unstable.', source: 'firebase'});
          } catch (err) {
            // keep trying; don't crash
          }
        }, POLLING_INTERVAL_MS);
      };

      const disablePollingFallback = (): void => {
        pollingFallback = false;
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      };

      const recordListenerError = (err: unknown): void => {
        const now = Date.now();
        if (!listenerFirstErrorAt || now - listenerFirstErrorAt > LISTENER_ERROR_WINDOW_MS) {
          listenerFirstErrorAt = now;
          listenerErrorCount = 1;
        } else {
          listenerErrorCount += 1;
        }

        if (listenerErrorCount >= LISTENER_ERROR_THRESHOLD) {
          enablePollingFallback();
        }
      };

      const recomputeAndPublish = (sourceKey: string, snapshot: any) => {
        listenerMetadata[sourceKey] = snapshot.metadata?.fromCache ?? true;

        const assignedDocs = Array.from(assignedByUidMap.values());
        const assignedIdDocs = Array.from(assignedByIdMap.values());
        const pendingDocs = Array.from(pendingMap.values());

        const merged = mergeAssignedAndPendingDocs(assignedDocs, assignedIdDocs, pendingDocs);

        const fromCache = Object.values(listenerMetadata).every(v => v === true);

        if (!fromCache) {
          reconnectAttempt = 0;
          lastSyncedAt = new Date().toISOString();
          void persistJobs(merged);
        }

        publishJobs(merged);
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

        if (!fromCache && pollingFallback) {
          disablePollingFallback();
        }
      };

      detachA = onSnapshot(
        query(collection(services.db, 'jobs'), where('courierUid', '==', session.uid)),
        {includeMetadataChanges: true},
        snapshot => {
          try {
            const docs = readSnapshotDocs(snapshot);
            assignedByUidMap.clear();
            docs.forEach(d => assignedByUidMap.set(d.id, d));
            recomputeAndPublish('assignedUid', snapshot);
          } catch (err) {
            console.error('[jobsService] assignedUid handler threw', err);
            recordListenerError(err);
          }
        },
        error => {
          console.error('[jobsService] assignedUid listener error', error);
          recordListenerError(error);
          clearSnapshot();
          reconnectAttempt += 1;
          const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);
          publishState({
            status: 'reconnecting',
            stale: true,
            reconnectAttempt,
            lastSyncedAt,
            message: `Live jobs feed disconnected (assignedUid) — ${String(error)}. Retrying in ${Math.ceil(delay / 1000)}s.`,
            source: 'firebase',
          });
          reconnectTimer = setTimeout(() => connect(), delay);
        },
      );

      detachB = onSnapshot(
        query(collection(services.db, 'jobs'), where('courierId', '==', session.uid)),
        {includeMetadataChanges: true},
        snapshot => {
          try {
            const docs = readSnapshotDocs(snapshot);
            assignedByIdMap.clear();
            docs.forEach(d => assignedByIdMap.set(d.id, d));
            recomputeAndPublish('assignedId', snapshot);
          } catch (err) {
            console.error('[jobsService] assignedId handler threw', err);
            recordListenerError(err);
          }
        },
        error => {
          console.error('[jobsService] assignedId listener error', error);
          recordListenerError(error);
          clearSnapshot();
          reconnectAttempt += 1;
          const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);
          publishState({
            status: 'reconnecting',
            stale: true,
            reconnectAttempt,
            lastSyncedAt,
            message: `Live jobs feed disconnected (assignedId) — ${String(error)}. Retrying in ${Math.ceil(delay / 1000)}s.`,
            source: 'firebase',
          });
          reconnectTimer = setTimeout(() => connect(), delay);
        },
      );

      detachC = onSnapshot(
        query(collection(services.db, 'jobs'), where('status', '==', 'pending')),
        {includeMetadataChanges: true},
        snapshot => {
          try {
            const docs = readSnapshotDocs(snapshot);
            pendingMap.clear();
            docs.forEach(d => pendingMap.set(d.id, d));
            recomputeAndPublish('pending', snapshot);
          } catch (err) {
            console.error('[jobsService] pending handler threw', err);
            recordListenerError(err);
          }
        },
        error => {
          console.error('[jobsService] pending listener error', error);
          recordListenerError(error);
          clearSnapshot();
          reconnectAttempt += 1;
          const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);
          publishState({
            status: 'reconnecting',
            stale: true,
            reconnectAttempt,
            lastSyncedAt,
            message: `Live jobs feed disconnected (pending) — ${String(error)}. Retrying in ${Math.ceil(delay / 1000)}s.`,
            source: 'firebase',
          });
          reconnectTimer = setTimeout(() => connect(), delay);
        },
      );

      // detachSnapshot will clear all three listeners
      detachSnapshot = () => {
        if (detachA) detachA();
        if (detachB) detachB();
        if (detachC) detachC();
        detachA = detachB = detachC = null;
      };
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

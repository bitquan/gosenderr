import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, serverTimestamp, updateDoc} from 'firebase/firestore';
import type {LocationSnapshot} from './ports/locationPort';
import {getFirebaseServices, isFirebaseReady} from './firebase';

const STORAGE_KEY = '@senderr/location-upload-queue';

export type EnqueuedLocation = {
  uid: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  timestamp: string; // ISO
  attempts: number;
  lastError?: string | null;
};

/** Configurable policy and telemetry hook for the uploader (defaults safe for production) */
let MAX_ATTEMPTS = 5;
let BACKOFF_BASE_MS = 1000;

export type TelemetryHook = {
  track: (event: string, props?: Record<string, unknown>) => void;
};
let telemetry: TelemetryHook = {track: (_e: string) => {}};

// Analytics adapter: follows AnalyticsServicePort.track signature (async)
export type AnalyticsAdapter = {track: (event: string, props?: Record<string, unknown>) => Promise<void>};
let analyticsAdapter: AnalyticsAdapter | null = null;

export const setLocationUploadTelemetry = (t: TelemetryHook): void => {
  telemetry = t;
};

export const setLocationUploadAnalytics = (a: AnalyticsAdapter | null): void => {
  analyticsAdapter = a;
};

export const setLocationUploadMaxAttempts = (n: number): void => {
  MAX_ATTEMPTS = Math.max(1, Math.floor(n));
};

export const setLocationUploadBackoffBase = (ms: number): void => {
  BACKOFF_BASE_MS = Math.max(100, Math.floor(ms));
};

const computeBackoffMs = (attempts: number): number => {
  // exponential backoff with cap 60s
  const ms = BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempts - 1));
  return Math.min(ms, 60_000);
};

const scheduleRetry = (uid: string, attempts: number): void => {
  const delayMs = computeBackoffMs(attempts);
  try {
    // schedule an async retry; fire-and-forget
    setTimeout(() => {
      // best-effort flush; ignore errors
      void flushQueuedLocationsForSession(uid).catch(() => {});
    }, delayMs);

    telemetry.track('location_upload_retry_scheduled', {uid, delayMs});
    if (analyticsAdapter) void analyticsAdapter.track('location_upload_retry_scheduled', {uid, delayMs});
  } catch (err) {
    // don't let scheduling failures block
    // eslint-disable-next-line no-console
    console.warn('[locationUploader] scheduleRetry failed', err);
  }
};

const readQueue = async (): Promise<EnqueuedLocation[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as EnqueuedLocation[];
  } catch (err) {
    // ignore and return empty
  }
  return [];
};

const persistQueue = async (queue: EnqueuedLocation[]): Promise<void> => {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const enqueueLocation = async (
  uid: string,
  snapshot: LocationSnapshot,
): Promise<void> => {
  const queue = await readQueue();

  // keep a single latest entry per UID to avoid queue explosion
  const existingIndex = queue.findIndex(e => e.uid === uid);
  const item: EnqueuedLocation = {
    uid,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    accuracy: snapshot.accuracy ?? null,
    heading: (snapshot as any).heading ?? null,
    timestamp: new Date(snapshot.timestamp ?? Date.now()).toISOString(),
    attempts: 0,
    lastError: null,
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = item;
  } else {
    queue.push(item);
  }

  await persistQueue(queue);

  // Telemetry for enqueue
  try {
    telemetry.track('location_enqueue', {uid, timestamp: item.timestamp});
    if (analyticsAdapter) void analyticsAdapter.track('location_enqueue', {uid, timestamp: item.timestamp});
  } catch (err) {
    // telemetry should never block functionality
    // eslint-disable-next-line no-console
    console.warn('[locationUploader] telemetry enqueue failed', err);
  }
};

export const performLocationUpload = async (
  entry: EnqueuedLocation,
): Promise<void> => {
  const services = isFirebaseReady() ? getFirebaseServices() : null;
  if (!services) throw new Error('Firebase not configured');

  telemetry.track('location_upload_start', {
    uid: entry.uid,
    attempts: entry.attempts,
  });
  if (analyticsAdapter) void analyticsAdapter.track('location_upload_start', {uid: entry.uid, attempts: entry.attempts});

  const ref = doc(services.db, 'users', entry.uid);
  await updateDoc(ref, {
    location: {
      lat: entry.latitude,
      lng: entry.longitude,
      heading: entry.heading ?? null,
      updatedAt: serverTimestamp(),
    },
  });

  telemetry.track('location_upload_success', {uid: entry.uid});
  if (analyticsAdapter) void analyticsAdapter.track('location_upload_success', {uid: entry.uid});
};

export const flushQueuedLocationsForSession = async (
  uid: string,
): Promise<{flushed: number; remaining: number}> => {
  const queue = await readQueue();
  const sessionEntries = queue
    .filter(e => e.uid === uid)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (sessionEntries.length === 0) return {flushed: 0, remaining: 0};

  // We only need to upload the latest location for the session (most recent)
  const latest = sessionEntries[sessionEntries.length - 1];
  try {
    await performLocationUpload(latest);
    // remove this session's entries
    const remaining = queue.filter(e => e.uid !== uid);
    await persistQueue(remaining);

    telemetry.track('location_upload_flushed', {uid});
    if (analyticsAdapter) void analyticsAdapter.track('location_upload_flushed', {uid});

    return {flushed: 1, remaining: remaining.length};
  } catch (error) {
    // Network or other transient errors should leave the entry with attempt incremented
    const message = error instanceof Error ? error.message : String(error);
    const next = queue.map(e =>
      e.uid === uid ? {...e, attempts: e.attempts + 1, lastError: message} : e,
    );

    // If attempts exceed MAX_ATTEMPTS, drop the entry and emit telemetry
    const updated = next
      .map(e => {
        if (e.uid !== uid) return e;
        if (e.attempts >= MAX_ATTEMPTS) {
          telemetry.track('location_upload_dropped', {
            uid: e.uid,
            attempts: e.attempts,
            lastError: e.lastError,
          });
          if (analyticsAdapter) void analyticsAdapter.track('location_upload_dropped', {
            uid: e.uid,
            attempts: e.attempts,
            lastError: e.lastError,
          });
          return null as unknown as EnqueuedLocation;
        }
        return e;
      })
      .filter((x): x is EnqueuedLocation => x !== null);

    await persistQueue(updated);

    // If we still have the entry, schedule a retry with exponential backoff
    const updatedEntry = updated.find(e => e.uid === uid);
    if (updatedEntry) {
      scheduleRetry(uid, updatedEntry.attempts);
    }

    throw error;
  }
};

// For convenience in tests / small scripts
export const readQueuedLocations = readQueue;

export default {
  enqueueLocation,
  flushQueuedLocationsForSession,
  readQueuedLocations,
  performLocationUpload,
};

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

export const enqueueLocation = async (uid: string, snapshot: LocationSnapshot): Promise<void> => {
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
};

export const performLocationUpload = async (entry: EnqueuedLocation): Promise<void> => {
  const services = isFirebaseReady() ? getFirebaseServices() : null;
  if (!services) throw new Error('Firebase not configured');

  const ref = doc(services.db, 'users', entry.uid);
  await updateDoc(ref, {
    location: {
      lat: entry.latitude,
      lng: entry.longitude,
      heading: entry.heading ?? null,
      updatedAt: serverTimestamp(),
    },
  });
};

export const flushQueuedLocationsForSession = async (uid: string): Promise<{flushed:number;remaining:number}> => {
  const queue = await readQueue();
  const sessionEntries = queue.filter(e => e.uid === uid).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
  if (sessionEntries.length === 0) return {flushed: 0, remaining: 0};

  // We only need to upload the latest location for the session (most recent)
  const latest = sessionEntries[sessionEntries.length - 1];
  try {
    await performLocationUpload(latest);
    // remove this session's entries
    const remaining = queue.filter(e => e.uid !== uid);
    await persistQueue(remaining);
    return {flushed: 1, remaining: remaining.length};
  } catch (error) {
    // Network or other transient errors should leave the entry with attempt incremented
    const message = error instanceof Error ? error.message : String(error);
    const next = queue.map(e => (e.uid === uid ? {...e, attempts: e.attempts + 1, lastError: message} : e));
    await persistQueue(next);
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

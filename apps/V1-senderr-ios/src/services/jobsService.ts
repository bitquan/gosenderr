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
import {httpsCallable} from 'firebase/functions';
import {
  buildJobTransitionConflictMessage,
  canTransitionJobStatus,
  type JobStatus,
} from '@gosenderr/contracts';

import {getFirebaseFunctions, getFirebaseServices, isFirebaseEmulatorEnabled, isFirebaseReady} from './firebase';
import {featureFlagsService} from './featureFlagsService';
import {
  buildCapabilityRequirementsForRawJob,
  isCourierEligibleForJobMode,
  missingCapabilityRequirements,
  resolveCourierJobMode,
} from './jobEligibilityRules';
import {runtimeConfig} from '../config/runtime';
import type {JobStatusCommandResult, JobsSubscription, JobsSubscriptionHandlers, JobsSyncState} from './ports/jobsPort';
import type {AuthSession} from '../types/auth';
import type {Job} from '../types/jobs';
import {
  COURIER_EQUIPMENT_TYPES,
  buildDefaultCourierEquipment,
  deriveCourierCapabilities,
  type CourierCapabilities,
  type CourierWorkModes,
} from '../types/profile';

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

type CommandJobStatusCallableRequest = {
  jobId: string;
  correlationId: string;
};

type CommandJobStatusCallableResponse = {
  kind?: 'success' | 'conflict' | 'retryable_error' | 'fatal_error';
  requestedStatus?: string;
  idempotent?: boolean;
  message?: string | null;
  correlationId?: string;
  job?: Record<string, unknown> | null;
};

type CallableCommandName =
  | 'commandAcceptJob'
  | 'commandStartPickup'
  | 'commandMarkArrivedPickup'
  | 'commandConfirmPickup'
  | 'commandStartDropoff'
  | 'commandCompleteDelivery';

type JobPhoto = NonNullable<Job['photos']>[number];
type CourierFeedEligibility = {
  workModes: CourierWorkModes;
  capabilities: CourierCapabilities;
};

const DEFAULT_COURIER_FEED_ELIGIBILITY: CourierFeedEligibility = {
  workModes: {
    packagesEnabled: true,
    foodEnabled: true,
  },
  capabilities: {
    canDeliverHot: true,
    canDeliverCold: true,
    canDeliverFrozen: true,
    canDeliverDrinks: true,
    canDeliverHeavy: true,
    canDeliverFurniture: true,
  },
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
    status: 'open',
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
    status: 'assigned',
    updatedAt: new Date().toISOString(),
  },
];

const KNOWN_STATUSES: ReadonlySet<JobStatus> = new Set([
  'open',
  'assigned',
  'enroute_pickup',
  'arrived_pickup',
  'picked_up',
  'enroute_dropoff',
  'arrived_dropoff',
  'completed',
  'cancelled',
  'disputed',
  'expired',
  'failed',
]);

const LEGACY_STATUS_ALIASES: Record<string, JobStatus> = {
  pending: 'open',
  accepted: 'assigned',
  delivered: 'completed',
};

const normalizeStatus = (status: string): JobStatus => {
  const normalized = status.trim().toLowerCase();
  if (LEGACY_STATUS_ALIASES[normalized]) {
    return LEGACY_STATUS_ALIASES[normalized];
  }
  if (KNOWN_STATUSES.has(normalized as JobStatus)) {
    return normalized as JobStatus;
  }

  console.warn(`[jobsService] unknown job status "${status}" received from backend; defaulting to open.`);
  return 'open';
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

const normalizePaymentStatus = (value: unknown): Job['paymentStatus'] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'pending' ||
    normalized === 'authorized' ||
    normalized === 'captured' ||
    normalized === 'refunded' ||
    normalized === 'paid'
  ) {
    return normalized;
  }
  return undefined;
};

const normalizeProof = (value: unknown): Job['pickupProof'] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const proof = value as Record<string, unknown>;
  const location = proof.location as Record<string, unknown> | undefined;
  const latitudeRaw = location?.latitude;
  const longitudeRaw = location?.longitude;
  const accuracyRaw = proof.accuracy;
  const timestampRaw = proof.timestamp;
  const url = typeof proof.url === 'string' ? proof.url : undefined;
  const latitude = typeof latitudeRaw === 'number' ? latitudeRaw : Number(latitudeRaw);
  const longitude = typeof longitudeRaw === 'number' ? longitudeRaw : Number(longitudeRaw);
  const accuracy = typeof accuracyRaw === 'number' ? accuracyRaw : Number(accuracyRaw);

  if (!url || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) {
    return undefined;
  }

  let timestamp = new Date().toISOString();
  if (typeof timestampRaw === 'string') {
    timestamp = timestampRaw;
  } else if (timestampRaw instanceof Date) {
    timestamp = timestampRaw.toISOString();
  } else if (
    timestampRaw &&
    typeof timestampRaw === 'object' &&
    typeof (timestampRaw as {toDate?: unknown}).toDate === 'function'
  ) {
    timestamp = ((timestampRaw as {toDate: () => Date}).toDate()).toISOString();
  }

  return {
    url,
    location: {
      latitude,
      longitude,
    },
    accuracy,
    timestamp,
  };
};

const normalizeOptionalIsoDate = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (
    typeof value === 'object' &&
    typeof (value as {toDate?: unknown}).toDate === 'function'
  ) {
    return ((value as {toDate: () => Date}).toDate()).toISOString();
  }
  return undefined;
};

const normalizePhoto = (value: unknown): JobPhoto | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const photo = value as Record<string, unknown>;
  const url = typeof photo.url === 'string' ? photo.url.trim() : '';
  if (url.length === 0) {
    return undefined;
  }

  const path = typeof photo.path === 'string' && photo.path.trim().length > 0 ? photo.path : undefined;
  const uploadedBy =
    typeof photo.uploadedBy === 'string' && photo.uploadedBy.trim().length > 0
      ? photo.uploadedBy
      : undefined;
  const uploadedAt = normalizeOptionalIsoDate(photo.uploadedAt);

  return {
    url,
    path,
    uploadedAt,
    uploadedBy,
  };
};

const normalizePhotos = (value: unknown): Job['photos'] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const photos = value
    .map(entry => normalizePhoto(entry))
    .filter((entry): entry is JobPhoto => Boolean(entry));

  return photos.length > 0 ? photos : undefined;
};

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildFoodOrderSummary = (foodDetails: Record<string, unknown> | undefined): string | undefined => {
  if (!foodDetails) {
    return undefined;
  }

  const restaurantName = normalizeText(foodDetails.restaurantName);
  const confirmationName = normalizeText(foodDetails.confirmationName);
  const orderNumber = normalizeText(foodDetails.orderNumber);
  const pickupCode = normalizeText(foodDetails.pickupCode);
  const pickupInstructions = normalizeText(foodDetails.pickupInstructions);
  const customerNotes = normalizeText(foodDetails.customerNotes);

  const summaryParts: string[] = [];
  if (restaurantName) {
    summaryParts.push(`Restaurant: ${restaurantName}`);
  }
  if (confirmationName) {
    summaryParts.push(`Order name: ${confirmationName}`);
  }
  if (orderNumber) {
    summaryParts.push(`Order #: ${orderNumber}`);
  }
  if (pickupCode) {
    summaryParts.push(`Pickup code: ${pickupCode}`);
  }
  if (pickupInstructions) {
    summaryParts.push(`Pickup instructions: ${pickupInstructions}`);
  }
  if (customerNotes) {
    summaryParts.push(`Customer notes: ${customerNotes}`);
  }

  return summaryParts.length > 0 ? summaryParts.join(' • ') : undefined;
};

const mapFirestoreJob = (id: string, data: Record<string, unknown>): Job => {
  const pickup = data.pickup as {label?: string; address?: string} | undefined;
  const dropoff = data.dropoff as {label?: string; address?: string} | undefined;
  const packageData = data.package as Record<string, unknown> | undefined;
  const foodDetails = data.foodDetails as Record<string, unknown> | undefined;
  const pickupLocation = normalizeLocation(data.pickup) ?? normalizeLocation(data.pickupLocation);
  const dropoffLocation = normalizeLocation(data.dropoff) ?? normalizeLocation(data.dropoffLocation);
  const pickupAddressFromPayload =
    (typeof pickup?.label === 'string' && pickup.label.trim().length > 0
      ? pickup.label
      : undefined) ??
    (typeof pickup?.address === 'string' && pickup.address.trim().length > 0
      ? pickup.address
      : undefined);
  const dropoffAddressFromPayload =
    (typeof dropoff?.label === 'string' && dropoff.label.trim().length > 0
      ? dropoff.label
      : undefined) ??
    (typeof dropoff?.address === 'string' && dropoff.address.trim().length > 0
      ? dropoff.address
      : undefined);
  const updatedAt = data.updatedAt as {toDate?: () => Date} | string | Date | undefined;

  let normalizedUpdatedAt = new Date().toISOString();
  if (typeof updatedAt === 'string') {
    normalizedUpdatedAt = updatedAt;
  } else if (updatedAt instanceof Date) {
    normalizedUpdatedAt = updatedAt.toISOString();
  } else if (updatedAt?.toDate) {
    normalizedUpdatedAt = updatedAt.toDate().toISOString();
  }

  const rawNotes = normalizeText(data.notes);
  const packageNotes = normalizeText(packageData?.notes);
  const foodSummaryNotes = buildFoodOrderSummary(foodDetails);
  const notesParts = [rawNotes, packageNotes, foodSummaryNotes].filter((part): part is string => Boolean(part));
  const dedupedNotes = Array.from(new Set(notesParts));
  const normalizedNotes = dedupedNotes.length > 0 ? dedupedNotes.join('\n') : undefined;
  const customerName =
    normalizeText(data.customerName) ??
    normalizeText(foodDetails?.restaurantName) ??
    'Customer';

  return {
    id,
    customerName,
    pickupAddress: pickupAddressFromPayload ?? String(data.pickupAddress ?? 'Pickup address unavailable'),
    dropoffAddress: dropoffAddressFromPayload ?? String(data.dropoffAddress ?? 'Dropoff address unavailable'),
    pickupLocation,
    dropoffLocation,
    notes: normalizedNotes,
    etaMinutes: Number(data.etaMinutes ?? 20),
    status: normalizeStatus(String(data.status ?? 'open')),
    paymentStatus: normalizePaymentStatus(data.paymentStatus),
    photos: normalizePhotos(data.photos),
    pickupProof: normalizeProof(data.pickupProof),
    dropoffProof: normalizeProof(data.dropoffProof),
    pricing:
      data.pricing && typeof data.pricing === 'object'
        ? ({
            courierRate: Number((data.pricing as Record<string, unknown>).courierRate ?? 0),
            platformFee: Number((data.pricing as Record<string, unknown>).platformFee ?? 0),
            totalAmount: Number((data.pricing as Record<string, unknown>).totalAmount ?? 0),
          } as Job['pricing'])
        : undefined,
    courierSnapshot:
      data.courierSnapshot && typeof data.courierSnapshot === 'object'
        ? ({
            displayName: String((data.courierSnapshot as Record<string, unknown>).displayName ?? ''),
            transportMode: String((data.courierSnapshot as Record<string, unknown>).transportMode ?? ''),
          } as Job['courierSnapshot'])
        : undefined,
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

const STATUS_UPDATE_TIMEOUT_MS = 12_000;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

const shouldUseLocalFallback = (): boolean => runtimeConfig.envName !== 'prod';

const shouldUseDevEmulatorActiveJobsFeed = (): boolean =>
  runtimeConfig.envName === 'dev' && isFirebaseEmulatorEnabled();

type FirestoreJobDocRecord = {
  id: string;
  data: () => Record<string, unknown>;
};

const FEED_QUERY_STATUSES = [
  'open',
  'pending',
  'assigned',
  'accepted',
  'enroute_pickup',
  'arrived_pickup',
  'picked_up',
  'enroute_dropoff',
  'arrived_dropoff',
] as const;

const OFFER_TARGET_FIELDS = [
  'offeredToCourierUid',
  'offeredCourierUid',
  'offerCourierUid',
  'offerOwnerUid',
  'offerOwnerCourierUid',
] as const;

const OFFER_TARGET_ARRAY_FIELDS = [
  'offeredToCourierUids',
  'offeredCourierUids',
  'eligibleCourierUids',
  'offerCourierUids',
] as const;

const normalizedUid = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizeWorkModesForEligibility = (value: unknown): CourierWorkModes => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    packagesEnabled: toBoolean(record.packagesEnabled, true),
    foodEnabled: toBoolean(record.foodEnabled, true),
  };
};

const normalizeCapabilitiesForEligibility = (value: unknown): CourierCapabilities | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    canDeliverHot: toBoolean(record.canDeliverHot, false),
    canDeliverCold: toBoolean(record.canDeliverCold, false),
    canDeliverFrozen: toBoolean(record.canDeliverFrozen, false),
    canDeliverDrinks: toBoolean(record.canDeliverDrinks, false),
    canDeliverHeavy: toBoolean(record.canDeliverHeavy, false),
    canDeliverFurniture: toBoolean(record.canDeliverFurniture, false),
  };
};

const deriveCapabilitiesFromEquipment = (value: unknown): CourierCapabilities | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const equipmentRaw = value as Record<string, unknown>;
  const equipment = buildDefaultCourierEquipment();
  let sawEquipmentValue = false;
  for (const type of COURIER_EQUIPMENT_TYPES) {
    const itemRaw = equipmentRaw[type];
    if (!itemRaw || typeof itemRaw !== 'object') {
      continue;
    }
    const item = itemRaw as Record<string, unknown>;
    sawEquipmentValue = true;
    equipment[type] = {
      ...equipment[type],
      has: toBoolean(item.has, false),
      approved: toBoolean(item.approved, false),
      photoUrl: typeof item.photoUrl === 'string' ? item.photoUrl : undefined,
      approvedAt: typeof item.approvedAt === 'string' ? item.approvedAt : undefined,
      rejectedReason: typeof item.rejectedReason === 'string' ? item.rejectedReason : undefined,
    };
  }
  if (!sawEquipmentValue) {
    return null;
  }
  return deriveCourierCapabilities(equipment);
};

const parseCourierFeedEligibility = (rawUserData: Record<string, unknown>): CourierFeedEligibility => {
  const profileRaw =
    (rawUserData.courierProfileV1 as Record<string, unknown> | undefined) ??
    (rawUserData.courierProfile as Record<string, unknown> | undefined) ??
    {};
  const capabilities =
    normalizeCapabilitiesForEligibility(profileRaw.capabilities) ??
    deriveCapabilitiesFromEquipment(profileRaw.equipment) ??
    DEFAULT_COURIER_FEED_ELIGIBILITY.capabilities;

  return {
    workModes: normalizeWorkModesForEligibility(profileRaw.workModes),
    capabilities,
  };
};

const resolveCourierFeedEligibility = async (
  db: Firestore,
  session: AuthSession,
): Promise<CourierFeedEligibility> => {
  try {
    const userRef = doc(db, 'users', session.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return DEFAULT_COURIER_FEED_ELIGIBILITY;
    }
    const data = userSnap.data() as Record<string, unknown>;
    return parseCourierFeedEligibility(data);
  } catch {
    return DEFAULT_COURIER_FEED_ELIGIBILITY;
  }
};

const isCourierAssignedToJob = (
  raw: Record<string, unknown>,
  allowedCourierUids: ReadonlySet<string>,
): boolean => {
  const courierUid = normalizedUid(raw.courierUid);
  const courierId = normalizedUid(raw.courierId);
  return (
    (courierUid.length > 0 && allowedCourierUids.has(courierUid)) ||
    (courierId.length > 0 && allowedCourierUids.has(courierId))
  );
};

const openJobOfferSignals = (raw: Record<string, unknown>): string[] => {
  const signals: string[] = [];
  for (const field of OFFER_TARGET_FIELDS) {
    const value = normalizedUid(raw[field]);
    if (value.length > 0) {
      signals.push(value);
    }
  }

  for (const field of OFFER_TARGET_ARRAY_FIELDS) {
    const value = raw[field];
    if (!Array.isArray(value)) {
      continue;
    }
    for (const item of value) {
      const uid = normalizedUid(item);
      if (uid.length > 0) {
        signals.push(uid);
      }
    }
  }

  return signals;
};

const shouldIncludeOpenJobForCourier = (
  raw: Record<string, unknown>,
  allowedCourierUids: ReadonlySet<string>,
): boolean => {
  if (isCourierAssignedToJob(raw, allowedCourierUids)) {
    return true;
  }
  const signals = openJobOfferSignals(raw);
  if (signals.length === 0) {
    return true; // open + unoffered
  }
  return signals.some(uid => allowedCourierUids.has(uid)); // open + offered to this courier
};

const shouldIncludeJobInCourierFeed = (
  job: Job,
  raw: Record<string, unknown>,
  allowedCourierUids: ReadonlySet<string>,
  eligibility: CourierFeedEligibility,
): boolean => {
  if (job.status === 'open') {
    if (!shouldIncludeOpenJobForCourier(raw, allowedCourierUids)) {
      return false;
    }

    const mode = resolveCourierJobMode(raw);
    if (!isCourierEligibleForJobMode(mode, eligibility.workModes)) {
      return false;
    }

    const requirements = buildCapabilityRequirementsForRawJob(raw, job);
    if (missingCapabilityRequirements(eligibility.capabilities, requirements).length > 0) {
      return false;
    }
    return true;
  }
  const hasAssignment =
    normalizedUid(raw.courierUid).length > 0 || normalizedUid(raw.courierId).length > 0;
  if (!hasAssignment) {
    return true;
  }
  return isCourierAssignedToJob(raw, allowedCourierUids);
};

const maskAddress = (address: string): string => {
  const normalized = address.trim();
  const cityStateZipRegex = /([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/g;
  const cityStateZipMatches = [...normalized.matchAll(cityStateZipRegex)];
  if (cityStateZipMatches.length > 0) {
    const match = cityStateZipMatches[cityStateZipMatches.length - 1];
    return `${match[1].trim()}, ${match[2].trim()} ${match[3].trim()}`;
  }

  const parts = normalized
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const lower = part.toLowerCase();
      return lower !== 'usa' && lower !== 'united states' && lower !== 'united states of america';
    });

  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }

  return 'Approximate location';
};

const coarsenLocation = (location: Job['pickupLocation']): Job['pickupLocation'] | undefined => {
  if (!location) {
    return undefined;
  }
  return {
    latitude: Math.round(location.latitude * 100) / 100,
    longitude: Math.round(location.longitude * 100) / 100,
    label: 'Approximate location',
  };
};

const applyCourierFeedPrivacy = (
  job: Job,
  raw: Record<string, unknown>,
  allowedCourierUids: ReadonlySet<string>,
): Job => {
  const canSeeExactAddresses = job.status !== 'open' || isCourierAssignedToJob(raw, allowedCourierUids);
  if (canSeeExactAddresses) {
    return job;
  }

  return {
    ...job,
    customerName: 'Customer',
    pickupAddress: maskAddress(job.pickupAddress),
    dropoffAddress: maskAddress(job.dropoffAddress),
    pickupLocation: coarsenLocation(job.pickupLocation),
    dropoffLocation: coarsenLocation(job.dropoffLocation),
    notes: undefined,
  };
};

const buildQueryForSession = (db: Firestore, _session: AuthSession) => {
  const jobsRef = collection(db, 'jobs');
  if (shouldUseDevEmulatorActiveJobsFeed()) {
    // Dev emulator mode: show active jobs even if seeded assignment does not
    // match the signed-in courier UID yet.
    return query(
      jobsRef,
      where('status', 'in', [
        'open',
        'assigned',
        'enroute_pickup',
        'arrived_pickup',
        'picked_up',
        'enroute_dropoff',
        'arrived_dropoff',
        // legacy compatibility for dev emulator datasets
        'pending',
        'accepted',
        ]),
    );
  }
  return query(
    jobsRef,
    where('status', 'in', FEED_QUERY_STATUSES as unknown as string[]),
  );
};

const mapDocsToCourierFeedJobs = (
  docs: FirestoreJobDocRecord[],
  allowedCourierUids: ReadonlySet<string>,
  eligibility: CourierFeedEligibility,
): Job[] => {
  const byId = new Map<string, Job>();
  for (const doc of docs) {
    const raw = doc.data() as Record<string, unknown>;
    const mapped = mapFirestoreJob(doc.id, raw);
    if (!shouldIncludeJobInCourierFeed(mapped, raw, allowedCourierUids, eligibility)) {
      continue;
    }
    byId.set(doc.id, applyCourierFeedPrivacy(mapped, raw, allowedCourierUids));
  }
  return sortJobsByNewest(Array.from(byId.values()));
};

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
        queueByKey.set(key, {
          ...latest,
          attempts: latest.attempts + 1,
          lastError,
        });
        break;
      }

      // Drop non-network failures (permission/conflict/validation) so sync status can recover.
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
    const snapshot = await getDocs(buildQueryForSession(services.db, session));
    const feedEligibility = await resolveCourierFeedEligibility(services.db, session);
    let allowedCourierUids = new Set<string>([session.uid]);
    let jobs = mapDocsToCourierFeedJobs(readSnapshotDocs(snapshot), allowedCourierUids, feedEligibility);

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
        allowedCourierUids = new Set<string>([session.uid, ...aliasUids]);
        jobs = mapDocsToCourierFeedJobs(readSnapshotDocs(snapshot), allowedCourierUids, feedEligibility);
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
      const raw = snap.data() as Record<string, unknown>;
      const allowedCourierUids = new Set<string>([session.uid]);
      const mapped = mapFirestoreJob(snap.id, raw);
      const job = applyCourierFeedPrivacy(mapped, raw, allowedCourierUids);
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

/**
 * Attach proof (photo) to a job. Stores the proof in Firestore when available,
 * otherwise persists to local cache. Returns the updated Job object.
 */
export const attachProof = async (
  session: AuthSession,
  id: string,
  type: 'pickup' | 'dropoff',
  proof: {url: string; location?: {latitude: number; longitude: number}; accuracy?: number; timestamp?: string},
): Promise<Job> => {
  const localJob = await loadLocalJobById(id);
  if (!localJob) {
    throw new Error('Job not found.');
  }

  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      try {
        // If the proof payload is a data URL or local file URI, prefer uploading to Firebase Storage
        let proofToStore = proof;
        try {
          const storage = require('./firebase').getFirebaseStorage();
          if (storage && proof.url && typeof proof.url === 'string') {
            const isDataUrl = proof.url.startsWith('data:');
            const isFileUri = proof.url.startsWith('file:') || proof.url.startsWith('content:');
            if (isDataUrl || isFileUri) {
              // lazy-import storage helpers
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const {ref: storageRef, uploadString, uploadBytes, getDownloadURL} = require('firebase/storage');

              const ext = proof.url.match(/^data:(image\/[^;]+);/)?.[1].split('/')[1] ?? 'jpg';
              const filename = `jobs/${id}/${type}-${Date.now()}.${ext}`;
              const destRef = storageRef(storage, filename);

              if (isDataUrl) {
                // upload base64 data URL
                await uploadString(destRef, proof.url, 'data_url');
              } else {
                // file/content URI: fetch blob then upload
                try {
                  // react-native fetch supports file:// URIs
                  // eslint-disable-next-line no-undef
                  const resp = await fetch(proof.url);
                  const blob = await resp.blob();
                  await uploadBytes(destRef, blob as any);
                } catch (uploadErr) {
                  // fall back to not uploading
                  console.warn('[attachProof] storage upload failed, falling back to inline proof', uploadErr);
                }
              }

              try {
                const downloadUrl = await getDownloadURL(destRef);
                proofToStore = {...proof, url: downloadUrl};
              } catch (err) {
                console.warn('[attachProof] getDownloadURL failed, keeping inline proof');
              }
            }
          }
        } catch (err) {
          // storage not configured or upload failed; continue with inline proof
        }

        const ref = doc(services.db, 'jobs', id);
        await updateDoc(ref, {
          ...(type === 'pickup' ? {pickupProof: proofToStore} : {dropoffProof: proofToStore}),
          updatedAt: serverTimestamp(),
        } as Record<string, unknown>);

        const updatedSnap = await getDoc(ref);
        if (updatedSnap.exists()) {
          const mapped = mapFirestoreJob(updatedSnap.id, updatedSnap.data() as Record<string, unknown>);
          await upsertLocalJob(mapped);
          return mapped;
        }
      } catch (error) {
        if (shouldUseLocalFallback()) {
          logFirebaseFallback('attachProof', error);
        } else {
          throw buildFirebaseError('attachProof', error);
        }
      }
    }
  }

  // Local fallback: persist proof into local cache and return updated job.
  const updated: Job = {
    ...localJob,
    ...(type === 'pickup' ? {pickupProof: proof} : {dropoffProof: proof}),
    updatedAt: new Date().toISOString(),
  };
  await upsertLocalJob(updated);
  return updated;
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

const addCorrelationId = (
  result: JobStatusCommandResult,
  correlationId: string | null,
): JobStatusCommandResult => (correlationId ? {...result, correlationId} : result);

const PAYMENT_AUTH_REQUIRED_STATUSES: ReadonlySet<JobStatus> = new Set([
  'picked_up',
  'enroute_dropoff',
  'arrived_dropoff',
  'completed',
]);

const AUTHORIZED_PAYMENT_STATUSES: ReadonlySet<NonNullable<Job['paymentStatus']>> = new Set([
  'authorized',
  'captured',
  'paid',
]);

const hasAuthorizedPayment = (job: Job): boolean =>
  !job.paymentStatus || AUTHORIZED_PAYMENT_STATUSES.has(job.paymentStatus);

const requiresProofCapture = (job: Job): boolean => {
  if (!job.notes) {
    return false;
  }
  const notes = job.notes.toLowerCase();
  return notes.includes('proof') || notes.includes('photo') || notes.includes('signature');
};

const hasProofPayload = (proof: Job['pickupProof'] | Job['dropoffProof'] | undefined): boolean => {
  if (!proof) {
    return false;
  }
  return (
    typeof proof.url === 'string' &&
    proof.url.length > 0 &&
    Number.isFinite(proof.location.latitude) &&
    Number.isFinite(proof.location.longitude) &&
    Number.isFinite(proof.accuracy)
  );
};

const validateTransitionAgainstJob = (job: Job, nextStatus: JobStatus): JobStatusCommandResult | null => {
  if (job.status === nextStatus) {
    return buildCommandResultSuccess(job, nextStatus, true, 'Job status is already up to date.');
  }

  if (!canTransitionJobStatus(job.status, nextStatus)) {
    return buildCommandResultConflict(
      job,
      nextStatus,
      `${buildJobTransitionConflictMessage(job.status, nextStatus)} Refresh job state and retry.`,
    );
  }

  if (PAYMENT_AUTH_REQUIRED_STATUSES.has(nextStatus) && !hasAuthorizedPayment(job)) {
    return buildCommandResultConflict(
      job,
      nextStatus,
      'Payment is not authorized for this job yet. Wait for authorization before continuing.',
    );
  }

  if (nextStatus === 'picked_up' && requiresProofCapture(job) && !hasProofPayload(job.pickupProof)) {
    return buildCommandResultConflict(
      job,
      nextStatus,
      'Pickup proof is required before confirming pickup.',
    );
  }

  if (nextStatus === 'completed' && requiresProofCapture(job) && !hasProofPayload(job.dropoffProof)) {
    return buildCommandResultConflict(
      job,
      nextStatus,
      'Dropoff proof is required before completing delivery.',
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
        const transactionOutcome = await withTimeout(
          runTransaction(services.db, async transaction => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) {
              return {kind: 'missing' as const};
            }

            const remoteJob = mapFirestoreJob(snap.id, snap.data() as Record<string, unknown>);
            const validation = validateTransitionAgainstJob(remoteJob, nextStatus);
            if (validation?.kind === 'conflict') {
              return {kind: 'conflict' as const, job: remoteJob, message: validation.message};
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
          }),
          STATUS_UPDATE_TIMEOUT_MS,
          'updateJobStatus transaction',
        );

        if (transactionOutcome.kind === 'missing') {
          return buildCommandResultFatal(nextStatus, 'Job no longer exists. Refresh your jobs list and retry.');
        }

        if (transactionOutcome.kind === 'conflict') {
          await upsertLocalJob(transactionOutcome.job);
          return buildCommandResultConflict(
            transactionOutcome.job,
            nextStatus,
            transactionOutcome.message,
          );
        }

        if (transactionOutcome.kind === 'idempotent') {
          await upsertLocalJob(transactionOutcome.job);
          await dequeueStatusUpdate(session, id);
          return buildCommandResultSuccess(transactionOutcome.job, nextStatus, true, 'Job status is already up to date.');
        }

        await dequeueStatusUpdate(session, id);
        void flushQueuedStatusUpdates(session, services.db);

        const updated = await withTimeout(
          getDoc(ref),
          STATUS_UPDATE_TIMEOUT_MS,
          'updateJobStatus readback',
        );
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

const runStatusCommand = async (
  session: AuthSession,
  id: string,
  nextStatus: JobStatus,
): Promise<JobStatusCommandResult> => updateJobStatus(session, id, nextStatus);

const generateCorrelationId = (): string =>
  `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getCallableErrorCode = (error: unknown): string => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return '';
  }
  return String((error as {code?: unknown}).code ?? '').trim().toLowerCase();
};

const getCallableErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const shouldFallbackCallableStatusCommand = (error: unknown): boolean => {
  const code = getCallableErrorCode(error);
  const message = getCallableErrorMessage(error).toLowerCase();

  if (code === 'functions/unimplemented') {
    return true;
  }

  if (
    code === 'functions/not-found' &&
    (message === 'not found' ||
      message.includes('function') ||
      message.includes('not found') ||
      message.includes('not-found'))
  ) {
    return true;
  }

  return (
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded' ||
    code === 'functions/internal' ||
    code === 'functions/cancelled' ||
    isLikelyConnectivityError(error)
  );
};

const mapCallableStatusCommandResult = async (
  session: AuthSession,
  id: string,
  requestedStatus: JobStatus,
  commandName: CallableCommandName,
  payload: unknown,
): Promise<JobStatusCommandResult> => {
  const data = payload && typeof payload === 'object' ? (payload as CommandJobStatusCallableResponse) : null;
  if (!data || !data.kind) {
    return buildCommandResultFatal(requestedStatus, `${commandName} returned an invalid payload.`);
  }

  const correlationId = typeof data.correlationId === 'string' ? data.correlationId : null;
  const message =
    typeof data.message === 'string' ? data.message : data.message === null ? null : `${commandName} failed.`;
  const rawJob = data.job && typeof data.job === 'object' ? data.job : null;
  const mappedJob = rawJob ? mapFirestoreJob(typeof rawJob.id === 'string' ? rawJob.id : id, rawJob) : null;

  if (mappedJob) {
    await upsertLocalJob(mappedJob);
  }

  if (data.kind === 'success') {
    if (!mappedJob) {
      return addCorrelationId(
        buildCommandResultFatal(requestedStatus, `${commandName} succeeded without a job payload.`),
        correlationId,
      );
    }
    await dequeueStatusUpdate(session, id);
    return addCorrelationId(
      buildCommandResultSuccess(mappedJob, requestedStatus, Boolean(data.idempotent), message),
      correlationId,
    );
  }

  if (data.kind === 'conflict') {
    if (!mappedJob) {
      return addCorrelationId(
        buildCommandResultFatal(requestedStatus, message ?? `Unable to complete ${commandName}.`),
        correlationId,
      );
    }
    return addCorrelationId(
      buildCommandResultConflict(mappedJob, requestedStatus, message ?? `Unable to complete ${commandName}.`),
      correlationId,
    );
  }

  if (data.kind === 'retryable_error') {
    if (!mappedJob) {
      const localJob = await loadLocalJobById(id);
      return addCorrelationId(
        buildCommandResultFatal(requestedStatus, message ?? `Unable to complete ${commandName}.`, localJob),
        correlationId,
      );
    }
    return addCorrelationId(
      buildCommandResultRetryable(mappedJob, requestedStatus, message ?? `Unable to complete ${commandName}.`),
      correlationId,
    );
  }

  return addCorrelationId(
    buildCommandResultFatal(requestedStatus, message ?? `Unable to complete ${commandName}.`, mappedJob),
    correlationId,
  );
};

const callStatusCommand = async (
  session: AuthSession,
  id: string,
  requestedStatus: JobStatus,
  commandName: CallableCommandName,
): Promise<JobStatusCommandResult | null> => {
  const functions = getFirebaseFunctions();
  if (!functions) {
    return null;
  }

  const callable = httpsCallable<CommandJobStatusCallableRequest, CommandJobStatusCallableResponse>(
    functions,
    commandName,
  );

  try {
    const response = await withTimeout(
      callable({
        jobId: id,
        correlationId: generateCorrelationId(),
      }),
      STATUS_UPDATE_TIMEOUT_MS,
      `${commandName} callable`,
    );
    return mapCallableStatusCommandResult(session, id, requestedStatus, commandName, response.data);
  } catch (error) {
    if (shouldFallbackCallableStatusCommand(error)) {
      return null;
    }

    const code = getCallableErrorCode(error);
    const message = getCallableErrorMessage(error);
    const latestJob = await getJobById(session, id);

    if (code === 'functions/failed-precondition' || code === 'functions/permission-denied') {
      if (latestJob) {
        return buildCommandResultConflict(latestJob, requestedStatus, message);
      }
      return buildCommandResultFatal(requestedStatus, message);
    }

    if (code === 'functions/not-found') {
      return buildCommandResultFatal(requestedStatus, message, latestJob);
    }

    return buildCommandResultFatal(requestedStatus, message, latestJob);
  }
};

const runCommandWithCallableFallback = async (
  session: AuthSession,
  id: string,
  requestedStatus: JobStatus,
  commandName: CallableCommandName,
): Promise<JobStatusCommandResult> => {
  if (!featureFlagsService.isEnabled('jobStatusActions')) {
    return buildCommandResultFatal(requestedStatus, 'Status updates are temporarily disabled by rollout controls.');
  }

  if (isFirebaseReady()) {
    const callableResult = await callStatusCommand(session, id, requestedStatus, commandName);
    if (callableResult) {
      return callableResult;
    }
  }

  return runStatusCommand(session, id, requestedStatus);
};

export const commandAcceptJob = async (
  session: AuthSession,
  id: string,
): Promise<JobStatusCommandResult> =>
  runCommandWithCallableFallback(session, id, 'assigned', 'commandAcceptJob');

export const commandMarkArrivedPickup = async (
  session: AuthSession,
  id: string,
): Promise<JobStatusCommandResult> =>
  runCommandWithCallableFallback(session, id, 'arrived_pickup', 'commandMarkArrivedPickup');

export const commandStartPickup = async (
  session: AuthSession,
  id: string,
): Promise<JobStatusCommandResult> =>
  runCommandWithCallableFallback(session, id, 'enroute_pickup', 'commandStartPickup');

export const commandConfirmPickup = async (
  session: AuthSession,
  id: string,
): Promise<JobStatusCommandResult> =>
  runCommandWithCallableFallback(session, id, 'picked_up', 'commandConfirmPickup');

export const commandStartDropoff = async (
  session: AuthSession,
  id: string,
): Promise<JobStatusCommandResult> =>
  runCommandWithCallableFallback(session, id, 'enroute_dropoff', 'commandStartDropoff');

export const commandCompleteDelivery = async (
  session: AuthSession,
  id: string,
): Promise<JobStatusCommandResult> =>
  runCommandWithCallableFallback(session, id, 'completed', 'commandCompleteDelivery');

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
  let feedEligibility: CourierFeedEligibility = DEFAULT_COURIER_FEED_ELIGIBILITY;
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

  const refreshFeedEligibility = async (): Promise<void> => {
    feedEligibility = await resolveCourierFeedEligibility(services.db, session);
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
      void refreshFeedEligibility();
      detachSnapshot = onSnapshot(
        buildQueryForSession(services.db, session),
        {includeMetadataChanges: true},
        snapshot => {
          const jobs = mapDocsToCourierFeedJobs(
            readSnapshotDocs(snapshot),
            new Set<string>([session.uid]),
            feedEligibility,
          );
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

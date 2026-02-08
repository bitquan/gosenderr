import { randomBytes } from 'crypto';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  SENDERRPLACE_AVAILABILITY_REASON_MESSAGES,
  SENDERRPLACE_COLLECTIONS,
  SENDERRPLACE_ROLES,
  SenderrplaceAvailabilityReason,
  SenderrplaceJobType,
  resolveUserRoles,
} from './contracts';

interface LatLng {
  lat: number;
  lng: number;
}

interface EvaluateBookingAvailabilityRequest {
  pickup: LatLng;
  dropoff: LatLng;
  jobType: SenderrplaceJobType;
  scheduledFor?: string;
  requiredEquipment?: string[];
  requiresCooler?: boolean;
  requiresHotBag?: boolean;
  requiresDrinkCarrier?: boolean;
  vehicleRequirement?: string;
  serviceRadiusMiles?: number;
}

interface CreateBookingHoldRequest extends EvaluateBookingAvailabilityRequest {
  holdMinutes?: number;
}

interface ReleaseBookingHoldRequest {
  holdToken: string;
  reason?: string;
}

interface FinalizeBookingWithHoldRequest {
  holdToken: string;
  bookingId: string;
}

type CourierProfile = {
  isOnline?: unknown;
  status?: unknown;
  serviceRadius?: unknown;
  currentLocation?: unknown;
  workModes?: unknown;
  equipment?: unknown;
  vehicleType?: unknown;
  maxConcurrentJobs?: unknown;
};

type RejectionStats = {
  locationUnavailable: number;
  outOfRadius: number;
  workModeDisabled: number;
  equipmentUnavailable: number;
  vehicleUnavailable: number;
  capacityReached: number;
};

const ACTIVE_JOB_STATUSES = new Set([
  'assigned',
  'accepted',
  'picked_up',
  'in_progress',
  'out_for_delivery',
]);

const APPROVED_COURIER_STATUSES = new Set([
  'approved',
  'active',
]);

const DEFAULT_SERVICE_RADIUS_MILES = 15;
const DEFAULT_MAX_CONCURRENT_JOBS = 2;
const MAX_ACTIVE_JOBS_SCAN = 40;
const HOLD_MINUTES_DEFAULT = 8;
const HOLD_MINUTES_MIN = 2;
const HOLD_MINUTES_MAX = 30;
const BOOKING_WINDOW_PAST_GRACE_MINUTES = 10;
const BOOKING_WINDOW_MAX_DAYS = 14;

function getServerTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function timestampToIso(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toISOString();
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function assertSignedIn(context: functions.https.CallableContext): string {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  return context.auth.uid;
}

function assertString(value: unknown, fieldName: string, maxLen = 200): string {
  if (typeof value !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
  }
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is required`);
  }
  if (trimmed.length > maxLen) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is too long`);
  }
  return trimmed;
}

function assertLatLng(value: unknown, fieldName: string): LatLng {
  if (!value || typeof value !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is required`);
  }
  const candidate = value as Record<string, unknown>;
  const lat = candidate.lat;
  const lng = candidate.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must include numeric lat/lng`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} has invalid lat/lng bounds`);
  }
  return { lat, lng };
}

function normalizeJobType(value: unknown): SenderrplaceJobType {
  if (value === 'food' || value === 'package') {
    return value;
  }
  throw new functions.https.HttpsError('invalid-argument', 'jobType must be `food` or `package`');
}

function toMiles(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SERVICE_RADIUS_MILES;
  }
  if (value < 0.5) {
    return 0.5;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.trunc(value);
}

function normalizeVehicleRequirement(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'any') {
    return null;
  }
  return normalized;
}

function normalizeEquipmentKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'hotbag' || normalized === 'hot_bag') {
    return 'hot_bag';
  }
  if (normalized === 'insulatedbag' || normalized === 'insulated_bag') {
    return 'insulated_bag';
  }
  if (normalized === 'drinkcarrier' || normalized === 'drink_carrier') {
    return 'drink_carrier';
  }
  return normalized;
}

function normalizeRequiredEquipment(
  data: EvaluateBookingAvailabilityRequest,
): string[] {
  const equipment = new Set<string>();
  for (const raw of data.requiredEquipment || []) {
    if (typeof raw === 'string' && raw.trim()) {
      equipment.add(normalizeEquipmentKey(raw));
    }
  }
  if (data.requiresCooler) {
    equipment.add('cooler');
  }
  if (data.requiresHotBag) {
    equipment.add('hot_bag');
  }
  if (data.requiresDrinkCarrier) {
    equipment.add('drink_carrier');
  }
  return Array.from(equipment).sort();
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusMiles * c;
}

export function isWithinBookingWindow(
  requestedStartMs: number,
  nowMs = Date.now(),
): boolean {
  const minMs = nowMs - (BOOKING_WINDOW_PAST_GRACE_MINUTES * 60 * 1000);
  const maxMs = nowMs + (BOOKING_WINDOW_MAX_DAYS * 24 * 60 * 60 * 1000);
  return requestedStartMs >= minMs && requestedStartMs <= maxMs;
}

export function pickUnavailableReason(
  onlineCourierCount: number,
  stats: RejectionStats,
): SenderrplaceAvailabilityReason {
  if (onlineCourierCount <= 0) {
    return 'NO_ONLINE_COURIER';
  }
  if (stats.capacityReached > 0) {
    return 'COURIER_CAPACITY_REACHED';
  }
  if (stats.outOfRadius > 0) {
    return 'OUT_OF_SERVICE_RADIUS';
  }
  if (stats.workModeDisabled > 0) {
    return 'WORK_MODE_DISABLED';
  }
  if (stats.equipmentUnavailable > 0) {
    return 'REQUIRED_EQUIPMENT_UNAVAILABLE';
  }
  if (stats.vehicleUnavailable > 0) {
    return 'VEHICLE_REQUIREMENT_UNAVAILABLE';
  }
  if (stats.locationUnavailable > 0) {
    return 'COURIER_LOCATION_UNAVAILABLE';
  }
  return 'NO_ELIGIBLE_COURIER';
}

async function isAdminUid(uid: string): Promise<boolean> {
  const userRef = admin.firestore().collection(SENDERRPLACE_COLLECTIONS.users).doc(uid);
  const snap = await userRef.get();
  const roles = resolveUserRoles((snap.data() || {}) as Record<string, unknown>);
  return roles.includes(SENDERRPLACE_ROLES.admin);
}

async function countActiveCourierJobs(courierId: string): Promise<number> {
  const snapshot = await admin
    .firestore()
    .collection(SENDERRPLACE_COLLECTIONS.deliveryJobs)
    .where('courierId', '==', courierId)
    .limit(MAX_ACTIVE_JOBS_SCAN)
    .get();

  let activeCount = 0;
  for (const docSnap of snapshot.docs) {
    const status = docSnap.data().status;
    if (typeof status === 'string' && ACTIVE_JOB_STATUSES.has(status)) {
      activeCount += 1;
    }
  }
  return activeCount;
}

function hasRequiredEquipment(
  equipmentData: Record<string, unknown>,
  requiredEquipment: string[],
): boolean {
  for (const key of requiredEquipment) {
    const item = equipmentData[key] as Record<string, unknown> | undefined;
    const approved = item?.approved === true;
    if (approved) {
      continue;
    }

    // `hot_bag` and `insulated_bag` are considered equivalent for food thermal protection.
    if (key === 'hot_bag') {
      const insulated = equipmentData.insulated_bag as Record<string, unknown> | undefined;
      if (insulated?.approved === true) {
        continue;
      }
    }
    if (key === 'insulated_bag') {
      const hotBag = equipmentData.hot_bag as Record<string, unknown> | undefined;
      if (hotBag?.approved === true) {
        continue;
      }
    }

    return false;
  }
  return true;
}

async function evaluateAvailability(
  request: EvaluateBookingAvailabilityRequest,
) {
  const pickup = assertLatLng(request.pickup, 'pickup');
  const dropoff = assertLatLng(request.dropoff, 'dropoff');
  const jobType = normalizeJobType(request.jobType);
  const requestedStartMs = request.scheduledFor ?
    Date.parse(assertString(request.scheduledFor, 'scheduledFor', 64)) :
    Date.now();
  if (!Number.isFinite(requestedStartMs)) {
    throw new functions.https.HttpsError('invalid-argument', 'scheduledFor must be a valid ISO date');
  }

  const requestedWindowSupported = isWithinBookingWindow(requestedStartMs);
  const requestedEndMs = requestedStartMs + (2 * 60 * 60 * 1000);
  const requiredEquipment = normalizeRequiredEquipment(request);
  const vehicleRequirement = normalizeVehicleRequirement(request.vehicleRequirement);
  const requestedRadiusMiles = toMiles(request.serviceRadiusMiles);

  if (!requestedWindowSupported) {
    const reasonCode: SenderrplaceAvailabilityReason = 'OUTSIDE_BOOKING_WINDOW';
    return {
      available: false,
      reasonCode,
      safeMessage: SENDERRPLACE_AVAILABILITY_REASON_MESSAGES[reasonCode],
      evaluatedAt: new Date().toISOString(),
      requestedWindowStartAt: new Date(requestedStartMs).toISOString(),
      requestedWindowEndAt: new Date(requestedEndMs).toISOString(),
      requestedRadiusMiles,
      eligibleCourierCount: 0,
      onlineCourierCount: 0,
      eligibleCourierIds: [] as string[],
      holdRequired: true,
      requestEcho: {
        pickup,
        dropoff,
        jobType,
        requiredEquipment,
        vehicleRequirement,
      },
    };
  }

  const onlineCouriersSnapshot = await admin
    .firestore()
    .collection(SENDERRPLACE_COLLECTIONS.users)
    .where('role', '==', 'courier')
    .where('courierProfile.isOnline', '==', true)
    .get();

  const stats: RejectionStats = {
    locationUnavailable: 0,
    outOfRadius: 0,
    workModeDisabled: 0,
    equipmentUnavailable: 0,
    vehicleUnavailable: 0,
    capacityReached: 0,
  };

  const eligibleCourierIds: string[] = [];
  const onlineCourierCount = onlineCouriersSnapshot.size;

  for (const courierSnap of onlineCouriersSnapshot.docs) {
    const courierData = courierSnap.data() as Record<string, unknown>;
    const courierProfile = (courierData.courierProfile || {}) as CourierProfile;
    const courierStatus = typeof courierProfile.status === 'string' ?
      courierProfile.status.toLowerCase() :
      null;
    if (courierStatus && !APPROVED_COURIER_STATUSES.has(courierStatus)) {
      stats.workModeDisabled += 1;
      continue;
    }

    const currentLocation = courierProfile.currentLocation as Record<string, unknown> | undefined;
    const currentLat = currentLocation?.lat;
    const currentLng = currentLocation?.lng;
    if (typeof currentLat !== 'number' || typeof currentLng !== 'number') {
      stats.locationUnavailable += 1;
      continue;
    }

    const courierRadiusMiles = toMiles(courierProfile.serviceRadius);
    const effectiveRadiusMiles = Math.min(courierRadiusMiles, requestedRadiusMiles);
    const pickupDistance = haversineMiles(
      { lat: currentLat, lng: currentLng },
      pickup,
    );
    if (pickupDistance > effectiveRadiusMiles) {
      stats.outOfRadius += 1;
      continue;
    }

    const workModes = (courierProfile.workModes || {}) as Record<string, unknown>;
    const acceptsJobType = jobType === 'food' ?
      workModes.foodEnabled !== false :
      workModes.packagesEnabled !== false;
    if (!acceptsJobType) {
      stats.workModeDisabled += 1;
      continue;
    }

    const courierVehicleType = typeof courierProfile.vehicleType === 'string' ?
      courierProfile.vehicleType.trim().toLowerCase() :
      null;
    if (vehicleRequirement && courierVehicleType !== vehicleRequirement) {
      stats.vehicleUnavailable += 1;
      continue;
    }

    const equipment = (courierProfile.equipment || {}) as Record<string, unknown>;
    if (!hasRequiredEquipment(equipment, requiredEquipment)) {
      stats.equipmentUnavailable += 1;
      continue;
    }

    const maxConcurrentJobs = Math.max(
      1,
      Math.min(10, toInt(courierProfile.maxConcurrentJobs, DEFAULT_MAX_CONCURRENT_JOBS)),
    );
    const activeJobs = await countActiveCourierJobs(courierSnap.id);
    if (activeJobs >= maxConcurrentJobs) {
      stats.capacityReached += 1;
      continue;
    }

    eligibleCourierIds.push(courierSnap.id);
  }

  const available = eligibleCourierIds.length > 0;
  const reasonCode = available ?
    'AVAILABLE' as SenderrplaceAvailabilityReason :
    pickUnavailableReason(onlineCourierCount, stats);

  return {
    available,
    reasonCode,
    safeMessage: SENDERRPLACE_AVAILABILITY_REASON_MESSAGES[reasonCode],
    evaluatedAt: new Date().toISOString(),
    requestedWindowStartAt: new Date(requestedStartMs).toISOString(),
    requestedWindowEndAt: new Date(requestedEndMs).toISOString(),
    requestedRadiusMiles,
    eligibleCourierCount: eligibleCourierIds.length,
    onlineCourierCount,
    eligibleCourierIds,
    holdRequired: true,
    requestEcho: {
      pickup,
      dropoff,
      jobType,
      requiredEquipment,
      vehicleRequirement,
    },
  };
}

function buildHoldToken(): string {
  return `hold_${randomBytes(12).toString('hex')}`;
}

async function loadHoldOrThrow(holdToken: string) {
  const holdRef = admin.firestore().collection(SENDERRPLACE_COLLECTIONS.bookingHolds).doc(holdToken);
  const holdSnap = await holdRef.get();
  if (!holdSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'booking hold not found');
  }
  const holdData = (holdSnap.data() || {}) as Record<string, unknown>;
  return { holdRef, holdSnap, holdData };
}

function isHoldExpired(holdData: Record<string, unknown>): boolean {
  const expiresAt = holdData.expiresAt as admin.firestore.Timestamp | undefined;
  if (!expiresAt) {
    return true;
  }
  return expiresAt.toMillis() <= Date.now();
}

async function evaluateSenderrplaceAvailabilityHandler(
  data: EvaluateBookingAvailabilityRequest,
  context: functions.https.CallableContext,
) {
  assertSignedIn(context);
  const decision = await evaluateAvailability(data);
  return decision;
}

async function createSenderrplaceBookingHoldHandler(
  data: CreateBookingHoldRequest,
  context: functions.https.CallableContext,
) {
  const uid = assertSignedIn(context);
  const decision = await evaluateAvailability(data);

  if (!decision.available) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      decision.safeMessage,
      {
        reasonCode: decision.reasonCode,
        onlineCourierCount: decision.onlineCourierCount,
        eligibleCourierCount: decision.eligibleCourierCount,
      },
    );
  }

  const holdMinutesRaw = data.holdMinutes ?? HOLD_MINUTES_DEFAULT;
  if (!Number.isInteger(holdMinutesRaw) || holdMinutesRaw < HOLD_MINUTES_MIN || holdMinutesRaw > HOLD_MINUTES_MAX) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `holdMinutes must be an integer between ${HOLD_MINUTES_MIN} and ${HOLD_MINUTES_MAX}`,
    );
  }

  const holdToken = buildHoldToken();
  const holdRef = admin.firestore().collection(SENDERRPLACE_COLLECTIONS.bookingHolds).doc(holdToken);
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + (holdMinutesRaw * 60 * 1000));

  await holdRef.set({
    holdToken,
    status: 'active',
    createdBy: uid,
    createdAt: getServerTimestamp(),
    updatedAt: getServerTimestamp(),
    expiresAt,
    availabilitySnapshot: {
      reasonCode: decision.reasonCode,
      safeMessage: decision.safeMessage,
      eligibleCourierCount: decision.eligibleCourierCount,
      onlineCourierCount: decision.onlineCourierCount,
      eligibleCourierIds: decision.eligibleCourierIds.slice(0, 20),
      requestEcho: decision.requestEcho,
      evaluatedAt: decision.evaluatedAt,
      requestedWindowStartAt: decision.requestedWindowStartAt,
      requestedWindowEndAt: decision.requestedWindowEndAt,
    },
  }, { merge: false });

  return {
    success: true,
    holdToken,
    status: 'active',
    holdRequired: true,
    expiresAt: timestampToIso(expiresAt),
    eligibleCourierCount: decision.eligibleCourierCount,
  };
}

async function releaseSenderrplaceBookingHoldHandler(
  data: ReleaseBookingHoldRequest,
  context: functions.https.CallableContext,
) {
  const uid = assertSignedIn(context);
  const holdToken = assertString(data.holdToken, 'holdToken', 80);
  const reason = data.reason ? assertString(data.reason, 'reason', 240) : 'released_by_client';
  const { holdRef, holdData } = await loadHoldOrThrow(holdToken);

  const ownerId = typeof holdData.createdBy === 'string' ? holdData.createdBy : null;
  const isAdmin = await isAdminUid(uid);
  if (!isAdmin && ownerId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Only hold owner or admin can release this hold');
  }

  const status = typeof holdData.status === 'string' ? holdData.status : 'unknown';
  if (status !== 'active') {
    return { success: true, holdToken, status, alreadyFinalized: true };
  }

  if (isHoldExpired(holdData)) {
    await holdRef.set({
      status: 'expired',
      expiredAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
      releaseReason: 'timeout',
    }, { merge: true });
    return { success: true, holdToken, status: 'expired' };
  }

  await holdRef.set({
    status: 'released',
    releasedAt: getServerTimestamp(),
    releasedBy: uid,
    releaseReason: reason,
    updatedAt: getServerTimestamp(),
  }, { merge: true });

  return { success: true, holdToken, status: 'released' };
}

async function finalizeSenderrplaceBookingWithHoldHandler(
  data: FinalizeBookingWithHoldRequest,
  context: functions.https.CallableContext,
) {
  const uid = assertSignedIn(context);
  const holdToken = assertString(data.holdToken, 'holdToken', 80);
  const bookingId = assertString(data.bookingId, 'bookingId', 120);
  const { holdRef, holdData } = await loadHoldOrThrow(holdToken);

  const ownerId = typeof holdData.createdBy === 'string' ? holdData.createdBy : null;
  const isAdmin = await isAdminUid(uid);
  if (!isAdmin && ownerId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Only hold owner or admin can finalize this hold');
  }

  const status = typeof holdData.status === 'string' ? holdData.status : 'unknown';
  if (status !== 'active') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `booking hold is ${status}`,
      { holdToken, status },
    );
  }

  if (isHoldExpired(holdData)) {
    await holdRef.set({
      status: 'expired',
      expiredAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
      releaseReason: 'timeout',
    }, { merge: true });
    throw new functions.https.HttpsError(
      'failed-precondition',
      'booking hold expired',
      { holdToken, status: 'expired' },
    );
  }

  await holdRef.set({
    status: 'consumed',
    consumedAt: getServerTimestamp(),
    consumedBy: uid,
    bookingId,
    updatedAt: getServerTimestamp(),
  }, { merge: true });

  return { success: true, holdToken, status: 'consumed', bookingId };
}

export const evaluateSenderrplaceAvailability = functions.https.onCall(evaluateSenderrplaceAvailabilityHandler);
export const createSenderrplaceBookingHold = functions.https.onCall(createSenderrplaceBookingHoldHandler);
export const releaseSenderrplaceBookingHold = functions.https.onCall(releaseSenderrplaceBookingHoldHandler);
export const finalizeSenderrplaceBookingWithHold = functions.https.onCall(finalizeSenderrplaceBookingWithHoldHandler);

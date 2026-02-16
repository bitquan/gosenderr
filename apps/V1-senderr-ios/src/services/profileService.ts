import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';

import {getFirebaseServices, isFirebaseReady} from './firebase';
import type {
  CourierProfileLoadResult,
  CourierProfileSaveResult,
  CourierProfileValidationErrors,
} from './ports/profilePort';
import type {AuthSession} from '../types/auth';
import {
  COURIER_PROFILE_SCHEMA_VERSION,
  COURIER_DEFAULT_SERVICE_RADIUS_MILES,
  COURIER_EQUIPMENT_TYPES,
  COURIER_MAX_SERVICE_RADIUS_MILES,
  COURIER_MIN_SERVICE_RADIUS_MILES,
  buildDefaultCourierDocuments,
  buildDefaultCourierEquipment,
  deriveCourierCapabilities,
  type CourierDocument,
  type CourierDocumentStatus,
  type CourierDocumentType,
  type CourierEquipment,
  type CourierEquipmentItem,
  type CourierNotificationPreferences,
  type CourierAvailability,
  type CourierOptionalFee,
  type CourierPayoutMode,
  type CourierProfile,
  type CourierProfileDraft,
  type CourierProfileStatus,
  type CourierRateCards,
  type CourierStripeState,
  type CourierVehicleMetadata,
  type CourierWorkModes,
} from '../types/profile';

const PROFILE_CACHE_PREFIX = '@senderr/profile/v1/';

const PACKAGE_BASE_FARE_MIN = 3;
const PACKAGE_PER_MILE_MIN = 0.5;
const PACKAGE_PER_MINUTE_MIN = 0.1;
const FOOD_BASE_FARE_MIN = 2.5;
const FOOD_PER_MILE_MIN = 0.75;
const FOOD_WAIT_PAY_MIN = 0.15;

const DEFAULT_RATE_CARDS: CourierRateCards = {
  packages: {
    baseFare: PACKAGE_BASE_FARE_MIN,
    perMile: 1.2,
    perMinute: 0.25,
    optionalFees: [],
  },
  food: {
    baseFare: FOOD_BASE_FARE_MIN,
    perMile: 1.5,
    restaurantWaitPay: FOOD_WAIT_PAY_MIN,
    optionalFees: [],
  },
};

const DEFAULT_WORK_MODES: CourierWorkModes = {
  packagesEnabled: true,
  foodEnabled: true,
};

const DEFAULT_NOTIFICATION_PREFS: CourierNotificationPreferences = {
  jobOffers: true,
  payoutUpdates: true,
  reminders: true,
};

const DEFAULT_STRIPE_STATE: CourierStripeState = {
  connectAccountId: '',
  accountStatus: '',
  chargesEnabled: false,
  payoutsEnabled: false,
  requirementsDue: [],
  requirementsPastDue: [],
};
const DEFAULT_PAYOUT_MODE: CourierPayoutMode = 'stripe_connect';

const DEFAULT_STATS = {
  todayJobs: 0,
  completedJobs: 0,
} as const;

type RawOptionalFee = {
  name?: unknown;
  amount?: unknown;
};

type RawPackagesRateCard = {
  baseFare?: unknown;
  perMile?: unknown;
  perMinute?: unknown;
  optionalFees?: unknown;
};

type RawFoodRateCard = {
  baseFare?: unknown;
  perMile?: unknown;
  restaurantWaitPay?: unknown;
  optionalFees?: unknown;
};

type RawCourierProfileV1 = {
  version?: unknown;
  fullName?: unknown;
  profilePhotoUrl?: unknown;
  contact?: {
    email?: unknown;
    phoneNumber?: unknown;
  };
  status?: unknown;
  rejectionReason?: unknown;
  availability?: unknown;
  isOnline?: unknown;
  online?: unknown;
  lastOnlineAt?: unknown;
  serviceRadius?: unknown;
  serviceRadiusMiles?: unknown;
  taxState?: unknown;
  workModes?: {
    packagesEnabled?: unknown;
    foodEnabled?: unknown;
  };
  notificationPrefs?: {
    jobOffers?: unknown;
    payoutUpdates?: unknown;
    reminders?: unknown;
  };
  vehicle?: {
    makeModel?: unknown;
    plateNumber?: unknown;
    color?: unknown;
  };
  settings?: {
    acceptsNewJobs?: unknown;
    autoStartTracking?: unknown;
  };
  rateCards?: {
    packages?: RawPackagesRateCard;
    food?: RawFoodRateCard;
  };
  packageRateCard?: RawPackagesRateCard;
  foodRateCard?: RawFoodRateCard;
  documents?: unknown;
  equipment?: unknown;
  capabilities?: unknown;
  payoutMode?: unknown;
  courierPayoutMode?: unknown;
  externalPayoutProvider?: unknown;
  externalPayoutHandle?: unknown;
  stripe?: {
    connectAccountId?: unknown;
    accountStatus?: unknown;
    chargesEnabled?: unknown;
    payoutsEnabled?: unknown;
    requirementsDue?: unknown;
    requirementsPastDue?: unknown;
  };
  stripeConnectAccountId?: unknown;
  stripeAccountId?: unknown;
  stripeAccountStatus?: unknown;
  stripeChargesEnabled?: unknown;
  stripePayoutsEnabled?: unknown;
  stripeRequirementsDue?: unknown;
  stripeRequirementsPastDue?: unknown;
  stats?: {
    todayJobs?: unknown;
    completedJobs?: unknown;
  };
  todayJobs?: unknown;
  completedJobs?: unknown;
  updatedAt?: unknown;
};

const profileCacheKey = (uid: string): string => `${PROFILE_CACHE_PREFIX}${uid}`;

const roundMoney = (value: number): number => Number(value.toFixed(2));

const formatRate = (value: number): string => value.toFixed(2);

const coerceString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value;
};

const coerceBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};

const parseNumeric = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const parseRateFromUnknown = (value: unknown, fallback: number, minValue: number): number => {
  const parsed = parseNumeric(value);
  if (parsed === null) {
    return fallback;
  }
  return roundMoney(Math.max(parsed, minValue));
};

const parseRateFromDraft = (value: string, fallback: number, minValue: number): number => {
  const parsed = parseNumeric(value);
  if (parsed === null) {
    return fallback;
  }
  return roundMoney(Math.max(parsed, minValue));
};

const normalizeStatus = (value: unknown): CourierProfileStatus => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'pending') return 'pending';
  if (normalized === 'pending_docs') return 'pending_docs';
  if (normalized === 'pending_review') return 'pending_review';
  if (normalized === 'approved') return 'approved';
  if (normalized === 'active') return 'active';
  if (normalized === 'rejected') return 'rejected';
  if (normalized === 'suspended') return 'suspended';
  if (normalized === 'banned') return 'banned';
  return 'pending';
};

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => String(item ?? '').trim())
    .filter(item => item.length > 0);
};

const parseIsoString = (value: unknown): string | undefined => {
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

const parseServiceRadiusMiles = (value: unknown): number => {
  const parsed = parseNumeric(value);
  if (parsed === null) {
    return COURIER_DEFAULT_SERVICE_RADIUS_MILES;
  }
  return Math.max(
    COURIER_MIN_SERVICE_RADIUS_MILES,
    Math.min(COURIER_MAX_SERVICE_RADIUS_MILES, roundMoney(parsed)),
  );
};

const normalizeWorkModes = (value: unknown): CourierWorkModes => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    packagesEnabled: coerceBoolean(record.packagesEnabled, DEFAULT_WORK_MODES.packagesEnabled),
    foodEnabled: coerceBoolean(record.foodEnabled, DEFAULT_WORK_MODES.foodEnabled),
  };
};

const normalizeNotificationPrefs = (value: unknown): CourierNotificationPreferences => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    jobOffers: coerceBoolean(record.jobOffers, DEFAULT_NOTIFICATION_PREFS.jobOffers),
    payoutUpdates: coerceBoolean(record.payoutUpdates, DEFAULT_NOTIFICATION_PREFS.payoutUpdates),
    reminders: coerceBoolean(record.reminders, DEFAULT_NOTIFICATION_PREFS.reminders),
  };
};

const normalizeTaxState = (value: unknown): string => coerceString(value).trim().toUpperCase().slice(0, 2);

const normalizeDocumentStatus = (value: unknown): CourierDocumentStatus => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'approved') return 'approved';
  if (normalized === 'rejected') return 'rejected';
  if (normalized === 'pending_review' || normalized === 'pending') return 'pending_review';
  return 'not_uploaded';
};

const normalizeDocuments = (value: unknown): CourierDocument[] => {
  const defaults = buildDefaultCourierDocuments();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const adminStatus = normalizeDocumentStatus(record.adminReviewStatus);
    return defaults.map(doc => {
      const url =
        doc.type === 'government_id'
          ? coerceString(record.idPhotoUrl).trim()
          : doc.type === 'vehicle_registration'
            ? coerceString(record.registrationPhotoUrl).trim()
            : coerceString(record.insurancePhotoUrl).trim();
      const hasUrl = url.length > 0;
      return {
        ...doc,
        status: hasUrl ? adminStatus : 'not_uploaded',
        url: hasUrl ? url : undefined,
        reviewedAt: parseIsoString(record.reviewedAt),
        rejectedReason: coerceString(record.adminNotes).trim() || undefined,
      };
    });
  }
  if (!Array.isArray(value)) {
    return defaults;
  }

  const byType = new Map<CourierDocumentType, CourierDocument>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const typeRaw = String(record.type ?? '').trim().toLowerCase();
    const mappedType: CourierDocumentType | null =
      typeRaw === 'government_id' || typeRaw === 'governmentid'
        ? 'government_id'
        : typeRaw === 'vehicle_registration' || typeRaw === 'vehicleregistration'
          ? 'vehicle_registration'
          : typeRaw === 'insurance'
            ? 'insurance'
            : null;
    if (!mappedType) {
      continue;
    }
    const url = coerceString(record.url).trim();
    const status = normalizeDocumentStatus(record.status ?? (url.length > 0 ? 'pending_review' : 'not_uploaded'));
    byType.set(mappedType, {
      type: mappedType,
      label: defaults.find(doc => doc.type === mappedType)?.label ?? mappedType,
      status,
      url: url.length > 0 ? url : undefined,
      uploadedAt: parseIsoString(record.uploadedAt),
      reviewedAt: parseIsoString(record.reviewedAt),
      rejectedReason: coerceString(record.rejectedReason).trim() || undefined,
    });
  }

  return defaults.map(defaultDoc => byType.get(defaultDoc.type) ?? defaultDoc);
};

const normalizeEquipmentItem = (value: unknown): CourierEquipmentItem => {
  if (!value || typeof value !== 'object') {
    return {has: false, approved: false};
  }
  const record = value as Record<string, unknown>;
  return {
    has: coerceBoolean(record.has, false),
    photoUrl: coerceString(record.photoUrl).trim() || undefined,
    approved: coerceBoolean(record.approved, false),
    approvedAt: parseIsoString(record.approvedAt),
    rejectedReason: coerceString(record.rejectedReason).trim() || undefined,
  };
};

const normalizeEquipment = (value: unknown): CourierEquipment => {
  const defaults = buildDefaultCourierEquipment();
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const normalized = {...defaults};
  for (const type of COURIER_EQUIPMENT_TYPES) {
    normalized[type] = normalizeEquipmentItem(record[type]);
  }
  return normalized;
};

const normalizeStripeState = (
  root: RawCourierProfileV1,
  nested: unknown,
): CourierStripeState => {
  const record = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : {};
  return {
    connectAccountId:
      coerceString(record.connectAccountId).trim() ||
      coerceString(root.stripeConnectAccountId).trim() ||
      coerceString(root.stripeAccountId).trim(),
    accountStatus:
      coerceString(record.accountStatus).trim() ||
      coerceString(root.stripeAccountStatus).trim(),
    chargesEnabled: coerceBoolean(record.chargesEnabled ?? root.stripeChargesEnabled, false),
    payoutsEnabled: coerceBoolean(record.payoutsEnabled ?? root.stripePayoutsEnabled, false),
    requirementsDue: coerceStringArray(record.requirementsDue ?? root.stripeRequirementsDue),
    requirementsPastDue: coerceStringArray(record.requirementsPastDue ?? root.stripeRequirementsPastDue),
  };
};

const normalizeStats = (value: unknown, root: RawCourierProfileV1): CourierProfile['stats'] => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const todayJobs = parseNumeric(record.todayJobs ?? root.todayJobs) ?? DEFAULT_STATS.todayJobs;
  const completedJobs = parseNumeric(record.completedJobs ?? root.completedJobs) ?? DEFAULT_STATS.completedJobs;
  return {
    todayJobs: Math.max(0, Math.round(todayJobs)),
    completedJobs: Math.max(0, Math.round(completedJobs)),
  };
};

const normalizeOptionalFees = (value: unknown): CourierOptionalFee[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => {
      const record = (item ?? {}) as RawOptionalFee;
      const name = coerceString(record.name).trim();
      const amount = parseNumeric(record.amount);
      if (!name || amount === null || amount < 0) {
        return null;
      }
      return {
        name,
        amount: roundMoney(amount),
      };
    })
    .filter((item): item is CourierOptionalFee => item !== null);
};

const normalizeAvailability = (value: unknown): CourierAvailability => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'busy') {
    return 'busy';
  }
  if (normalized === 'offline') {
    return 'offline';
  }
  return 'available';
};

const normalizePayoutMode = (value: unknown): CourierPayoutMode => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'external_provider' || normalized === 'manual_settlement' || normalized === 'stripe_connect') {
    return normalized;
  }
  return DEFAULT_PAYOUT_MODE;
};

const normalizeVehicle = (vehicle: CourierVehicleMetadata): CourierVehicleMetadata => ({
  makeModel: vehicle.makeModel.trim(),
  plateNumber: vehicle.plateNumber.trim().toUpperCase(),
  color: vehicle.color.trim(),
});

const normalizeDraft = (draft: CourierProfileDraft): CourierProfileDraft => ({
  fullName: draft.fullName.trim(),
  phoneNumber: draft.phoneNumber.trim(),
  profilePhotoUrl: draft.profilePhotoUrl.trim(),
  status: normalizeStatus(draft.status),
  rejectionReason: draft.rejectionReason.trim(),
  availability: normalizeAvailability(draft.availability),
  isOnline: Boolean(draft.isOnline),
  serviceRadiusMiles: draft.serviceRadiusMiles.trim(),
  taxState: normalizeTaxState(draft.taxState),
  vehicle: normalizeVehicle(draft.vehicle),
  workModes: normalizeWorkModes(draft.workModes),
  notificationPrefs: normalizeNotificationPrefs(draft.notificationPrefs),
  settings: {
    acceptsNewJobs: Boolean(draft.settings.acceptsNewJobs),
    autoStartTracking: Boolean(draft.settings.autoStartTracking),
  },
  documents: normalizeDocuments(draft.documents),
  equipment: normalizeEquipment(draft.equipment),
  payoutMode: normalizePayoutMode(draft.payoutMode),
  externalPayoutProvider:
    normalizePayoutMode(draft.payoutMode) === 'stripe_connect'
      ? ''
      : draft.externalPayoutProvider.trim(),
  externalPayoutHandle:
    normalizePayoutMode(draft.payoutMode) === 'stripe_connect'
      ? ''
      : draft.externalPayoutHandle.trim(),
  stripe: {
    connectAccountId: draft.stripe.connectAccountId.trim(),
    accountStatus: draft.stripe.accountStatus.trim(),
    chargesEnabled: Boolean(draft.stripe.chargesEnabled),
    payoutsEnabled: Boolean(draft.stripe.payoutsEnabled),
    requirementsDue: coerceStringArray(draft.stripe.requirementsDue),
    requirementsPastDue: coerceStringArray(draft.stripe.requirementsPastDue),
  },
  stats: {
    todayJobs: Math.max(0, Math.round(draft.stats.todayJobs)),
    completedJobs: Math.max(0, Math.round(draft.stats.completedJobs)),
  },
  rateCards: {
    packages: {
      baseFare: draft.rateCards.packages.baseFare.trim(),
      perMile: draft.rateCards.packages.perMile.trim(),
      perMinute: draft.rateCards.packages.perMinute.trim(),
      optionalFees: normalizeOptionalFees(draft.rateCards.packages.optionalFees),
    },
    food: {
      baseFare: draft.rateCards.food.baseFare.trim(),
      perMile: draft.rateCards.food.perMile.trim(),
      restaurantWaitPay: draft.rateCards.food.restaurantWaitPay.trim(),
      optionalFees: normalizeOptionalFees(draft.rateCards.food.optionalFees),
    },
  },
});

const buildDefaultDraft = (session: AuthSession): CourierProfileDraft => ({
  fullName: session.displayName || 'Courier',
  phoneNumber: '',
  profilePhotoUrl: '',
  status: 'pending',
  rejectionReason: '',
  availability: 'available',
  isOnline: false,
  serviceRadiusMiles: String(COURIER_DEFAULT_SERVICE_RADIUS_MILES),
  taxState: '',
  vehicle: {
    makeModel: '',
    plateNumber: '',
    color: '',
  },
  workModes: {
    ...DEFAULT_WORK_MODES,
  },
  notificationPrefs: {
    ...DEFAULT_NOTIFICATION_PREFS,
  },
  settings: {
    acceptsNewJobs: true,
    autoStartTracking: false,
  },
  documents: buildDefaultCourierDocuments(),
  equipment: buildDefaultCourierEquipment(),
  payoutMode: DEFAULT_PAYOUT_MODE,
  externalPayoutProvider: '',
  externalPayoutHandle: '',
  stripe: {
    ...DEFAULT_STRIPE_STATE,
    requirementsDue: [...DEFAULT_STRIPE_STATE.requirementsDue],
    requirementsPastDue: [...DEFAULT_STRIPE_STATE.requirementsPastDue],
  },
  stats: {
    ...DEFAULT_STATS,
  },
  rateCards: {
    packages: {
      baseFare: formatRate(DEFAULT_RATE_CARDS.packages.baseFare),
      perMile: formatRate(DEFAULT_RATE_CARDS.packages.perMile),
      perMinute: formatRate(DEFAULT_RATE_CARDS.packages.perMinute),
      optionalFees: [],
    },
    food: {
      baseFare: formatRate(DEFAULT_RATE_CARDS.food.baseFare),
      perMile: formatRate(DEFAULT_RATE_CARDS.food.perMile),
      restaurantWaitPay: formatRate(DEFAULT_RATE_CARDS.food.restaurantWaitPay),
      optionalFees: [],
    },
  },
});

const toProfile = (session: AuthSession, draft: CourierProfileDraft, updatedAt: string): CourierProfile => {
  const normalizedEquipment = normalizeEquipment(draft.equipment);
  const normalizedDocuments = normalizeDocuments(draft.documents);
  const hasPendingReviewDocument = normalizedDocuments.some(
    document => document.status === 'pending_review' && Boolean(document.url),
  );
  const recoveredStatus: CourierProfileStatus =
    draft.status === 'rejected' && hasPendingReviewDocument ? 'pending_review' : draft.status;
  const isOnline = Boolean(draft.isOnline);
  return {
    schemaVersion: COURIER_PROFILE_SCHEMA_VERSION,
    uid: session.uid,
    email: session.email,
    fullName: draft.fullName,
    phoneNumber: draft.phoneNumber,
    profilePhotoUrl: draft.profilePhotoUrl || undefined,
    status: recoveredStatus,
    rejectionReason: recoveredStatus === 'pending_review' ? undefined : draft.rejectionReason || undefined,
    availability: isOnline ? draft.availability : 'offline',
    isOnline,
    lastOnlineAt: isOnline ? updatedAt : undefined,
    serviceRadiusMiles: parseServiceRadiusMiles(draft.serviceRadiusMiles),
    taxState: normalizeTaxState(draft.taxState),
    vehicle: draft.vehicle,
    workModes: normalizeWorkModes(draft.workModes),
    notificationPrefs: normalizeNotificationPrefs(draft.notificationPrefs),
    settings: draft.settings,
    documents: normalizedDocuments,
    equipment: normalizedEquipment,
    capabilities: deriveCourierCapabilities(normalizedEquipment),
    payoutMode: normalizePayoutMode(draft.payoutMode),
    externalPayoutProvider:
      normalizePayoutMode(draft.payoutMode) === 'stripe_connect'
        ? ''
        : draft.externalPayoutProvider.trim(),
    externalPayoutHandle:
      normalizePayoutMode(draft.payoutMode) === 'stripe_connect'
        ? ''
        : draft.externalPayoutHandle.trim(),
    stripe: {
      connectAccountId: draft.stripe.connectAccountId.trim(),
      accountStatus: draft.stripe.accountStatus.trim(),
      chargesEnabled: Boolean(draft.stripe.chargesEnabled),
      payoutsEnabled: Boolean(draft.stripe.payoutsEnabled),
      requirementsDue: coerceStringArray(draft.stripe.requirementsDue),
      requirementsPastDue: coerceStringArray(draft.stripe.requirementsPastDue),
    },
    stats: {
      todayJobs: Math.max(0, Math.round(draft.stats.todayJobs)),
      completedJobs: Math.max(0, Math.round(draft.stats.completedJobs)),
    },
    rateCards: {
      packages: {
        baseFare: parseRateFromDraft(
          draft.rateCards.packages.baseFare,
          DEFAULT_RATE_CARDS.packages.baseFare,
          PACKAGE_BASE_FARE_MIN,
        ),
        perMile: parseRateFromDraft(
          draft.rateCards.packages.perMile,
          DEFAULT_RATE_CARDS.packages.perMile,
          PACKAGE_PER_MILE_MIN,
        ),
        perMinute: parseRateFromDraft(
          draft.rateCards.packages.perMinute,
          DEFAULT_RATE_CARDS.packages.perMinute,
          PACKAGE_PER_MINUTE_MIN,
        ),
        optionalFees: normalizeOptionalFees(draft.rateCards.packages.optionalFees),
      },
      food: {
        baseFare: parseRateFromDraft(
          draft.rateCards.food.baseFare,
          DEFAULT_RATE_CARDS.food.baseFare,
          FOOD_BASE_FARE_MIN,
        ),
        perMile: parseRateFromDraft(
          draft.rateCards.food.perMile,
          DEFAULT_RATE_CARDS.food.perMile,
          FOOD_PER_MILE_MIN,
        ),
        restaurantWaitPay: parseRateFromDraft(
          draft.rateCards.food.restaurantWaitPay,
          DEFAULT_RATE_CARDS.food.restaurantWaitPay,
          FOOD_WAIT_PAY_MIN,
        ),
        optionalFees: normalizeOptionalFees(draft.rateCards.food.optionalFees),
      },
    },
    updatedAt,
  };
};

const buildDefaultProfile = (session: AuthSession): CourierProfile => {
  const now = new Date().toISOString();
  return toProfile(session, buildDefaultDraft(session), now);
};

const profileFromRaw = (session: AuthSession, raw: RawCourierProfileV1): CourierProfile => {
  const fallback = buildDefaultDraft(session);

  const rawPackagesRate = raw.rateCards?.packages ?? raw.packageRateCard;
  const rawFoodRate = raw.rateCards?.food ?? raw.foodRateCard;

  const draft: CourierProfileDraft = {
    fullName: coerceString(raw.fullName, fallback.fullName).trim() || fallback.fullName,
    phoneNumber: coerceString(raw.contact?.phoneNumber, fallback.phoneNumber).trim(),
    profilePhotoUrl: coerceString(raw.profilePhotoUrl, fallback.profilePhotoUrl).trim(),
    status: normalizeStatus(raw.status),
    rejectionReason: coerceString(raw.rejectionReason).trim(),
    availability:
      raw.availability !== undefined
        ? normalizeAvailability(raw.availability)
        : coerceBoolean(raw.isOnline ?? raw.online, fallback.isOnline)
          ? 'available'
          : 'offline',
    isOnline: coerceBoolean(raw.isOnline ?? raw.online, fallback.isOnline),
    serviceRadiusMiles: String(parseServiceRadiusMiles(raw.serviceRadiusMiles ?? raw.serviceRadius)),
    taxState: normalizeTaxState(raw.taxState),
    vehicle: normalizeVehicle({
      makeModel: coerceString(raw.vehicle?.makeModel, fallback.vehicle.makeModel),
      plateNumber: coerceString(raw.vehicle?.plateNumber, fallback.vehicle.plateNumber),
      color: coerceString(raw.vehicle?.color, fallback.vehicle.color),
    }),
    workModes: normalizeWorkModes(raw.workModes),
    notificationPrefs: normalizeNotificationPrefs(raw.notificationPrefs),
    settings: {
      acceptsNewJobs: coerceBoolean(raw.settings?.acceptsNewJobs, fallback.settings.acceptsNewJobs),
      autoStartTracking: coerceBoolean(raw.settings?.autoStartTracking, fallback.settings.autoStartTracking),
    },
    documents: normalizeDocuments(raw.documents),
    equipment: normalizeEquipment(raw.equipment),
    payoutMode: normalizePayoutMode(raw.payoutMode ?? raw.courierPayoutMode),
    externalPayoutProvider: coerceString(raw.externalPayoutProvider).trim(),
    externalPayoutHandle: coerceString(raw.externalPayoutHandle).trim(),
    stripe: normalizeStripeState(raw, raw.stripe),
    stats: normalizeStats(raw.stats, raw),
    rateCards: {
      packages: {
        baseFare: formatRate(
          parseRateFromUnknown(rawPackagesRate?.baseFare, DEFAULT_RATE_CARDS.packages.baseFare, PACKAGE_BASE_FARE_MIN),
        ),
        perMile: formatRate(
          parseRateFromUnknown(rawPackagesRate?.perMile, DEFAULT_RATE_CARDS.packages.perMile, PACKAGE_PER_MILE_MIN),
        ),
        perMinute: formatRate(
          parseRateFromUnknown(
            rawPackagesRate?.perMinute,
            DEFAULT_RATE_CARDS.packages.perMinute,
            PACKAGE_PER_MINUTE_MIN,
          ),
        ),
        optionalFees: normalizeOptionalFees(rawPackagesRate?.optionalFees),
      },
      food: {
        baseFare: formatRate(
          parseRateFromUnknown(rawFoodRate?.baseFare, DEFAULT_RATE_CARDS.food.baseFare, FOOD_BASE_FARE_MIN),
        ),
        perMile: formatRate(
          parseRateFromUnknown(rawFoodRate?.perMile, DEFAULT_RATE_CARDS.food.perMile, FOOD_PER_MILE_MIN),
        ),
        restaurantWaitPay: formatRate(
          parseRateFromUnknown(
            rawFoodRate?.restaurantWaitPay,
            DEFAULT_RATE_CARDS.food.restaurantWaitPay,
            FOOD_WAIT_PAY_MIN,
          ),
        ),
        optionalFees: normalizeOptionalFees(rawFoodRate?.optionalFees),
      },
    },
  };

  const updatedAt = parseIsoString(raw.updatedAt) ?? new Date().toISOString();
  return toProfile(session, draft, updatedAt);
};

const toRawProfileV1 = (profile: CourierProfile): RawCourierProfileV1 => ({
  version: COURIER_PROFILE_SCHEMA_VERSION,
  fullName: profile.fullName,
  profilePhotoUrl: profile.profilePhotoUrl,
  contact: {
    email: profile.email,
    phoneNumber: profile.phoneNumber,
  },
  status: profile.status,
  rejectionReason: profile.rejectionReason,
  availability: profile.availability,
  isOnline: profile.isOnline,
  online: profile.isOnline,
  lastOnlineAt: profile.lastOnlineAt,
  serviceRadiusMiles: profile.serviceRadiusMiles,
  serviceRadius: profile.serviceRadiusMiles,
  taxState: profile.taxState,
  workModes: profile.workModes,
  notificationPrefs: profile.notificationPrefs,
  vehicle: {
    makeModel: profile.vehicle.makeModel,
    plateNumber: profile.vehicle.plateNumber,
    color: profile.vehicle.color,
  },
  settings: {
    acceptsNewJobs: profile.settings.acceptsNewJobs,
    autoStartTracking: profile.settings.autoStartTracking,
  },
  rateCards: {
    packages: {
      baseFare: profile.rateCards.packages.baseFare,
      perMile: profile.rateCards.packages.perMile,
      perMinute: profile.rateCards.packages.perMinute,
      optionalFees: profile.rateCards.packages.optionalFees,
    },
    food: {
      baseFare: profile.rateCards.food.baseFare,
      perMile: profile.rateCards.food.perMile,
      restaurantWaitPay: profile.rateCards.food.restaurantWaitPay,
      optionalFees: profile.rateCards.food.optionalFees,
    },
  },
  documents: profile.documents.map(doc => ({
    type: doc.type,
    label: doc.label,
    status: doc.status,
    url: doc.url,
    uploadedAt: doc.uploadedAt,
    reviewedAt: doc.reviewedAt,
    rejectedReason: doc.rejectedReason,
  })),
  equipment: profile.equipment,
  capabilities: profile.capabilities,
  payoutMode: profile.payoutMode,
  courierPayoutMode: profile.payoutMode,
  externalPayoutProvider: profile.externalPayoutProvider,
  externalPayoutHandle: profile.externalPayoutHandle,
  stripe: {
    connectAccountId: profile.stripe.connectAccountId,
    accountStatus: profile.stripe.accountStatus,
    chargesEnabled: profile.stripe.chargesEnabled,
    payoutsEnabled: profile.stripe.payoutsEnabled,
    requirementsDue: profile.stripe.requirementsDue,
    requirementsPastDue: profile.stripe.requirementsPastDue,
  },
  stripeConnectAccountId: profile.stripe.connectAccountId,
  stripeAccountId: profile.stripe.connectAccountId,
  stripeAccountStatus: profile.stripe.accountStatus,
  stripeChargesEnabled: profile.stripe.chargesEnabled,
  stripePayoutsEnabled: profile.stripe.payoutsEnabled,
  stripeRequirementsDue: profile.stripe.requirementsDue,
  stripeRequirementsPastDue: profile.stripe.requirementsPastDue,
  stats: profile.stats,
  todayJobs: profile.stats.todayJobs,
  completedJobs: profile.stats.completedJobs,
  updatedAt: profile.updatedAt,
});

const parseCachedProfile = (session: AuthSession, parsed: unknown): CourierProfile | null => {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const cached = parsed as Record<string, unknown>;
  const uid = coerceString(cached.uid);
  const schemaVersion = parseNumeric(cached.schemaVersion);

  if (uid !== session.uid || schemaVersion !== COURIER_PROFILE_SCHEMA_VERSION) {
    return null;
  }

  const raw: RawCourierProfileV1 = {
    fullName: cached.fullName,
    profilePhotoUrl: cached.profilePhotoUrl,
    contact: {
      email: cached.email,
      phoneNumber: cached.phoneNumber,
    },
    status: cached.status,
    rejectionReason: cached.rejectionReason,
    availability: cached.availability,
    isOnline: cached.isOnline,
    online: cached.online,
    lastOnlineAt: cached.lastOnlineAt,
    serviceRadiusMiles: cached.serviceRadiusMiles,
    serviceRadius: cached.serviceRadius,
    taxState: cached.taxState,
    workModes: cached.workModes as RawCourierProfileV1['workModes'],
    notificationPrefs: cached.notificationPrefs as RawCourierProfileV1['notificationPrefs'],
    vehicle: cached.vehicle as RawCourierProfileV1['vehicle'],
    settings: cached.settings as RawCourierProfileV1['settings'],
    rateCards: (cached.rateCards as RawCourierProfileV1['rateCards']) ?? undefined,
    documents: cached.documents,
    equipment: cached.equipment,
    capabilities: cached.capabilities,
    payoutMode: cached.payoutMode,
    courierPayoutMode: cached.courierPayoutMode,
    externalPayoutProvider: cached.externalPayoutProvider,
    externalPayoutHandle: cached.externalPayoutHandle,
    stripe: cached.stripe as RawCourierProfileV1['stripe'],
    stripeConnectAccountId: cached.stripeConnectAccountId,
    stripeAccountId: cached.stripeAccountId,
    stripeAccountStatus: cached.stripeAccountStatus,
    stripeChargesEnabled: cached.stripeChargesEnabled,
    stripePayoutsEnabled: cached.stripePayoutsEnabled,
    stripeRequirementsDue: cached.stripeRequirementsDue,
    stripeRequirementsPastDue: cached.stripeRequirementsPastDue,
    stats: cached.stats as RawCourierProfileV1['stats'],
    todayJobs: cached.todayJobs,
    completedJobs: cached.completedJobs,
    updatedAt: cached.updatedAt,
  };

  return profileFromRaw(session, raw);
};

const readCachedProfile = async (session: AuthSession): Promise<CourierProfile | null> => {
  const raw = await AsyncStorage.getItem(profileCacheKey(session.uid));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseCachedProfile(session, parsed);
  } catch {
    return null;
  }
};

const writeCachedProfile = async (profile: CourierProfile): Promise<void> => {
  await AsyncStorage.setItem(profileCacheKey(profile.uid), JSON.stringify(profile));
};

const validateRateField = (
  value: string,
  minValue: number,
  key:
    | 'packagesBaseFare'
    | 'packagesPerMile'
    | 'packagesPerMinute'
    | 'foodBaseFare'
    | 'foodPerMile'
    | 'foodRestaurantWaitPay',
  label: string,
  errors: CourierProfileValidationErrors,
): void => {
  const parsed = parseNumeric(value);
  if (parsed === null) {
    errors[key] = `${label} is required.`;
    return;
  }

  if (parsed < minValue) {
    errors[key] = `${label} must be at least $${minValue.toFixed(2)}.`;
  }
};

export const validateCourierProfileDraft = (draft: CourierProfileDraft): CourierProfileValidationErrors => {
  const normalized = normalizeDraft(draft);
  const errors: CourierProfileValidationErrors = {};

  if (normalized.fullName.length < 2) {
    errors.fullName = 'Name must be at least 2 characters.';
  }

  if (normalized.phoneNumber.length > 0 && !/^[0-9+()\-\s]{7,20}$/.test(normalized.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid phone number.';
  }

  if (!['available', 'busy', 'offline'].includes(normalized.availability)) {
    errors.availability = 'Availability selection is invalid.';
  }

  const serviceRadius = parseNumeric(normalized.serviceRadiusMiles);
  if (serviceRadius === null) {
    errors.serviceRadiusMiles = 'Service radius is required.';
  } else if (serviceRadius < COURIER_MIN_SERVICE_RADIUS_MILES || serviceRadius > COURIER_MAX_SERVICE_RADIUS_MILES) {
    errors.serviceRadiusMiles = `Service radius must be between ${COURIER_MIN_SERVICE_RADIUS_MILES} and ${COURIER_MAX_SERVICE_RADIUS_MILES} miles.`;
  }

  if (normalized.taxState.length > 0 && !/^[A-Z]{2}$/.test(normalized.taxState)) {
    errors.taxState = 'Tax state must be a 2-letter code.';
  }

  if (normalized.vehicle.makeModel.length > 40) {
    errors.vehicleMakeModel = 'Vehicle model must be 40 characters or fewer.';
  }

  if (normalized.vehicle.plateNumber.length > 16) {
    errors.vehiclePlateNumber = 'Plate number must be 16 characters or fewer.';
  }

  if (normalized.vehicle.color.length > 24) {
    errors.vehicleColor = 'Vehicle color must be 24 characters or fewer.';
  }

  validateRateField(
    normalized.rateCards.packages.baseFare,
    PACKAGE_BASE_FARE_MIN,
    'packagesBaseFare',
    'Package base fare',
    errors,
  );
  validateRateField(
    normalized.rateCards.packages.perMile,
    PACKAGE_PER_MILE_MIN,
    'packagesPerMile',
    'Package per-mile rate',
    errors,
  );
  validateRateField(
    normalized.rateCards.packages.perMinute,
    PACKAGE_PER_MINUTE_MIN,
    'packagesPerMinute',
    'Package per-minute rate',
    errors,
  );

  validateRateField(normalized.rateCards.food.baseFare, FOOD_BASE_FARE_MIN, 'foodBaseFare', 'Food base fare', errors);
  validateRateField(normalized.rateCards.food.perMile, FOOD_PER_MILE_MIN, 'foodPerMile', 'Food per-mile rate', errors);
  validateRateField(
    normalized.rateCards.food.restaurantWaitPay,
    FOOD_WAIT_PAY_MIN,
    'foodRestaurantWaitPay',
    'Restaurant wait pay',
    errors,
  );

  return errors;
};

export const loadCourierProfile = async (session: AuthSession): Promise<CourierProfileLoadResult> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();

    if (services) {
      try {
        const userRef = doc(services.db, 'users', session.uid);
        const userSnap = await getDoc(userRef);
        const userData = (userSnap.data() ?? {}) as {
          courierProfileV1?: RawCourierProfileV1;
          courierProfile?: RawCourierProfileV1;
          profilePhotoUrl?: unknown;
        };
        const rawMergedProfile = {
          ...(userData.courierProfile ?? {}),
          ...(userData.courierProfileV1 ?? {}),
          profilePhotoUrl: userData.courierProfileV1?.profilePhotoUrl ?? userData.profilePhotoUrl,
        } as RawCourierProfileV1;

        let profile = userData.courierProfileV1 || userData.courierProfile
          ? profileFromRaw(session, rawMergedProfile)
          : buildDefaultProfile(session);

        if (!userData.courierProfileV1 && !userData.courierProfile) {
          const now = new Date().toISOString();
          profile = {
            ...profile,
            updatedAt: now,
          };
          await setDoc(
            userRef,
            {
              courierProfileV1: toRawProfileV1(profile),
              courierProfile: toRawProfileV1(profile),
              profilePhotoUrl: profile.profilePhotoUrl ?? null,
              updatedAt: now,
            },
            {merge: true},
          );
        }

        await writeCachedProfile(profile);
        return {
          profile,
          source: 'firebase',
          message: null,
        };
      } catch {
        const cached = await readCachedProfile(session);
        if (cached) {
          return {
            profile: cached,
            source: 'local',
            message: 'Loaded cached profile because network is unavailable.',
          };
        }
      }
    }
  }

  const cached = await readCachedProfile(session);
  if (cached) {
    return {
      profile: cached,
      source: 'local',
      message: null,
    };
  }

  const fallback = buildDefaultProfile(session);
  await writeCachedProfile(fallback);
  return {
    profile: fallback,
    source: 'local',
    message: 'Using local default profile until Firebase is available.',
  };
};

export const saveCourierProfile = async (
  session: AuthSession,
  draft: CourierProfileDraft,
): Promise<CourierProfileSaveResult> => {
  const normalized = normalizeDraft(draft);
  const validationErrors = validateCourierProfileDraft(normalized);
  if (Object.keys(validationErrors).length > 0) {
    const firstError = Object.values(validationErrors)[0] ?? 'Profile data is invalid.';
    throw new Error(firstError);
  }

  const now = new Date().toISOString();
  const profile = toProfile(session, normalized, now);

  await writeCachedProfile(profile);

  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      try {
        const userRef = doc(services.db, 'users', session.uid);
        await setDoc(
          userRef,
          {
            courierProfileV1: toRawProfileV1(profile),
            courierProfile: toRawProfileV1(profile),
            profilePhotoUrl: profile.profilePhotoUrl ?? null,
            updatedAt: now,
          },
          {merge: true},
        );

        return {
          profile,
          source: 'firebase',
          message: 'Profile saved.',
          syncPending: false,
        };
      } catch {
        return {
          profile,
          source: 'local',
          message: 'Saved locally. Changes will sync when connection is restored.',
          syncPending: true,
        };
      }
    }
  }

  return {
    profile,
    source: 'local',
    message: 'Saved locally for this environment.',
    syncPending: true,
  };
};

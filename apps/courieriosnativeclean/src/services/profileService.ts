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
  type CourierAvailability,
  type CourierOptionalFee,
  type CourierProfile,
  type CourierProfileDraft,
  type CourierRateCards,
  type CourierVehicleMetadata,
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
  contact?: {
    email?: unknown;
    phoneNumber?: unknown;
  };
  availability?: unknown;
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

const normalizeVehicle = (vehicle: CourierVehicleMetadata): CourierVehicleMetadata => ({
  makeModel: vehicle.makeModel.trim(),
  plateNumber: vehicle.plateNumber.trim().toUpperCase(),
  color: vehicle.color.trim(),
});

const normalizeDraft = (draft: CourierProfileDraft): CourierProfileDraft => ({
  fullName: draft.fullName.trim(),
  phoneNumber: draft.phoneNumber.trim(),
  availability: normalizeAvailability(draft.availability),
  vehicle: normalizeVehicle(draft.vehicle),
  settings: {
    acceptsNewJobs: Boolean(draft.settings.acceptsNewJobs),
    autoStartTracking: Boolean(draft.settings.autoStartTracking),
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
  availability: 'available',
  vehicle: {
    makeModel: '',
    plateNumber: '',
    color: '',
  },
  settings: {
    acceptsNewJobs: true,
    autoStartTracking: false,
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

const toProfile = (session: AuthSession, draft: CourierProfileDraft, updatedAt: string): CourierProfile => ({
  schemaVersion: COURIER_PROFILE_SCHEMA_VERSION,
  uid: session.uid,
  email: session.email,
  fullName: draft.fullName,
  phoneNumber: draft.phoneNumber,
  availability: draft.availability,
  vehicle: draft.vehicle,
  settings: draft.settings,
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
});

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
    availability: normalizeAvailability(raw.availability),
    vehicle: normalizeVehicle({
      makeModel: coerceString(raw.vehicle?.makeModel, fallback.vehicle.makeModel),
      plateNumber: coerceString(raw.vehicle?.plateNumber, fallback.vehicle.plateNumber),
      color: coerceString(raw.vehicle?.color, fallback.vehicle.color),
    }),
    settings: {
      acceptsNewJobs: coerceBoolean(raw.settings?.acceptsNewJobs, fallback.settings.acceptsNewJobs),
      autoStartTracking: coerceBoolean(raw.settings?.autoStartTracking, fallback.settings.autoStartTracking),
    },
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

  const updatedAt = coerceString(raw.updatedAt, '').trim() || new Date().toISOString();
  return toProfile(session, draft, updatedAt);
};

const toRawProfileV1 = (profile: CourierProfile): RawCourierProfileV1 => ({
  version: COURIER_PROFILE_SCHEMA_VERSION,
  fullName: profile.fullName,
  contact: {
    email: profile.email,
    phoneNumber: profile.phoneNumber,
  },
  availability: profile.availability,
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
    contact: {
      email: cached.email,
      phoneNumber: cached.phoneNumber,
    },
    availability: cached.availability,
    vehicle: cached.vehicle as RawCourierProfileV1['vehicle'],
    settings: cached.settings as RawCourierProfileV1['settings'],
    rateCards: (cached.rateCards as RawCourierProfileV1['rateCards']) ?? undefined,
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
        const userData = (userSnap.data() ?? {}) as {courierProfileV1?: RawCourierProfileV1};

        let profile = userData.courierProfileV1
          ? profileFromRaw(session, userData.courierProfileV1)
          : buildDefaultProfile(session);

        if (!userData.courierProfileV1) {
          const now = new Date().toISOString();
          profile = {
            ...profile,
            updatedAt: now,
          };
          await setDoc(
            userRef,
            {
              courierProfileV1: toRawProfileV1(profile),
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

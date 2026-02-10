import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import type {AuthSession} from '../../types/auth';

const mockGetItem = jest.fn() as jest.MockedFunction<
  (key: string) => Promise<string | null>
>;
const mockSetItem = jest.fn() as jest.MockedFunction<
  (key: string, value: string) => Promise<void>
>;

const mockIsFirebaseReady = jest.fn() as jest.MockedFunction<() => boolean>;
const mockGetFirebaseServices = jest.fn() as jest.MockedFunction<
  () => {db: unknown}
>;

const mockDoc = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => unknown
>;
const mockGetDoc = jest.fn() as jest.MockedFunction<
  (docRef?: unknown) => Promise<{data: () => Record<string, unknown>}>
>;
const mockSetDoc = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => Promise<void>
>;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

jest.mock('../firebase', () => ({
  isFirebaseReady: () => mockIsFirebaseReady(),
  getFirebaseServices: () => mockGetFirebaseServices(),
}));

jest.mock('firebase/firestore', () => ({
  doc: (db: unknown, path: string, id?: string) => mockDoc(db, path, id),
  getDoc: (docRef: unknown) => mockGetDoc(docRef),
  setDoc: (docRef: unknown, data: unknown) => mockSetDoc(docRef, data),
}));

import {
  loadCourierProfile,
  saveCourierProfile,
  validateCourierProfileDraft,
} from '../profileService';

const session: AuthSession = {
  uid: 'courier_123',
  email: 'courier@example.com',
  displayName: 'Demo Courier',
  token: 'token',
  provider: 'firebase',
};

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsFirebaseReady.mockReturnValue(true);
    mockGetFirebaseServices.mockReturnValue({db: 'db'});
    mockDoc.mockReturnValue('user_ref');
    mockSetItem.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
    mockGetDoc.mockResolvedValue({
      data: () => ({
        courierProfileV1: {
          version: 1,
          fullName: 'Saved Name',
          contact: {phoneNumber: '+1 555 121 2121'},
          availability: 'busy',
          vehicle: {
            makeModel: 'Prius',
            plateNumber: 'ABC123',
            color: 'Blue',
          },
          settings: {
            acceptsNewJobs: false,
            autoStartTracking: true,
          },
          rateCards: {
            packages: {
              baseFare: 4,
              perMile: 1.5,
              perMinute: 0.3,
              optionalFees: [{name: 'stairs', amount: 2}],
            },
            food: {
              baseFare: 3,
              perMile: 1.8,
              restaurantWaitPay: 0.2,
              optionalFees: [{name: 'late night', amount: 1}],
            },
          },
          updatedAt: '2026-02-08T00:00:00.000Z',
        },
      }),
    });
  });

  it('loads profile from firebase and caches it', async () => {
    const result = await loadCourierProfile(session);

    expect(result.source).toBe('firebase');
    expect(result.profile.fullName).toBe('Saved Name');
    expect(result.profile.settings.autoStartTracking).toBe(true);
    expect(result.profile.rateCards.packages.baseFare).toBe(4);
    expect(result.profile.rateCards.food.restaurantWaitPay).toBe(0.2);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@senderr/profile/v1/courier_123',
      expect.stringContaining('Saved Name'),
    );
  });

  it('migrates cached v1 profile missing rate cards with safe defaults', async () => {
    mockGetDoc.mockRejectedValue(new Error('offline'));
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        uid: session.uid,
        email: session.email,
        fullName: 'Cached Name',
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
        updatedAt: '2026-02-08T00:00:00.000Z',
      }),
    );

    const result = await loadCourierProfile(session);

    expect(result.source).toBe('local');
    expect(result.profile.fullName).toBe('Cached Name');
    expect(result.profile.rateCards.packages.baseFare).toBe(3);
    expect(result.profile.rateCards.food.baseFare).toBe(2.5);
    expect(result.message).toContain('cached');
  });

  it('returns local syncPending result when save cannot reach firebase', async () => {
    mockSetDoc.mockRejectedValue(new Error('network unavailable'));

    const result = await saveCourierProfile(session, {
      fullName: 'New Name',
      phoneNumber: '+1 555 222 3333',
      availability: 'available',
      vehicle: {
        makeModel: 'Transit',
        plateNumber: 'DEF456',
        color: 'White',
      },
      settings: {
        acceptsNewJobs: true,
        autoStartTracking: false,
      },
      rateCards: {
        packages: {
          baseFare: '4.00',
          perMile: '1.50',
          perMinute: '0.30',
          optionalFees: [],
        },
        food: {
          baseFare: '3.00',
          perMile: '1.80',
          restaurantWaitPay: '0.20',
          optionalFees: [],
        },
      },
    });

    expect(result.source).toBe('local');
    expect(result.syncPending).toBe(true);
    expect(result.profile.fullName).toBe('New Name');
    expect(result.profile.rateCards.packages.perMile).toBe(1.5);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@senderr/profile/v1/courier_123',
      expect.stringContaining('New Name'),
    );
  });

  it('validates unsafe profile and rate-card input', () => {
    const errors = validateCourierProfileDraft({
      fullName: 'A',
      phoneNumber: 'abc',
      availability: 'available',
      vehicle: {
        makeModel: 'x'.repeat(41),
        plateNumber: 'y'.repeat(17),
        color: 'z'.repeat(25),
      },
      settings: {
        acceptsNewJobs: true,
        autoStartTracking: false,
      },
      rateCards: {
        packages: {
          baseFare: '1',
          perMile: '0.1',
          perMinute: '0.01',
          optionalFees: [],
        },
        food: {
          baseFare: '2',
          perMile: '0.2',
          restaurantWaitPay: '0.05',
          optionalFees: [],
        },
      },
    });

    expect(errors.fullName).toBeDefined();
    expect(errors.phoneNumber).toBeDefined();
    expect(errors.vehicleMakeModel).toBeDefined();
    expect(errors.vehiclePlateNumber).toBeDefined();
    expect(errors.vehicleColor).toBeDefined();
    expect(errors.packagesBaseFare).toBeDefined();
    expect(errors.packagesPerMile).toBeDefined();
    expect(errors.packagesPerMinute).toBeDefined();
    expect(errors.foodBaseFare).toBeDefined();
    expect(errors.foodPerMile).toBeDefined();
    expect(errors.foodRestaurantWaitPay).toBeDefined();
  });
});

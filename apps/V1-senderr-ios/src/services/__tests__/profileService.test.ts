import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import type {AuthSession} from '../../types/auth';

const mockGetItem: any = jest.fn();
const mockSetItem: any = jest.fn();

const mockIsFirebaseReady: any = jest.fn();
const mockGetFirebaseServices: any = jest.fn();

const mockDoc: any = jest.fn();
const mockGetDoc: any = jest.fn();
const mockSetDoc: any = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

jest.mock('../firebase', () => ({
  isFirebaseReady: () => mockIsFirebaseReady(),
  getFirebaseServices: () => mockGetFirebaseServices(),
}));

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

import {loadCourierProfile, saveCourierProfile, validateCourierProfileDraft} from '../profileService';
import {buildDefaultCourierEquipment, buildDefaultCourierDocuments} from '../../types/profile';

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
      profilePhotoUrl: '',
      status: 'approved',
      rejectionReason: '',
      availability: 'available',
      isOnline: true,
      serviceRadiusMiles: '20',
      taxState: 'VA',
      vehicle: {
        makeModel: 'Transit',
        plateNumber: 'DEF456',
        color: 'White',
      },
      workModes: {
        packagesEnabled: true,
        foodEnabled: true,
      },
      notificationPrefs: {
        jobOffers: true,
        payoutUpdates: true,
        reminders: true,
      },
      settings: {
        acceptsNewJobs: true,
        autoStartTracking: false,
      },
      documents: buildDefaultCourierDocuments(),
      equipment: buildDefaultCourierEquipment(),
      stripe: {
        connectAccountId: '',
        accountStatus: '',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [],
        requirementsPastDue: [],
      },
      stats: {
        todayJobs: 0,
        completedJobs: 0,
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

  it('moves rejected profile back to pending_review when documents are resubmitted', async () => {
    const documents = buildDefaultCourierDocuments().map(document =>
      document.type === 'government_id'
        ? {
            ...document,
            status: 'pending_review' as const,
            url: 'https://example.com/id-front.jpg',
            uploadedAt: '2026-02-14T10:00:00.000Z',
          }
        : document,
    );

    const result = await saveCourierProfile(session, {
      fullName: 'Recovered Courier',
      phoneNumber: '+1 555 222 3333',
      profilePhotoUrl: '',
      status: 'rejected',
      rejectionReason: 'Upload clearer ID image.',
      availability: 'available',
      isOnline: false,
      serviceRadiusMiles: '15',
      taxState: 'VA',
      vehicle: {
        makeModel: 'Transit',
        plateNumber: 'DEF456',
        color: 'White',
      },
      workModes: {
        packagesEnabled: true,
        foodEnabled: true,
      },
      notificationPrefs: {
        jobOffers: true,
        payoutUpdates: true,
        reminders: true,
      },
      settings: {
        acceptsNewJobs: true,
        autoStartTracking: false,
      },
      documents,
      equipment: buildDefaultCourierEquipment(),
      stripe: {
        connectAccountId: '',
        accountStatus: '',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [],
        requirementsPastDue: [],
      },
      stats: {
        todayJobs: 0,
        completedJobs: 0,
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

    expect(result.profile.status).toBe('pending_review');
    expect(result.profile.rejectionReason).toBeUndefined();
  });

  it('validates unsafe profile and rate-card input', () => {
    const errors = validateCourierProfileDraft({
      fullName: 'A',
      phoneNumber: 'abc',
      profilePhotoUrl: '',
      status: 'approved',
      rejectionReason: '',
      availability: 'available',
      isOnline: true,
      serviceRadiusMiles: '0',
      taxState: 'V1',
      vehicle: {
        makeModel: 'x'.repeat(41),
        plateNumber: 'y'.repeat(17),
        color: 'z'.repeat(25),
      },
      workModes: {
        packagesEnabled: true,
        foodEnabled: true,
      },
      notificationPrefs: {
        jobOffers: true,
        payoutUpdates: true,
        reminders: true,
      },
      settings: {
        acceptsNewJobs: true,
        autoStartTracking: false,
      },
      documents: buildDefaultCourierDocuments(),
      equipment: buildDefaultCourierEquipment(),
      stripe: {
        connectAccountId: '',
        accountStatus: '',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [],
        requirementsPastDue: [],
      },
      stats: {
        todayJobs: 0,
        completedJobs: 0,
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
    expect(errors.serviceRadiusMiles).toBeDefined();
    expect(errors.taxState).toBeDefined();
    expect(errors.packagesBaseFare).toBeDefined();
    expect(errors.packagesPerMile).toBeDefined();
    expect(errors.packagesPerMinute).toBeDefined();
    expect(errors.foodBaseFare).toBeDefined();
    expect(errors.foodPerMile).toBeDefined();
    expect(errors.foodRestaurantWaitPay).toBeDefined();
  });
});

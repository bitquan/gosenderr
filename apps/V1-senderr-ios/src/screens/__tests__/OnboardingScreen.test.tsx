import React from 'react';
import {TextInput} from 'react-native';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';
import {OnboardingScreen} from '../OnboardingScreen';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

describe('OnboardingScreen', () => {
  const loadProfile = jest.fn();
  const saveProfile = jest.fn();
  const validateDraft = jest.fn(() => ({}));
  const analytics = {track: jest.fn(), recordError: jest.fn()};

  beforeEach(() => {
    loadProfile.mockReset();
    saveProfile.mockReset();
    validateDraft.mockClear();
    analytics.track.mockReset();
    analytics.recordError.mockReset();

    (useAuth as jest.Mock).mockReturnValue({
      session: {
        uid: 'courier-1',
        email: 'courier@example.com',
        displayName: 'Courier',
        token: 'token',
        provider: 'firebase',
      },
    });

    const profile = {
      schemaVersion: 1,
      uid: 'courier-1',
      email: 'courier@example.com',
      fullName: 'Demo Courier',
      phoneNumber: '+1234567890',
      profilePhotoUrl: '',
      status: 'approved',
      rejectionReason: '',
      availability: 'available',
      isOnline: true,
      serviceRadiusMiles: 15,
      taxState: 'VA',
      vehicle: {
        makeModel: 'Honda Civic',
        plateNumber: 'ABC1234',
        color: 'Blue',
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
      documents: [],
      equipment: {},
      capabilities: {},
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
        packages: {baseFare: 3, perMile: 1.2, perMinute: 0.25, optionalFees: []},
        food: {baseFare: 2.5, perMile: 1.5, restaurantWaitPay: 0.15, optionalFees: []},
      },
      updatedAt: new Date().toISOString(),
    } as const;

    loadProfile.mockResolvedValue({profile, source: 'local', message: null});
    saveProfile.mockResolvedValue({profile, source: 'local', message: 'Saved', syncPending: false});

    (useServiceRegistry as jest.Mock).mockReturnValue({
      profile: {loadProfile, saveProfile, validateDraft},
      analytics,
      location: {useLocationTracking: () => ({state: {hasPermission: false, tracking: false, lastLocation: null, error: null}, requestPermission: jest.fn(), startTracking: jest.fn(), stopTracking: jest.fn()})},
      featureFlags: {useFeatureFlags: () => ({state: {flags: {}, source: 'defaults', loading: false, error: null, updatedAt: null}, refresh: jest.fn()})},
    });
  });

  it('renders labeled inputs and continues to app', async () => {
    const onComplete = jest.fn(() => Promise.resolve());
    const screen = renderer.create(<OnboardingScreen onComplete={onComplete} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.root.findByProps({testID: 'onboarding-fullname'})).toBeTruthy();
    expect(screen.root.findByProps({testID: 'onboarding-phone'})).toBeTruthy();

    const inputs = screen.root.findAllByType(TextInput);
    act(() => {
      inputs[0].props.onChangeText('Driver Test');
      inputs[1].props.onChangeText('+12025551234');
    });

    const continueButton = screen.root.findByProps({label: 'Continue to app'});
    await act(async () => {
      continueButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveProfile).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });
});

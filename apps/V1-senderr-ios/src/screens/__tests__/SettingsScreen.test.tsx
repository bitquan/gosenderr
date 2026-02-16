import React from 'react';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';
import {SettingsScreen} from '../SettingsScreen';
import {buildDefaultCourierDocuments, buildDefaultCourierEquipment} from '../../types/profile';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

describe('SettingsScreen', () => {
  const requestPermission = jest.fn();
  const startTracking = jest.fn();
  const stopTracking = jest.fn();
  const loadProfile = jest.fn();
  const saveProfile = jest.fn();
  const validateDraft = jest.fn(() => ({}));
  const analytics = {
    track: jest.fn(),
    recordError: jest.fn(),
  };
  const refreshFlags = jest.fn();

  beforeEach(() => {
    requestPermission.mockReset();
    startTracking.mockReset();
    stopTracking.mockReset();
    loadProfile.mockReset();
    saveProfile.mockReset();
    validateDraft.mockClear();
    analytics.track.mockReset();
    analytics.recordError.mockReset();
    refreshFlags.mockReset();

    (useAuth as jest.Mock).mockReturnValue({
      session: {
        uid: 'courier-1',
        email: 'courier@example.com',
        displayName: 'Courier',
        token: 'token',
        provider: 'firebase',
      },
      signOutUser: jest.fn(),
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
      documents: buildDefaultCourierDocuments(),
      equipment: buildDefaultCourierEquipment(),
      capabilities: {
        canDeliverHot: false,
        canDeliverCold: false,
        canDeliverFrozen: false,
        canDeliverDrinks: false,
        canDeliverHeavy: false,
        canDeliverFurniture: false,
      },
      stripe: {
        connectAccountId: '',
        accountStatus: '',
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [],
        requirementsPastDue: [],
      },
      payoutMode: 'stripe_connect',
      externalPayoutProvider: '',
      externalPayoutHandle: '',
      stats: {
        todayJobs: 0,
        completedJobs: 0,
      },
      rateCards: {
        packages: {
          baseFare: 3,
          perMile: 1.2,
          perMinute: 0.25,
          optionalFees: [],
        },
        food: {
          baseFare: 2.5,
          perMile: 1.5,
          restaurantWaitPay: 0.15,
          optionalFees: [],
        },
      },
      updatedAt: new Date().toISOString(),
    } as const;

    loadProfile.mockResolvedValue({
      profile,
      source: 'local',
      message: null,
    });

    saveProfile.mockResolvedValue({
      profile,
      source: 'local',
      message: 'Saved',
      syncPending: false,
    });

    (useServiceRegistry as jest.Mock).mockReturnValue({
      location: {
        useLocationTracking: () => ({
          state: {
            hasPermission: false,
            tracking: false,
            lastLocation: null,
            error: null,
          },
          requestPermission,
          startTracking,
          stopTracking,
        }),
      },
      profile: {
        loadProfile,
        saveProfile,
        validateDraft,
      },
      featureFlags: {
        useFeatureFlags: () => ({
          state: {
            flags: {
              trackingUpload: true,
              notifications: true,
              mapRouting: true,
              jobStatusActions: true,
              mapShell: true,
            },
            source: 'defaults',
            loading: false,
            error: null,
            updatedAt: null,
          },
          refresh: refreshFlags,
        }),
      },
      analytics,
    });
  });

  it('keeps location errors isolated from profile retry actions', async () => {
    requestPermission.mockResolvedValueOnce(false);

    const screen = renderer.create(<SettingsScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    const permissionButton = screen.root.findByProps({label: 'Request Permission'});
    await act(async () => {
      permissionButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.root.findAllByProps({children: 'Permission denied. Open settings and try again.'}).length,
    ).toBeGreaterThan(0);
    expect(screen.root.findByProps({label: 'Open Settings'})).toBeTruthy();
    expect(() => screen.root.findByProps({label: 'Retry Save'})).toThrow();
  });

  it('shows labeled rate inputs and saves profile from rates tab', async () => {
    const screen = renderer.create(<SettingsScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    // find the top/tab Pressable whose child Text is 'Rates' and press it
    const Pressable = require('react-native').Pressable;
    const ratesPressable = screen.root
      .findAllByType(Pressable)
      .find(p => {
        try {
          return p.findByType(require('react-native').Text).props.children === 'Rates';
        } catch {
          return false;
        }
      });
    expect(ratesPressable).toBeTruthy();
    act(() => {
      ratesPressable!.props.onPress();
    });

    const baseFareInput = screen.root.findByProps({testID: 'rates-packages-baseFare'});
    expect(baseFareInput).toBeTruthy();

    act(() => {
      baseFareInput.props.onChangeText('4.00');
    });

    const addFee = screen.root.findByProps({testID: 'rates-packages-addOptionalFee'});
    // add two rows
    act(() => {
      addFee.props.onPress();
      addFee.props.onPress();
    });

    const fee0Name = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-0-name'});
    const fee0Amount = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-0-amount'});
    const fee1Name = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-1-name'});
    const fee1Amount = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-1-amount'});

    act(() => {
      fee0Name.props.onChangeText('insurance');
      fee0Amount.props.onChangeText('1.00');
      fee1Name.props.onChangeText('bulky');
      fee1Amount.props.onChangeText('2.50');
    });

    const saveButton = screen.root.findByProps({label: 'Save profile'});
    await act(async () => {
      saveButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveProfile).toHaveBeenCalled();
    const savedDraft = (saveProfile as jest.Mock).mock.calls[0][1];
    expect(savedDraft.rateCards.packages.optionalFees).toEqual(['insurance:1.00', 'bulky:2.50']);
  });

  it('allows adding and removing optional fees', async () => {
    const screen = renderer.create(<SettingsScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    // open Rates tab
    const Pressable = require('react-native').Pressable;
    const ratesPressable = screen.root
      .findAllByType(Pressable)
      .find(p => {
        try {
          return p.findByType(require('react-native').Text).props.children === 'Rates';
        } catch {
          return false;
        }
      });
    act(() => {
      ratesPressable!.props.onPress();
    });

    const addFee = screen.root.findByProps({testID: 'rates-packages-addOptionalFee'});
    act(() => {
      addFee.props.onPress();
      addFee.props.onPress();
    });

    const fee0Name = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-0-name'});
    const fee0Amount = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-0-amount'});
    const fee1Name = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-1-name'});
    const fee1Amount = screen.root.findByProps({testID: 'rates-packages-optionalFee-row-1-amount'});

    act(() => {
      fee0Name.props.onChangeText('insurance');
      fee0Amount.props.onChangeText('1.00');
      fee1Name.props.onChangeText('bulky');
      fee1Amount.props.onChangeText('2.50');
    });

    const remove0 = screen.root.findByProps({testID: 'rates-packages-removeOptionalFee-0'});
    act(() => {
      remove0.props.onPress();
    });

    const saveButton = screen.root.findByProps({label: 'Save profile'});
    await act(async () => {
      saveButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveProfile).toHaveBeenCalled();
    const savedDraft = (saveProfile as jest.Mock).mock.calls[(saveProfile as jest.Mock).mock.calls.length - 1][1];
    expect(savedDraft.rateCards.packages.optionalFees).toEqual(['bulky:2.50']);
  });

  it('supports switching payout method to external provider', async () => {
    const screen = renderer.create(<SettingsScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    const Pressable = require('react-native').Pressable;
    const TextInput = require('react-native').TextInput;

    const payoutsPressable = screen.root
      .findAllByType(Pressable)
      .find(p => {
        try {
          return p.findByType(require('react-native').Text).props.children === 'Payouts';
        } catch {
          return false;
        }
      });
    expect(payoutsPressable).toBeTruthy();
    act(() => {
      payoutsPressable!.props.onPress();
    });

    const dropdownTrigger = screen.root.findByProps({testID: 'payout-mode-trigger'});
    act(() => {
      dropdownTrigger.props.onPress();
    });

    const externalOption = screen.root.findByProps({testID: 'payout-mode-option-external_provider'});
    act(() => {
      externalOption.props.onPress();
    });

    const inputs = screen.root.findAllByType(TextInput);
    const externalProviderInput = inputs.find(
      (input: {props: {placeholder?: string}}) =>
        input.props.placeholder === 'PayPal / Cash App / Zelle / Bank Transfer',
    );
    const externalHandleInput = inputs.find(
      (input: {props: {placeholder?: string}}) => input.props.placeholder === 'your-handle / account id',
    );
    expect(externalProviderInput).toBeTruthy();
    expect(externalHandleInput).toBeTruthy();

    act(() => {
      externalProviderInput!.props.onChangeText('PayPal');
      externalHandleInput!.props.onChangeText('courier@example.com');
    });

    const saveButton = screen.root.findByProps({label: 'Save profile'});
    await act(async () => {
      saveButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveProfile).toHaveBeenCalled();
    const savedDraft = (saveProfile as jest.Mock).mock.calls[(saveProfile as jest.Mock).mock.calls.length - 1][1];
    expect(savedDraft.payoutMode).toBe('external_provider');
    expect(savedDraft.externalPayoutProvider).toBe('PayPal');
    expect(savedDraft.externalPayoutHandle).toBe('courier@example.com');
  });
});

import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {useAuth} from '../context/AuthContext';
import {classifyUnknownError, type AppError} from '../services/errorSystem';
import {useServiceRegistry} from '../services/serviceRegistry';
import {
  COURIER_EQUIPMENT_TYPES,
  type CourierProfile,
  type CourierProfileDraft,
} from '../types/profile';
import {senderrTheme} from '../theme/senderrTheme';

const asRateInput = (value: number): string => value.toFixed(2);

const toDraft = (profile: CourierProfile): CourierProfileDraft => ({
  fullName: profile.fullName,
  phoneNumber: profile.phoneNumber,
  profilePhotoUrl: profile.profilePhotoUrl ?? '',
  status: profile.status,
  rejectionReason: profile.rejectionReason ?? '',
  availability: profile.availability,
  isOnline: profile.isOnline,
  serviceRadiusMiles: String(profile.serviceRadiusMiles),
  taxState: profile.taxState,
  vehicle: {
    makeModel: profile.vehicle.makeModel,
    plateNumber: profile.vehicle.plateNumber,
    color: profile.vehicle.color,
  },
  workModes: {
    packagesEnabled: profile.workModes.packagesEnabled,
    foodEnabled: profile.workModes.foodEnabled,
  },
  notificationPrefs: {
    jobOffers: profile.notificationPrefs.jobOffers,
    payoutUpdates: profile.notificationPrefs.payoutUpdates,
    reminders: profile.notificationPrefs.reminders,
  },
  settings: {
    acceptsNewJobs: profile.settings.acceptsNewJobs,
    autoStartTracking: profile.settings.autoStartTracking,
  },
  documents: profile.documents.map(item => ({...item})),
  equipment: Object.fromEntries(
    COURIER_EQUIPMENT_TYPES.map(type => [type, {...profile.equipment[type]}]),
  ) as CourierProfileDraft['equipment'],
  stripe: {
    connectAccountId: profile.stripe.connectAccountId,
    accountStatus: profile.stripe.accountStatus,
    chargesEnabled: profile.stripe.chargesEnabled,
    payoutsEnabled: profile.stripe.payoutsEnabled,
    requirementsDue: [...profile.stripe.requirementsDue],
    requirementsPastDue: [...profile.stripe.requirementsPastDue],
  },
  payoutMode: profile.payoutMode,
  externalPayoutProvider: profile.externalPayoutProvider,
  externalPayoutHandle: profile.externalPayoutHandle,
  stats: {
    todayJobs: profile.stats.todayJobs,
    completedJobs: profile.stats.completedJobs,
  },
  rateCards: {
    packages: {
      baseFare: asRateInput(profile.rateCards.packages.baseFare),
      perMile: asRateInput(profile.rateCards.packages.perMile),
      perMinute: asRateInput(profile.rateCards.packages.perMinute),
      optionalFees: profile.rateCards.packages.optionalFees,
    },
    food: {
      baseFare: asRateInput(profile.rateCards.food.baseFare),
      perMile: asRateInput(profile.rateCards.food.perMile),
      restaurantWaitPay: asRateInput(profile.rateCards.food.restaurantWaitPay),
      optionalFees: profile.rateCards.food.optionalFees,
    },
  },
});

export const OnboardingScreen = ({
  onComplete,
}: {
  onComplete: () => Promise<void>;
}): React.JSX.Element => {
  const {session} = useAuth();
  const {profile: profileService} = useServiceRegistry();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CourierProfileDraft | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async (): Promise<void> => {
      if (!session) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await profileService.loadProfile(session);
        if (!mounted) {
          return;
        }
        const nextDraft = toDraft(result.profile);
        setDraft(nextDraft);
        setFullName(nextDraft.fullName);
        setPhoneNumber(nextDraft.phoneNumber);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(
          classifyUnknownError(loadError, {
            source: 'onboarding_load_profile',
            fallbackMessage: 'Unable to load onboarding profile.',
          }),
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [profileService, session]);

  const handleContinue = async (): Promise<void> => {
    if (!session || !draft) {
      await onComplete();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextDraft: CourierProfileDraft = {
        ...draft,
        fullName: fullName.trim() || draft.fullName,
        phoneNumber: phoneNumber.trim(),
      };
      const validationErrors = profileService.validateDraft(nextDraft);
      if (validationErrors.fullName) {
        throw new Error(validationErrors.fullName);
      }
      if (validationErrors.phoneNumber) {
        throw new Error(validationErrors.phoneNumber);
      }
      await profileService.saveProfile(session, nextDraft);
      await onComplete();
    } catch (saveError) {
      setError(
        classifyUnknownError(saveError, {
          source: 'onboarding_save_profile',
          fallbackMessage: 'Unable to finish onboarding.',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.kickerRow}>
          <Text style={styles.kicker}>Welcome to Senderr Courier</Text>
          <Text style={styles.step}>Step 1 of 1</Text>
        </View>
        <Text style={styles.title}>Finish account setup</Text>
        <Text style={styles.description}>
          Add your name and phone so dispatch and customers can identify you during active jobs.
        </Text>

        <Text style={styles.inputLabel}>Full name</Text>
        <TextInput
          placeholder="Full name"
          autoCorrect={false}
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          testID="onboarding-fullname"
          accessibilityLabel="Full name"
        />
        <Text style={styles.inputLabel}>Phone number</Text>
        <TextInput
          placeholder="Phone number (optional)"
          keyboardType="phone-pad"
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          testID="onboarding-phone"
          accessibilityLabel="Phone number"
        />

        {error ? <Text style={styles.error}>{error.userMessage}</Text> : null}

        <PrimaryButton
          label={saving ? 'Saving profile...' : 'Continue to app'}
          disabled={disabled}
          onPress={() => {
            void handleContinue();
          }}
        />
        <PrimaryButton
          label="Skip for now"
          variant="secondary"
          disabled={disabled}
          onPress={() => {
            void onComplete();
          }}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
    shadowColor: '#1F2338',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
  },
  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
  },
  step: {
    color: senderrTheme.colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
  },
  description: {
    color: senderrTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: senderrTheme.colors.surfaceMuted,
    color: senderrTheme.colors.textPrimary,
    marginBottom: 10,
  },
  inputLabel: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
  },
  error: {
    color: senderrTheme.colors.danger,
    fontWeight: '600',
  },
});

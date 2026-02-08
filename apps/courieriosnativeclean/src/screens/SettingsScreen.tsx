import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, TextInput, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {EmptyState} from '../components/states/EmptyState';
import {ErrorState} from '../components/states/ErrorState';
import {LoadingState} from '../components/states/LoadingState';
import {ScreenContainer} from '../components/ScreenContainer';
import {runtimeConfig} from '../config/runtime';
import {useAuth} from '../context/AuthContext';
import type {CourierProfileValidationErrors} from '../services/ports/profilePort';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {CourierAvailability, CourierProfile, CourierProfileDraft} from '../types/profile';

type Feedback = {
  tone: 'error' | 'info';
  text: string;
};

const asRateInput = (value: number): string => value.toFixed(2);

const toDraft = (profile: CourierProfile): CourierProfileDraft => ({
  fullName: profile.fullName,
  phoneNumber: profile.phoneNumber,
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

const AVAILABILITY_OPTIONS: CourierAvailability[] = ['available', 'busy', 'offline'];

export const SettingsScreen = (): React.JSX.Element => {
  const {session, signOutUser} = useAuth();
  const {location: locationService, profile: profileService, analytics} = useServiceRegistry();
  const {state: locationState, requestPermission, startTracking, stopTracking} = locationService.useLocationTracking();

  const [profileDraft, setProfileDraft] = useState<CourierProfileDraft | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [validationErrors, setValidationErrors] = useState<CourierProfileValidationErrors>({});
  const [profileSource, setProfileSource] = useState<'firebase' | 'local'>('local');
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async (): Promise<void> => {
      if (!session) {
        if (mounted) {
          setProfileLoadError(null);
          setLoadingProfile(false);
        }
        return;
      }

      setLoadingProfile(true);
      setProfileLoadError(null);
      setFeedback(null);
      try {
        const result = await profileService.loadProfile(session);
        if (!mounted) {
          return;
        }
        setProfileDraft(toDraft(result.profile));
        setProfileSource(result.source);
        if (result.message) {
          setFeedback({
            tone: 'info',
            text: result.message,
          });
        }
      } catch (error) {
        if (!mounted) {
          return;
        }
        setProfileLoadError(error instanceof Error ? error.message : 'Unable to load courier profile.');
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [loadAttempt, profileService, session]);

  const canSaveProfile = useMemo(() => Boolean(profileDraft) && !savingProfile && !loadingProfile, [
    profileDraft,
    savingProfile,
    loadingProfile,
  ]);

  const retryProfileLoad = useCallback((): void => {
    setLoadAttempt(previous => previous + 1);
  }, []);

  const updateDraft = (updater: (previous: CourierProfileDraft) => CourierProfileDraft): void => {
    setProfileDraft(previous => {
      if (!previous) {
        return previous;
      }
      return updater(previous);
    });
  };

  const updateTextField = (field: 'fullName' | 'phoneNumber', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateVehicleField = (field: 'makeModel' | 'plateNumber' | 'color', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      vehicle: {
        ...previous.vehicle,
        [field]: value,
      },
    }));
  };

  const updateSettingsField = (field: 'acceptsNewJobs' | 'autoStartTracking', value: boolean): void => {
    updateDraft(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        [field]: value,
      },
    }));
  };

  const updateAvailability = (availability: CourierAvailability): void => {
    updateDraft(previous => ({
      ...previous,
      availability,
    }));
  };

  const updatePackagesRateField = (field: 'baseFare' | 'perMile' | 'perMinute', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      rateCards: {
        ...previous.rateCards,
        packages: {
          ...previous.rateCards.packages,
          [field]: value,
        },
      },
    }));
  };

  const updateFoodRateField = (field: 'baseFare' | 'perMile' | 'restaurantWaitPay', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      rateCards: {
        ...previous.rateCards,
        food: {
          ...previous.rateCards.food,
          [field]: value,
        },
      },
    }));
  };

  const saveProfile = async (): Promise<void> => {
    if (!session || !profileDraft) {
      return;
    }

    const nextErrors = profileService.validateDraft(profileDraft);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback({
        tone: 'error',
        text: 'Please fix the highlighted fields and try again.',
      });
      return;
    }

    setSavingProfile(true);
    setFeedback({tone: 'info', text: 'Saving profile...'});

    try {
      const result = await profileService.saveProfile(session, profileDraft);
      setProfileDraft(toDraft(result.profile));
      setProfileSource(result.source);
      setFeedback({
        tone: result.syncPending ? 'error' : 'info',
        text: result.message,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to save courier profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const requestLocationPermission = (): void => {
    void requestPermission().catch(error => {
      void analytics.recordError(error, 'settings_request_permission_failed');
    });
  };

  const startLocationTracking = (): void => {
    void (async () => {
      try {
        await startTracking();
        void analytics.track('tracking_started', {
          from_screen: 'settings',
        });
      } catch (error) {
        void analytics.track('tracking_error', {
          from_screen: 'settings',
          action: 'start',
        });
        void analytics.recordError(error, 'settings_tracking_start_failed');
      }
    })();
  };

  const stopLocationTracking = (): void => {
    stopTracking();
    void analytics.track('tracking_stopped', {
      from_screen: 'settings',
    });
  };

  const sendTelemetryTest = (): void => {
    void analytics.track('tracking_error', {
      manual_test: true,
      env: runtimeConfig.envName,
    });
    void analytics.recordError(new Error('senderr_manual_nonfatal_test'), 'settings_manual_test');
    setFeedback({
      tone: 'info',
      text: 'Telemetry test event sent.',
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.text}>Signed in as {session?.email ?? 'unknown'}</Text>
        <Text style={styles.text}>Provider: {session?.provider ?? 'none'}</Text>
        <PrimaryButton
          label="Sign out"
          variant="danger"
          onPress={() => {
            void signOutUser();
          }}
        />
        {runtimeConfig.envName !== 'prod' ? (
          <PrimaryButton
            label="Send telemetry test event"
            variant="secondary"
            onPress={sendTelemetryTest}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Courier Profile</Text>
        {loadingProfile && !profileDraft ? (
          <LoadingState
            title="Loading profile"
            message="Fetching your latest profile settings..."
          />
        ) : null}

        {!loadingProfile && profileLoadError && !profileDraft ? (
          <ErrorState
            title="Unable to load profile"
            message={profileLoadError}
            retryLabel="Retry"
            onRetry={retryProfileLoad}
          />
        ) : null}

        {!loadingProfile && !profileLoadError && !profileDraft ? (
          <EmptyState
            title="No profile data"
            message="We couldn't find your courier profile yet."
            actionLabel="Reload"
            onAction={retryProfileLoad}
          />
        ) : null}

        {profileDraft ? (
          <>
            <Text style={styles.sectionLabel}>Name</Text>
            <TextInput
              style={[styles.input, validationErrors.fullName ? styles.inputError : null]}
              value={profileDraft.fullName}
              onChangeText={value => updateTextField('fullName', value)}
              placeholder="Courier name"
              autoCapitalize="words"
            />
            {validationErrors.fullName ? <Text style={styles.error}>{validationErrors.fullName}</Text> : null}

            <Text style={styles.sectionLabel}>Phone</Text>
            <TextInput
              style={[styles.input, validationErrors.phoneNumber ? styles.inputError : null]}
              value={profileDraft.phoneNumber}
              onChangeText={value => updateTextField('phoneNumber', value)}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            {validationErrors.phoneNumber ? <Text style={styles.error}>{validationErrors.phoneNumber}</Text> : null}

            <Text style={styles.sectionLabel}>Availability</Text>
            <View style={styles.row}>
              {AVAILABILITY_OPTIONS.map(option => {
                const active = profileDraft.availability === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.pill, active ? styles.pillActive : null]}
                    onPress={() => updateAvailability(option)}>
                    <Text style={[styles.pillLabel, active ? styles.pillLabelActive : null]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {validationErrors.availability ? <Text style={styles.error}>{validationErrors.availability}</Text> : null}

            <Text style={styles.sectionLabel}>Vehicle (optional)</Text>
            <TextInput
              style={[styles.input, validationErrors.vehicleMakeModel ? styles.inputError : null]}
              value={profileDraft.vehicle.makeModel}
              onChangeText={value => updateVehicleField('makeModel', value)}
              placeholder="Make / model"
            />
            {validationErrors.vehicleMakeModel ? <Text style={styles.error}>{validationErrors.vehicleMakeModel}</Text> : null}

            <TextInput
              style={[styles.input, validationErrors.vehiclePlateNumber ? styles.inputError : null]}
              value={profileDraft.vehicle.plateNumber}
              onChangeText={value => updateVehicleField('plateNumber', value)}
              placeholder="Plate number"
              autoCapitalize="characters"
            />
            {validationErrors.vehiclePlateNumber ? (
              <Text style={styles.error}>{validationErrors.vehiclePlateNumber}</Text>
            ) : null}

            <TextInput
              style={[styles.input, validationErrors.vehicleColor ? styles.inputError : null]}
              value={profileDraft.vehicle.color}
              onChangeText={value => updateVehicleField('color', value)}
              placeholder="Vehicle color"
            />
            {validationErrors.vehicleColor ? <Text style={styles.error}>{validationErrors.vehicleColor}</Text> : null}

            <Text style={styles.subsectionLabel}>Package Rate Card</Text>
            <Text style={styles.text}>Rates used for package-delivery jobs.</Text>
            <TextInput
              style={[styles.input, validationErrors.packagesBaseFare ? styles.inputError : null]}
              value={profileDraft.rateCards.packages.baseFare}
              onChangeText={value => updatePackagesRateField('baseFare', value)}
              placeholder="Base fare (e.g. 3.00)"
              keyboardType="decimal-pad"
            />
            {validationErrors.packagesBaseFare ? (
              <Text style={styles.error}>{validationErrors.packagesBaseFare}</Text>
            ) : null}

            <TextInput
              style={[styles.input, validationErrors.packagesPerMile ? styles.inputError : null]}
              value={profileDraft.rateCards.packages.perMile}
              onChangeText={value => updatePackagesRateField('perMile', value)}
              placeholder="Per-mile rate (e.g. 1.20)"
              keyboardType="decimal-pad"
            />
            {validationErrors.packagesPerMile ? (
              <Text style={styles.error}>{validationErrors.packagesPerMile}</Text>
            ) : null}

            <TextInput
              style={[styles.input, validationErrors.packagesPerMinute ? styles.inputError : null]}
              value={profileDraft.rateCards.packages.perMinute}
              onChangeText={value => updatePackagesRateField('perMinute', value)}
              placeholder="Per-minute rate (e.g. 0.25)"
              keyboardType="decimal-pad"
            />
            {validationErrors.packagesPerMinute ? (
              <Text style={styles.error}>{validationErrors.packagesPerMinute}</Text>
            ) : null}

            <Text style={styles.subsectionLabel}>Food Rate Card</Text>
            <Text style={styles.text}>Rates used for restaurant/food-delivery jobs.</Text>
            <TextInput
              style={[styles.input, validationErrors.foodBaseFare ? styles.inputError : null]}
              value={profileDraft.rateCards.food.baseFare}
              onChangeText={value => updateFoodRateField('baseFare', value)}
              placeholder="Base fare (e.g. 2.50)"
              keyboardType="decimal-pad"
            />
            {validationErrors.foodBaseFare ? <Text style={styles.error}>{validationErrors.foodBaseFare}</Text> : null}

            <TextInput
              style={[styles.input, validationErrors.foodPerMile ? styles.inputError : null]}
              value={profileDraft.rateCards.food.perMile}
              onChangeText={value => updateFoodRateField('perMile', value)}
              placeholder="Per-mile rate (e.g. 1.50)"
              keyboardType="decimal-pad"
            />
            {validationErrors.foodPerMile ? <Text style={styles.error}>{validationErrors.foodPerMile}</Text> : null}

            <TextInput
              style={[styles.input, validationErrors.foodRestaurantWaitPay ? styles.inputError : null]}
              value={profileDraft.rateCards.food.restaurantWaitPay}
              onChangeText={value => updateFoodRateField('restaurantWaitPay', value)}
              placeholder="Restaurant wait pay (e.g. 0.15)"
              keyboardType="decimal-pad"
            />
            {validationErrors.foodRestaurantWaitPay ? (
              <Text style={styles.error}>{validationErrors.foodRestaurantWaitPay}</Text>
            ) : null}

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.sectionLabel}>Accept new jobs</Text>
                <Text style={styles.text}>Control dispatch eligibility.</Text>
              </View>
              <Switch
                value={profileDraft.settings.acceptsNewJobs}
                onValueChange={value => updateSettingsField('acceptsNewJobs', value)}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.sectionLabel}>Auto-start tracking</Text>
                <Text style={styles.text}>Start location updates automatically after sign in.</Text>
              </View>
              <Switch
                value={profileDraft.settings.autoStartTracking}
                onValueChange={value => updateSettingsField('autoStartTracking', value)}
              />
            </View>

            <PrimaryButton
              label={savingProfile ? 'Saving...' : 'Save profile'}
              disabled={!canSaveProfile}
              onPress={() => {
                void saveProfile();
              }}
            />

            <Text style={styles.text}>Profile source: {profileSource}</Text>
          </>
        ) : null}

        {profileLoadError && profileDraft ? (
          <ErrorState
            compact
            title="Profile may be stale"
            message={profileLoadError}
            retryLabel="Retry load"
            onRetry={retryProfileLoad}
          />
        ) : null}

        {feedback ? <Text style={feedback.tone === 'error' ? styles.error : styles.info}>{feedback.text}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Location Permissions</Text>
        <Text style={styles.text}>Permission: {locationState.hasPermission ? 'Granted' : 'Not granted'}</Text>
        <Text style={styles.text}>Tracking: {locationState.tracking ? 'Active' : 'Inactive'}</Text>
        {locationState.lastLocation ? (
          <Text style={styles.text}>
            Last: {locationState.lastLocation.latitude.toFixed(5)}, {locationState.lastLocation.longitude.toFixed(5)}
          </Text>
        ) : null}
        {locationState.error ? <Text style={styles.error}>{locationState.error}</Text> : null}

        <View style={styles.row}>
          <PrimaryButton
            label="Request Permission"
            variant="secondary"
            onPress={requestLocationPermission}
          />
          <PrimaryButton
            label="Start"
            onPress={startLocationTracking}
          />
          <PrimaryButton label="Stop" variant="secondary" onPress={stopLocationTracking} />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sectionLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  subsectionLabel: {
    color: '#1f2937',
    fontWeight: '700',
    marginTop: 8,
  },
  text: {
    color: '#374151',
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
  },
  info: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  pill: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  pillActive: {
    backgroundColor: '#1453ff',
    borderColor: '#1453ff',
  },
  pillLabel: {
    color: '#1f2937',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pillLabelActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
  },
});

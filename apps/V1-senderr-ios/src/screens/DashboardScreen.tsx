import React, {useEffect, useMemo, useRef} from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';

import {EmptyState} from '../components/states/EmptyState';
import {ErrorState} from '../components/states/ErrorState';
import {LoadingState} from '../components/states/LoadingState';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import {
  classifyUnknownError,
  formatErrorContext,
  getErrorResolution,
  type AppError,
} from '../services/errorSystem';
import type {JobsSyncState} from '../services/ports/jobsPort';
import type {LocationSnapshot} from '../services/ports/locationPort';
import {deriveSyncHealth, formatLocationSampleTime, formatSyncTime} from './viewModels/jobsViewState';
import type {Job} from '../types/jobs';
import {senderrTheme} from '../theme/senderrTheme';

type DashboardScreenProps = {
  onOpenJobs: () => void;
  onRetryJobs: () => void;
  activeJobsCount: number;
  loadingJobs: boolean;
  jobsError: string | null;
  jobsSyncState: JobsSyncState;
  activeJob: Job | null;
};

type JobsMapCardProps = {
  activeJob: Job | null;
  courierLocation: LocationSnapshot | null;
};

type TrackingHealth = {
  label: string;
  detail: string;
  tone: 'idle' | 'good' | 'degraded' | 'error';
};

const LOCATION_STALE_THRESHOLD_MS = 45_000;

const JobsMapCardFallback = ({activeJob, courierLocation}: JobsMapCardProps): React.JSX.Element => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Map Validation</Text>
    <Text style={styles.subtitle}>
      {activeJob || courierLocation
        ? 'Map component is unavailable in this runtime. Restart Metro with --reset-cache and rebuild.'
        : 'No active job yet.'}
    </Text>
  </View>
);

const loadJobsMapCard = (): React.ComponentType<JobsMapCardProps> => {
  try {
    // Metro can serve stale module state after path/branch changes.
    // Resolve lazily so dashboard stays alive with a clear fallback.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mapModule = require('../components/JobsMapCard');
    return mapModule?.JobsMapCard ?? JobsMapCardFallback;
  } catch {
    return JobsMapCardFallback;
  }
};

export const DashboardScreen = ({
  onOpenJobs,
  onRetryJobs,
  activeJobsCount,
  loadingJobs,
  jobsError,
  jobsSyncState,
  activeJob,
}: DashboardScreenProps): React.JSX.Element => {
  const JobsMapCard = loadJobsMapCard();
  const {session} = useAuth();
  const {location: locationService, analytics} = useServiceRegistry();
  const {state: locationState, requestPermission, startTracking, stopTracking} = locationService.useLocationTracking();
  const lastTrackingError = useRef<string | null>(null);
  const [trackingActionError, setTrackingActionError] = React.useState<AppError | null>(null);

  const syncHealth = deriveSyncHealth(jobsSyncState);

  const trackingHealth = useMemo<TrackingHealth>(() => {
    if (locationState.error) {
      return {
        label: 'Error',
        detail: locationState.error,
        tone: 'error',
      };
    }

    if (!locationState.tracking) {
      return {
        label: 'Paused',
        detail: 'Tracking is not active.',
        tone: 'idle',
      };
    }

    if (!locationState.lastLocation) {
      return {
        label: 'Starting',
        detail: 'Waiting for first location sample.',
        tone: 'degraded',
      };
    }

    const locationAge = Date.now() - locationState.lastLocation.timestamp;
    if (locationAge > LOCATION_STALE_THRESHOLD_MS) {
      return {
        label: 'Stale',
        detail: `Last sample is ${Math.round(locationAge / 1000)}s old.`,
        tone: 'degraded',
      };
    }

    if (syncHealth.tone === 'error') {
      return {
        label: 'Degraded',
        detail: 'Network sync is failing. Uploads may be delayed.',
        tone: 'degraded',
      };
    }

    if (syncHealth.tone === 'degraded') {
      return {
        label: 'Recovering',
        detail: 'Sync is reconnecting. Upload health may fluctuate.',
        tone: 'degraded',
      };
    }

    return {
      label: 'Healthy',
      detail: 'Tracking and sync are healthy.',
      tone: 'good',
    };
  }, [locationState.error, locationState.lastLocation, locationState.tracking, syncHealth.tone]);

  useEffect(() => {
    if (locationState.error && locationState.error !== lastTrackingError.current) {
      lastTrackingError.current = locationState.error;
      const classified = classifyUnknownError(new Error(locationState.error), {
        source: 'dashboard_tracking_state',
        fallbackMessage: 'Location tracking issue detected.',
      });
      void analytics.track('tracking_error', {
        message: locationState.error.slice(0, 100),
      });
      void analytics.recordError(new Error(locationState.error), formatErrorContext('dashboard_tracking_state', classified));
    }

    if (!locationState.error) {
      lastTrackingError.current = null;
    }
  }, [analytics, locationState.error]);

  const handleStartTracking = (): void => {
    void (async () => {
      try {
        await startTracking();
        setTrackingActionError(null);
        void analytics.track('tracking_started', {
          has_permission: locationState.hasPermission,
          from_screen: 'dashboard',
        });
      } catch (error) {
        const classified = classifyUnknownError(error, {
          source: 'dashboard_start_tracking',
          fallbackMessage: 'Unable to start tracking.',
        });
        setTrackingActionError(classified);
        void analytics.track('tracking_error', {
          from_screen: 'dashboard',
          action: 'start',
        });
        void analytics.recordError(error, formatErrorContext('dashboard_start_tracking', classified));
      }
    })();
  };

  const handleStopTracking = (): void => {
    stopTracking();
    void analytics.track('tracking_stopped', {
      from_screen: 'dashboard',
    });
  };

  const handleRetryTracking = (): void => {
    void (async () => {
      if (!locationState.hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setTrackingActionError(
            classifyUnknownError(new Error('Location permission denied.'), {
              source: 'dashboard_retry_tracking',
              fallbackMessage: 'Location permission denied.',
            }),
          );
          return;
        }
      }
      try {
        await startTracking();
        setTrackingActionError(null);
      } catch (error) {
        const classified = classifyUnknownError(error, {
          source: 'dashboard_retry_tracking',
          fallbackMessage: 'Unable to retry tracking.',
        });
        setTrackingActionError(classified);
        void analytics.recordError(error, formatErrorContext('dashboard_retry_tracking', classified));
      }
    })();
  };

  const trackingResolution = trackingActionError ? getErrorResolution(trackingActionError) : null;

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back, {session?.displayName ?? 'Courier'}</Text>
        <Text style={styles.subtitle}>{session?.email ?? 'No active session'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today</Text>
        {loadingJobs && activeJobsCount === 0 ? (
          <LoadingState
            compact
            title="Loading jobs"
            message="Checking active assignments..."
          />
        ) : null}

        {!loadingJobs && jobsError && activeJobsCount === 0 ? (
          <ErrorState
            compact
            title="Unable to load jobs"
            message={jobsError}
            retryLabel="Retry jobs"
            onRetry={onRetryJobs}
          />
        ) : null}

        {!loadingJobs && !jobsError && activeJobsCount === 0 ? (
          <EmptyState
            compact
            title="No active jobs"
            message="You are online, but there are no active assignments right now."
            actionLabel="Refresh"
            onAction={onRetryJobs}
          />
        ) : null}

        {activeJobsCount > 0 ? <Text style={styles.metric}>{activeJobsCount} active jobs</Text> : null}

        {activeJobsCount > 0 && jobsError ? (
          <ErrorState
            compact
            title="Live updates interrupted"
            message={jobsError}
            retryLabel="Retry jobs"
            onRetry={onRetryJobs}
          />
        ) : null}

        <PrimaryButton
          label="Open Jobs"
          onPress={onOpenJobs}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Location tracking</Text>
        <Text style={styles.subtitle}>Tracking status: {trackingHealth.label}</Text>
        <Text style={styles.subtitle}>{trackingHealth.detail}</Text>
        <Text style={styles.subtitle}>Last location sample: {formatLocationSampleTime(locationState.lastLocation?.timestamp ?? null)}</Text>
        <Text style={styles.subtitle}>Upload health: {syncHealth.title}</Text>
        <Text style={styles.subtitle}>Last sync: {formatSyncTime(jobsSyncState.lastSyncedAt)}</Text>

        <View style={styles.row}>
          <PrimaryButton
            label={locationState.tracking ? 'Tracking active' : 'Start tracking'}
            disabled={locationState.tracking}
            onPress={handleStartTracking}
          />
          <PrimaryButton
            label="Stop"
            variant="secondary"
            disabled={!locationState.tracking}
            onPress={handleStopTracking}
          />
          {trackingHealth.tone === 'error' || trackingHealth.tone === 'degraded' ? (
            <PrimaryButton
              label="Retry"
              variant="secondary"
              onPress={handleRetryTracking}
            />
          ) : null}
        </View>
        {trackingActionError ? (
          <Text style={styles.error}>{trackingActionError.userMessage}</Text>
        ) : null}
        {trackingResolution?.action === 'open_settings' ? (
          <PrimaryButton
            label="Open Settings"
            variant="secondary"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        ) : null}
        {trackingResolution?.action === 'retry' ? (
          <PrimaryButton
            label={trackingResolution.label ?? 'Retry'}
            variant="secondary"
            onPress={handleRetryTracking}
          />
        ) : null}
        {trackingResolution?.action === 'refresh' ? (
          <PrimaryButton
            label="Refresh jobs"
            variant="secondary"
            onPress={onRetryJobs}
          />
        ) : null}
        {trackingResolution?.escalationMessage ? (
          <Text style={styles.subtitle}>{trackingResolution.escalationMessage}</Text>
        ) : null}
      </View>

      <JobsMapCard activeJob={activeJob} courierLocation={locationState.lastLocation} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
  },
  subtitle: {
    color: senderrTheme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: senderrTheme.colors.textPrimary,
  },
  metric: {
    fontSize: 24,
    fontWeight: '800',
    color: senderrTheme.colors.brandPrimary,
  },
  error: {
    color: senderrTheme.colors.danger,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});

import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {EmptyState} from '../components/states/EmptyState';
import {ErrorState} from '../components/states/ErrorState';
import {LoadingState} from '../components/states/LoadingState';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {JobsSyncState} from '../services/ports/jobsPort';
import type {LocationSnapshot} from '../services/ports/locationPort';
import {deriveSyncHealth, formatLocationSampleTime, formatSyncTime} from './viewModels/jobsViewState';
import type {Job} from '../types/jobs';

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
      void analytics.track('tracking_error', {
        message: locationState.error.slice(0, 100),
      });
      void analytics.recordError(new Error(locationState.error), 'tracking_state_error');
    }

    if (!locationState.error) {
      lastTrackingError.current = null;
    }
  }, [analytics, locationState.error]);

  const handleStartTracking = (): void => {
    void (async () => {
      try {
        await startTracking();
        void analytics.track('tracking_started', {
          has_permission: locationState.hasPermission,
          from_screen: 'dashboard',
        });
      } catch (error) {
        void analytics.track('tracking_error', {
          from_screen: 'dashboard',
          action: 'start',
        });
        void analytics.recordError(error, 'tracking_start_failed');
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
          return;
        }
      }
      await startTracking();
    })();
  };

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
      </View>

      <JobsMapCard activeJob={activeJob} courierLocation={locationState.lastLocation} />
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
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  metric: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1453ff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});

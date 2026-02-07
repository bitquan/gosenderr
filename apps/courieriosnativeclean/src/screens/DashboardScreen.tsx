import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {Job} from '../types/jobs';

export const DashboardScreen = ({onOpenJobs}: {onOpenJobs: () => void}): React.JSX.Element => {
  const {session} = useAuth();
  const {jobs: jobsService, location: locationService} = useServiceRegistry();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const {state: locationState, startTracking, stopTracking} = locationService.useLocationTracking();

  useEffect(() => {
    const loadJobs = async (): Promise<void> => {
      if (!session) {
        return;
      }

      setLoadingJobs(true);
      setJobsError(null);
      try {
        setJobs(await jobsService.fetchJobs(session));
      } catch (error) {
        setJobsError(error instanceof Error ? error.message : 'Unable to load jobs.');
      } finally {
        setLoadingJobs(false);
      }
    };

    void loadJobs();
  }, [jobsService, session]);

  const activeJobsCount = useMemo(
    () => jobs.filter(job => job.status !== 'delivered' && job.status !== 'cancelled').length,
    [jobs],
  );

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back, {session?.displayName ?? 'Courier'}</Text>
        <Text style={styles.subtitle}>{session?.email ?? 'No active session'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today</Text>
        <Text style={styles.metric}>{loadingJobs ? 'Loading jobs...' : `${activeJobsCount} active jobs`}</Text>
        {jobsError ? <Text style={styles.error}>{jobsError}</Text> : null}
        <PrimaryButton
          label="Open Jobs"
          onPress={onOpenJobs}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Location tracking</Text>
        <Text style={styles.subtitle}>
          {locationState.lastLocation
            ? `Lat ${locationState.lastLocation.latitude.toFixed(5)}, Lng ${locationState.lastLocation.longitude.toFixed(
                5,
              )}`
            : 'No location sample yet.'}
        </Text>
        {locationState.error ? <Text style={styles.error}>{locationState.error}</Text> : null}
        <View style={styles.row}>
          <PrimaryButton
            label={locationState.tracking ? 'Tracking active' : 'Start tracking'}
            disabled={locationState.tracking}
            onPress={() => {
              void startTracking();
            }}
          />
          <PrimaryButton
            label="Stop"
            variant="secondary"
            disabled={!locationState.tracking}
            onPress={stopTracking}
          />
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
  },
  error: {
    color: '#dc2626',
    fontWeight: '600',
  },
});

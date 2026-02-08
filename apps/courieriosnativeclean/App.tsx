import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {AuthProvider, useAuth} from './src/context/AuthContext';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {JobDetailScreen} from './src/screens/JobDetailScreen';
import {JobsScreen} from './src/screens/JobsScreen';
import {LoginScreen} from './src/screens/LoginScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {configureRuntime, type NativeRuntimeConfig} from './src/config/runtime';
import type {JobsSubscription, JobsSyncState} from './src/services/ports/jobsPort';
import {ServiceRegistryProvider, useServiceRegistry} from './src/services/serviceRegistry';
import type {Job} from './src/types/jobs';

type TabKey = 'dashboard' | 'jobs' | 'settings';

const DEFAULT_JOBS_SYNC_STATE: JobsSyncState = {
  status: 'idle',
  stale: false,
  reconnectAttempt: 0,
  lastSyncedAt: null,
  message: null,
  source: 'firebase',
};

const AppShell = (): React.JSX.Element => {
  const {session, initializing} = useAuth();
  const {jobs: jobsService} = useServiceRegistry();
  const jobsSubscriptionRef = useRef<JobsSubscription | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsSyncState, setJobsSyncState] = useState<JobsSyncState>(DEFAULT_JOBS_SYNC_STATE);

  useEffect(() => {
    jobsSubscriptionRef.current?.unsubscribe();
    jobsSubscriptionRef.current = null;

    if (!session) {
      setJobs([]);
      setSelectedJobId(null);
      setJobsLoading(false);
      setJobsError(null);
      setJobsSyncState(DEFAULT_JOBS_SYNC_STATE);
      return;
    }

    setJobsLoading(true);
    setJobsError(null);

    const subscription = jobsService.subscribeJobs(session, {
      onJobs: nextJobs => {
        setJobs(nextJobs);
        setJobsLoading(false);
      },
      onSyncState: nextSyncState => {
        setJobsSyncState(nextSyncState);
        if (nextSyncState.status === 'error' && nextSyncState.message) {
          setJobsError(nextSyncState.message);
          setJobsLoading(false);
        }
        if (nextSyncState.status === 'live' || nextSyncState.status === 'stale') {
          setJobsLoading(false);
        }
      },
    });

    jobsSubscriptionRef.current = subscription;

    void subscription.refresh().catch(error => {
      setJobsError(error instanceof Error ? error.message : 'Unable to load jobs.');
      setJobsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (jobsSubscriptionRef.current === subscription) {
        jobsSubscriptionRef.current = null;
      }
    };
  }, [jobsService, session]);

  const refreshJobs = useCallback(async (): Promise<Job[]> => {
    if (!session) {
      return [];
    }

    setJobsError(null);
    try {
      const nextJobs = jobsSubscriptionRef.current
        ? await jobsSubscriptionRef.current.refresh()
        : await jobsService.fetchJobs(session);
      setJobs(nextJobs);
      return nextJobs;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh jobs.';
      setJobsError(message);
      throw error;
    }
  }, [jobsService, session]);

  const selectedJob = useMemo(
    () => (selectedJobId ? jobs.find(job => job.id === selectedJobId) ?? null : null),
    [jobs, selectedJobId],
  );
  const activeJobs = useMemo(() => jobs.filter(job => job.status !== 'delivered' && job.status !== 'cancelled'), [jobs]);
  const activeJobsCount = activeJobs.length;
  const activeJob = activeJobs[0] ?? null;

  if (initializing) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#1453ff" />
        <Text style={styles.loadingText}>Starting Senderr...</Text>
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (selectedJob) {
    return (
      <JobDetailScreen
        job={selectedJob}
        onBack={() => setSelectedJobId(null)}
        onJobUpdated={updatedJob => {
          setJobs(prev => prev.map(job => (job.id === updatedJob.id ? updatedJob : job)));
          setSelectedJobId(updatedJob.id);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'dashboard' ? (
          <DashboardScreen
            onOpenJobs={() => setActiveTab('jobs')}
            activeJobsCount={activeJobsCount}
            loadingJobs={jobsLoading}
            jobsError={jobsError}
            activeJob={activeJob}
          />
        ) : null}

        {activeTab === 'jobs' ? (
          <>
            {jobsLoading ? (
              <View style={styles.jobsLoadingCard}>
                <ActivityIndicator size="small" color="#1453ff" />
                <Text style={styles.jobsLoadingText}>Loading jobs...</Text>
              </View>
            ) : null}
            {jobsError ? <Text style={styles.jobsError}>{jobsError}</Text> : null}
            <JobsScreen
              jobs={jobs}
              setJobs={setJobs}
              syncState={jobsSyncState}
              onRefresh={refreshJobs}
              onOpenDetail={jobId => {
                setSelectedJobId(jobId);
              }}
            />
          </>
        ) : null}

        {activeTab === 'settings' ? <SettingsScreen /> : null}
      </View>

      <View style={styles.tabBar}>
        <TabButton active={activeTab === 'dashboard'} label="Dashboard" onPress={() => setActiveTab('dashboard')} />
        <TabButton active={activeTab === 'jobs'} label="Jobs" onPress={() => setActiveTab('jobs')} />
        <TabButton active={activeTab === 'settings'} label="Settings" onPress={() => setActiveTab('settings')} />
      </View>
    </View>
  );
};

const TabButton = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element => {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active ? styles.tabButtonActive : null]}>
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
    </Pressable>
  );
};

type AppProps = {
  runtimeConfig?: NativeRuntimeConfig;
};

function App({runtimeConfig}: AppProps): React.JSX.Element {
  configureRuntime(runtimeConfig);

  return (
    <ServiceRegistryProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ServiceRegistryProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  content: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
    gap: 12,
  },
  loadingText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '600',
  },
  jobsLoadingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobsLoadingText: {
    color: '#374151',
    fontWeight: '600',
  },
  jobsError: {
    marginHorizontal: 16,
    marginTop: 8,
    color: '#dc2626',
    fontWeight: '600',
  },
  tabBar: {
    borderTopWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  tabButtonActive: {
    backgroundColor: '#1453ff',
  },
  tabLabel: {
    color: '#1f2937',
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
});

export default App;

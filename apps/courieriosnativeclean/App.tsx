import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {doc, setDoc} from 'firebase/firestore';

import {AuthProvider, useAuth} from './src/context/AuthContext';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {JobDetailScreen} from './src/screens/JobDetailScreen';
import {JobsScreen} from './src/screens/JobsScreen';
import {LoginScreen} from './src/screens/LoginScreen';
import {MapShellScreen} from './src/screens/MapShellScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {configureRuntime, type NativeRuntimeConfig} from './src/config/runtime';
import {getFirebaseServices, isFirebaseReady} from './src/services/firebase';
import type {
  JobsSubscription,
  JobsSyncState,
} from './src/services/ports/jobsPort';
import {
  ServiceRegistryProvider,
  useServiceRegistry,
} from './src/services/serviceRegistry';
import type {Job} from './src/types/jobs';

type TabKey = 'dashboard' | 'jobs' | 'settings';
type MapShellView = 'map' | 'settings';

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
  const {
    jobs: jobsService,
    notifications: notificationsService,
    analytics,
    featureFlags,
    location: locationService,
  } = useServiceRegistry();
  const featureFlagsState = featureFlags.useFeatureFlags();
  const jobsSubscriptionRef = useRef<JobsSubscription | null>(null);
  const notificationsSetupForUidRef = useRef<string | null>(null);
  const lastTrackedJobsCountRef = useRef<number | null>(null);
  const lastSyncErrorRef = useRef<string | null>(null);
  const notificationsEnabled = featureFlagsState.state.flags.notifications;
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mapShellView, setMapShellView] = useState<MapShellView>('map');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsSyncState, setJobsSyncState] = useState<JobsSyncState>(
    DEFAULT_JOBS_SYNC_STATE,
  );

  useEffect(() => {
    if (!notificationsEnabled) {
      return;
    }

    const unsubscribe = notificationsService.subscribeToForegroundMessages(
      payload => {
        void analytics.track('notification_foreground_received', {
          hasTitle: payload.title ? 'yes' : 'no',
          hasData:
            payload.data && Object.keys(payload.data).length > 0 ? 'yes' : 'no',
        });
      },
    );

    return unsubscribe;
  }, [analytics, notificationsEnabled, notificationsService]);

  useEffect(() => {
    if (!session || !notificationsEnabled) {
      notificationsSetupForUidRef.current = null;
      return;
    }
    if (notificationsSetupForUidRef.current === session.uid) {
      return;
    }

    notificationsSetupForUidRef.current = session.uid;
    let cancelled = false;

    const bootstrapNotifications = async (): Promise<void> => {
      try {
        const granted = await notificationsService.requestPermission();
        if (cancelled) {
          return;
        }

        void analytics.track('notifications_permission_checked', {
          granted: granted ? 'yes' : 'no',
        });

        if (!granted) {
          return;
        }

        const token = await notificationsService.registerDeviceToken();
        if (cancelled || !token) {
          return;
        }

        console.info('[notifications] device token registered', token);
        void analytics.track('notifications_token_registered', {
          tokenLength: token.length,
        });
      } catch (error) {
        notificationsSetupForUidRef.current = null;
        void analytics.recordError(error, 'notifications_bootstrap_failed');
      }
    };

    void bootstrapNotifications();

    return () => {
      cancelled = true;
    };
  }, [analytics, notificationsEnabled, notificationsService, session]);

  useEffect(() => {
    jobsSubscriptionRef.current?.unsubscribe();
    jobsSubscriptionRef.current = null;

    if (!session) {
      setJobs([]);
      setSelectedJobId(null);
      setMapShellView('map');
      setJobsLoading(false);
      setJobsError(null);
      setJobsSyncState(DEFAULT_JOBS_SYNC_STATE);
      lastTrackedJobsCountRef.current = null;
      lastSyncErrorRef.current = null;
      return;
    }

    setJobsLoading(true);
    setJobsError(null);

    const subscription = jobsService.subscribeJobs(session, {
      onJobs: nextJobs => {
        setJobs(nextJobs);
        setJobsLoading(false);
        if (lastTrackedJobsCountRef.current !== nextJobs.length) {
          lastTrackedJobsCountRef.current = nextJobs.length;
          void analytics.track('jobs_loaded', {
            count: nextJobs.length,
          });
        }
      },
      onSyncState: nextSyncState => {
        setJobsSyncState(nextSyncState);
        if (nextSyncState.status === 'error' && nextSyncState.message) {
          setJobsError(nextSyncState.message);
          setJobsLoading(false);
          if (lastSyncErrorRef.current !== nextSyncState.message) {
            lastSyncErrorRef.current = nextSyncState.message;
            void analytics.recordError(
              new Error(nextSyncState.message),
              'jobs_sync_error',
            );
          }
        }
        if (
          nextSyncState.status === 'live' ||
          nextSyncState.status === 'stale'
        ) {
          setJobsLoading(false);
          lastSyncErrorRef.current = null;
        }
      },
    });

    jobsSubscriptionRef.current = subscription;

    void subscription.refresh().catch(error => {
      setJobsError(
        error instanceof Error ? error.message : 'Unable to load jobs.',
      );
      setJobsLoading(false);
      void analytics.recordError(error, 'jobs_initial_refresh_failed');
    });

    return () => {
      subscription.unsubscribe();
      if (jobsSubscriptionRef.current === subscription) {
        jobsSubscriptionRef.current = null;
      }
    };
  }, [analytics, jobsService, session]);

  useEffect(() => {
    if (!session || !isFirebaseReady() || !notificationsEnabled) {
      return;
    }

    let cancelled = false;

    const syncPushToken = async (): Promise<void> => {
      try {
        await notificationsService.requestPermission();
        for (let attempt = 0; attempt < 5 && !cancelled; attempt += 1) {
          const apnsToken = await notificationsService.registerDeviceToken();
          const fcmToken = await notificationsService.registerMessagingToken();
          if (!apnsToken && !fcmToken) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            continue;
          }

          const services = getFirebaseServices();
          if (!services) {
            return;
          }

          await setDoc(
            doc(services.db, 'users', session.uid),
            {
              courierProfile: {
                apnsToken: apnsToken ?? null,
                apnsTokenUpdatedAt: new Date().toISOString(),
                fcmToken: fcmToken ?? null,
                fcmTokenUpdatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            },
            {merge: true},
          );
          return;
        }
      } catch {
        // Token upload failures should not block app usage.
      }
    };

    void syncPushToken();

    return () => {
      cancelled = true;
    };
  }, [notificationsEnabled, notificationsService, session]);

  // Location uploader: enqueue location snapshots and attempt to flush them to the server.
  // Uses dynamic import to keep startup small and allow the module to be easily mocked in tests.
  useEffect(() => {
    if (!session) return undefined;

    const locationController = locationService.useLocationTracking();

    // On any new lastLocation, enqueue and attempt an immediate flush
    if (locationController.state.lastLocation) {
      void import('./src/services/locationUploadService').then(async mod => {
        try {
          await mod.enqueueLocation(
            session.uid,
            locationController.state.lastLocation!,
          );
          await mod.flushQueuedLocationsForSession(session.uid);
        } catch (err) {
          console.warn('[locationUploader] initial flush failed:', err);
        }
      });
    }

    // Periodic flush (every 30s) while the session is active
    const interval = setInterval(() => {
      void import('./src/services/locationUploadService').then(mod => {
        void mod
          .flushQueuedLocationsForSession(session.uid)
          .catch(err =>
            console.warn('[locationUploader] periodic flush failed', err),
          );
      });
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [session?.uid, locationService]);

  const refreshJobs = useCallback(async (): Promise<Job[]> => {
    if (!session) {
      return [];
    }

    setJobsError(null);
    setJobsLoading(true);
    try {
      const nextJobs = jobsSubscriptionRef.current
        ? await jobsSubscriptionRef.current.refresh()
        : await jobsService.fetchJobs(session);
      setJobs(nextJobs);
      return nextJobs;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to refresh jobs.';
      setJobsError(message);
      void analytics.recordError(error, 'jobs_manual_refresh_failed');
      throw error;
    } finally {
      setJobsLoading(false);
    }
  }, [analytics, jobsService, session]);

  const selectedJob = useMemo(
    () =>
      selectedJobId ? jobs.find(job => job.id === selectedJobId) ?? null : null,
    [jobs, selectedJobId],
  );
  const activeJobs = useMemo(
    () =>
      jobs.filter(
        job => job.status !== 'delivered' && job.status !== 'cancelled',
      ),
    [jobs],
  );
  const activeJobsCount = activeJobs.length;
  const activeJob = activeJobs[0] ?? null;
  const mapShellEnabled = featureFlagsState.state.flags.mapShell;

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
          setJobs(prev =>
            prev.map(job => (job.id === updatedJob.id ? updatedJob : job)),
          );
          setSelectedJobId(updatedJob.id);
        }}
      />
    );
  }

  if (mapShellEnabled) {
    if (mapShellView === 'settings') {
      return (
        <View style={styles.mapShellSettingsRoot}>
          <View style={styles.mapShellSettingsHeader}>
            <Pressable
              onPress={() => setMapShellView('map')}
              style={styles.mapShellSettingsBackButton}>
              <Text style={styles.mapShellSettingsBackLabel}>Back to Map</Text>
            </Pressable>
          </View>
          <SettingsScreen />
        </View>
      );
    }

    return (
      <MapShellScreen
        jobs={jobs}
        loadingJobs={jobsLoading}
        jobsError={jobsError}
        jobsSyncState={jobsSyncState}
        activeJob={activeJob}
        onRefreshJobs={refreshJobs}
        onOpenJobDetail={setSelectedJobId}
        onJobUpdated={updatedJob => {
          setJobs(prev => {
            const index = prev.findIndex(job => job.id === updatedJob.id);
            if (index === -1) {
              return [updatedJob, ...prev];
            }
            const next = [...prev];
            next[index] = updatedJob;
            return next;
          });
        }}
        onOpenSettings={() => setMapShellView('settings')}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {activeTab === 'dashboard' ? (
          <DashboardScreen
            onOpenJobs={() => setActiveTab('jobs')}
            onRetryJobs={() => {
              void refreshJobs().catch(() => undefined);
            }}
            activeJobsCount={activeJobsCount}
            loadingJobs={jobsLoading}
            jobsError={jobsError}
            jobsSyncState={jobsSyncState}
            activeJob={activeJob}
          />
        ) : null}

        {activeTab === 'jobs' ? (
          <JobsScreen
            jobs={jobs}
            setJobs={setJobs}
            loadingJobs={jobsLoading}
            jobsError={jobsError}
            syncState={jobsSyncState}
            onRefresh={refreshJobs}
            onOpenDetail={jobId => {
              setSelectedJobId(jobId);
            }}
          />
        ) : null}

        {activeTab === 'settings' ? <SettingsScreen /> : null}
      </View>

      <View style={styles.tabBar}>
        <TabButton
          active={activeTab === 'dashboard'}
          label="Dashboard"
          onPress={() => setActiveTab('dashboard')}
        />
        <TabButton
          active={activeTab === 'jobs'}
          label="Jobs"
          onPress={() => setActiveTab('jobs')}
        />
        <TabButton
          active={activeTab === 'settings'}
          label="Settings"
          onPress={() => setActiveTab('settings')}
        />
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
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active ? styles.tabButtonActive : null]}>
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
        {label}
      </Text>
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
  mapShellSettingsRoot: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapShellSettingsHeader: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#0f172a',
  },
  mapShellSettingsBackButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  mapShellSettingsBackLabel: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '700',
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

import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';

import {MapShellSurface} from '../components/MapShellSurface';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {JobsSyncState} from '../services/ports/jobsPort';
import {
  deriveSyncHealth,
  formatLocationSampleTime,
  formatSyncTime,
} from './viewModels/jobsViewState';
import type {Job} from '../types/jobs';

type MapShellPanel = 'overview' | 'jobs' | 'settings';

type MapShellScreenProps = {
  jobs: Job[];
  loadingJobs: boolean;
  jobsError: string | null;
  jobsSyncState: JobsSyncState;
  activeJob: Job | null;
  onRefreshJobs: () => Promise<Job[]>;
  onOpenJobDetail: (jobId: string) => void;
};

const LOCATION_STALE_THRESHOLD_MS = 45_000;

const toTrackingHealth = (
  tracking: boolean,
  hasError: string | null,
  lastSampleAt: number | null,
): {title: string; detail: string} => {
  if (hasError) {
    return {
      title: 'Error',
      detail: hasError,
    };
  }

  if (!tracking) {
    return {
      title: 'Paused',
      detail: 'Tracking is currently paused.',
    };
  }

  if (!lastSampleAt) {
    return {
      title: 'Starting',
      detail: 'Waiting for your first location sample.',
    };
  }

  const ageMs = Date.now() - lastSampleAt;
  if (ageMs > LOCATION_STALE_THRESHOLD_MS) {
    return {
      title: 'Stale',
      detail: `Last sample is ${Math.round(ageMs / 1000)}s old.`,
    };
  }

  return {
    title: 'Healthy',
    detail: 'Tracking is running normally.',
  };
};

export const MapShellScreen = ({
  jobs,
  loadingJobs,
  jobsError,
  jobsSyncState,
  activeJob,
  onRefreshJobs,
  onOpenJobDetail,
}: MapShellScreenProps): React.JSX.Element => {
  const {location: locationService} = useServiceRegistry();
  const {
    state: locationState,
    requestPermission,
    startTracking,
    stopTracking,
  } = locationService.useLocationTracking();
  const [panel, setPanel] = useState<MapShellPanel>('overview');
  const [panelBusy, setPanelBusy] = useState(false);

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        job => job.status !== 'delivered' && job.status !== 'cancelled',
      ),
    [jobs],
  );
  const syncHealth = deriveSyncHealth(jobsSyncState);
  const trackingHealth = toTrackingHealth(
    locationState.tracking,
    locationState.error,
    locationState.lastLocation?.timestamp ?? null,
  );

  const runRefresh = async (): Promise<void> => {
    setPanelBusy(true);
    try {
      await onRefreshJobs();
    } finally {
      setPanelBusy(false);
    }
  };

  const runStartTracking = async (): Promise<void> => {
    setPanelBusy(true);
    try {
      if (!locationState.hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          return;
        }
      }
      await startTracking();
    } finally {
      setPanelBusy(false);
    }
  };

  const showSyncWarning =
    syncHealth.tone === 'degraded' || syncHealth.tone === 'error';

  return (
    <View style={styles.root}>
      <MapShellSurface
        activeJob={activeJob}
        courierLocation={locationState.lastLocation}
      />

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={styles.topSlot}>
          <View style={styles.topCard}>
            <Text style={styles.topTitle}>Senderr MapShell</Text>
            <Text style={styles.topSubtitle}>
              Active jobs: {activeJobs.length} · Sync: {syncHealth.title}
            </Text>
            <View style={styles.tabRow}>
              <MapShellTab
                label="Overview"
                active={panel === 'overview'}
                onPress={() => setPanel('overview')}
              />
              <MapShellTab
                label="Jobs"
                active={panel === 'jobs'}
                onPress={() => setPanel('jobs')}
              />
              <MapShellTab
                label="Settings"
                active={panel === 'settings'}
                onPress={() => setPanel('settings')}
              />
            </View>
          </View>
        </View>

        <View pointerEvents="box-none" style={styles.centerSlot}>
          {showSyncWarning ? (
            <View style={styles.warningChip}>
              <Text style={styles.warningText}>
                Sync {syncHealth.title}: {syncHealth.message}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomSlot}>
          <View style={styles.panelCard}>
            {panel === 'overview' ? (
              <>
                <Text style={styles.panelTitle}>Operations Overview</Text>
                <Text style={styles.panelText}>
                  Last location:{' '}
                  {formatLocationSampleTime(
                    locationState.lastLocation?.timestamp ?? null,
                  )}
                </Text>
                <Text style={styles.panelText}>
                  Tracking: {trackingHealth.title}
                </Text>
                <Text style={styles.panelText}>{trackingHealth.detail}</Text>
                <Text style={styles.panelText}>
                  Last sync: {formatSyncTime(jobsSyncState.lastSyncedAt)}
                </Text>
                <View style={styles.actionsRow}>
                  <PrimaryButton
                    label={
                      locationState.tracking
                        ? 'Tracking active'
                        : 'Start tracking'
                    }
                    disabled={locationState.tracking || panelBusy}
                    onPress={() => {
                      void runStartTracking();
                    }}
                  />
                  <PrimaryButton
                    label="Stop"
                    variant="secondary"
                    disabled={!locationState.tracking || panelBusy}
                    onPress={() => stopTracking()}
                  />
                  <PrimaryButton
                    label={panelBusy ? 'Refreshing...' : 'Refresh jobs'}
                    variant="secondary"
                    disabled={panelBusy}
                    onPress={() => {
                      void runRefresh();
                    }}
                  />
                </View>
              </>
            ) : null}

            {panel === 'jobs' ? (
              <>
                <Text style={styles.panelTitle}>Active Jobs</Text>
                {loadingJobs && activeJobs.length === 0 ? (
                  <Text style={styles.panelText}>Loading jobs...</Text>
                ) : null}
                {!loadingJobs && jobsError && activeJobs.length === 0 ? (
                  <Text style={styles.panelError}>{jobsError}</Text>
                ) : null}
                {!loadingJobs && !jobsError && activeJobs.length === 0 ? (
                  <Text style={styles.panelText}>
                    No active jobs right now.
                  </Text>
                ) : null}
                {activeJobs.length > 0 ? (
                  <FlatList
                    data={activeJobs}
                    keyExtractor={item => item.id}
                    style={styles.jobsList}
                    renderItem={({item}) => (
                      <Pressable
                        style={styles.jobRow}
                        onPress={() => onOpenJobDetail(item.id)}>
                        <View style={styles.jobRowHeader}>
                          <Text style={styles.jobCustomer}>
                            {item.customerName}
                          </Text>
                          <StatusBadge status={item.status} />
                        </View>
                        <Text style={styles.jobAddress} numberOfLines={1}>
                          {item.pickupAddress}
                        </Text>
                        <Text style={styles.jobAddress} numberOfLines={1}>
                          {item.dropoffAddress}
                        </Text>
                      </Pressable>
                    )}
                  />
                ) : null}
              </>
            ) : null}

            {panel === 'settings' ? (
              <>
                <Text style={styles.panelTitle}>MapShell Settings</Text>
                <Text style={styles.panelText}>
                  This shell keeps all primary actions on-map. Full profile
                  settings migration lands in the next issue.
                </Text>
                <View style={styles.actionsRow}>
                  <PrimaryButton
                    label={
                      locationState.tracking
                        ? 'Stop tracking'
                        : 'Start tracking'
                    }
                    onPress={() => {
                      if (locationState.tracking) {
                        stopTracking();
                        return;
                      }
                      void runStartTracking();
                    }}
                  />
                  <PrimaryButton
                    label={panelBusy ? 'Refreshing...' : 'Refresh'}
                    variant="secondary"
                    disabled={panelBusy}
                    onPress={() => {
                      void runRefresh();
                    }}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const MapShellTab = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element => (
  <Pressable
    onPress={onPress}
    style={[styles.tabButton, active ? styles.tabButtonActive : null]}>
    <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  topSlot: {
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  topCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  topTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  topSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  centerSlot: {
    alignItems: 'center',
    marginTop: 10,
  },
  warningChip: {
    backgroundColor: 'rgba(180, 83, 9, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
  },
  warningText: {
    color: '#fffbeb',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSlot: {
    marginTop: 'auto',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  panelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 14,
    minHeight: 210,
    maxHeight: 320,
    gap: 8,
  },
  panelTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  panelText: {
    color: '#334155',
    fontSize: 13,
  },
  panelError: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  jobsList: {
    flexGrow: 0,
  },
  jobRow: {
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 10,
    padding: 10,
    gap: 2,
    marginTop: 6,
  },
  jobRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  jobAddress: {
    color: '#475569',
    fontSize: 12,
  },
});

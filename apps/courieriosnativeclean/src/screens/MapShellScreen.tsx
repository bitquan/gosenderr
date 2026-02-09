import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {MapShellSurface} from '../components/MapShellSurface';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {
  JobStatusCommandResult,
  JobsSyncState,
} from '../services/ports/jobsPort';
import {buildMapShellOverlayModel, type MapShellState} from './mapShellOverlayController';
import {
  buildMapShellRouteSummary,
  formatRouteDistance,
  type MapShellCameraMode,
} from './viewModels/mapShellRouteView';
import {
  formatLocationSampleTime,
  formatSyncTime,
} from './viewModels/jobsViewState';
import type {Job} from '../types/jobs';

type MapShellScreenProps = {
  jobs: Job[];
  loadingJobs: boolean;
  jobsError: string | null;
  jobsSyncState: JobsSyncState;
  activeJob: Job | null;
  onRefreshJobs: () => Promise<Job[]>;
  onOpenJobDetail: (jobId: string) => void;
  onJobUpdated: (job: Job) => void;
};

type Feedback = {
  message: string;
  tone: 'error' | 'info';
};

const isSyncDegraded = (syncState: JobsSyncState): boolean =>
  syncState.status === 'reconnecting' ||
  syncState.status === 'stale' ||
  syncState.status === 'error';

const toFeedbackFromResult = (
  result: JobStatusCommandResult,
): Feedback | null => {
  if (result.kind === 'success') {
    if (result.message) {
      return {message: result.message, tone: 'info'};
    }
    return {message: 'Status updated.', tone: 'info'};
  }

  if (result.kind === 'retryable_error') {
    return {message: result.message, tone: 'info'};
  }

  return {message: result.message, tone: 'error'};
};

export const MapShellScreen = ({
  jobs,
  loadingJobs,
  jobsError,
  jobsSyncState,
  activeJob,
  onRefreshJobs,
  onOpenJobDetail,
  onJobUpdated,
}: MapShellScreenProps): React.JSX.Element => {
  const {session} = useAuth();
  const {
    analytics,
    jobs: jobsService,
    location: locationService,
  } = useServiceRegistry();
  const {
    state: locationState,
    requestPermission,
    startTracking,
  } = locationService.useLocationTracking();

  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [cameraMode, setCameraMode] = useState<MapShellCameraMode>('fit_route');
  const latestJob = useMemo(() => jobs[0] ?? null, [jobs]);
  const syncDegraded = isSyncDegraded(jobsSyncState);

  const overlay = useMemo(
    () =>
      buildMapShellOverlayModel({
        activeJob,
        latestJob,
        jobsSyncState,
        courierLocation: locationState.lastLocation,
        tracking: locationState.tracking,
        hasPermission: locationState.hasPermission,
      }),
    [
      activeJob,
      jobsSyncState,
      latestJob,
      locationState.hasPermission,
      locationState.lastLocation,
      locationState.tracking,
    ],
  );

  const previousStateRef = useRef<MapShellState | null>(null);
  const latestKnownStatus = activeJob?.status ?? latestJob?.status ?? 'none';
  const routeSummary = useMemo(
    () => buildMapShellRouteSummary(activeJob, locationState.lastLocation),
    [activeJob, locationState.lastLocation],
  );
  const displayEtaMinutes = routeSummary.etaMinutes ?? activeJob?.etaMinutes ?? null;
  const cameraLabels: Record<MapShellCameraMode, string> = {
    follow_courier: 'Follow',
    fit_route: 'Fit',
    manual: 'Manual',
  };

  useEffect(() => {
    setCameraMode('fit_route');
  }, [activeJob?.id]);

  useEffect(() => {
    if (previousStateRef.current === overlay.state) {
      return;
    }

    void analytics.track('map_shell_state_transition', {
      from_state: previousStateRef.current ?? 'none',
      to_state: overlay.state,
      job_status: latestKnownStatus,
      sync_status: jobsSyncState.status,
    });
    previousStateRef.current = overlay.state;
  }, [analytics, jobsSyncState.status, latestKnownStatus, overlay.state]);

  const runRefresh = async (): Promise<void> => {
    try {
      await onRefreshJobs();
      setFeedback(null);
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : 'Unable to refresh jobs.',
        tone: 'error',
      });
    }
  };

  const runRequestPermission = async (): Promise<void> => {
    const granted = await requestPermission();
    setFeedback(
      granted
        ? {message: 'Location permission granted.', tone: 'info'}
        : {
            message:
              'Location permission denied. Open settings to continue.',
            tone: 'error',
          },
    );
  };

  const runStartTracking = async (): Promise<void> => {
    if (!locationState.hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setFeedback({
          message:
            'Location permission denied. Open settings to continue.',
          tone: 'error',
        });
        return;
      }
    }

    await startTracking();
    setFeedback({message: 'Tracking started.', tone: 'info'});
  };

  const runStatusUpdate = async (): Promise<void> => {
    if (!session) {
      setFeedback({message: 'Session expired. Please sign in again.', tone: 'error'});
      return;
    }

    if (!overlay.nextStatus) {
      setFeedback({message: 'No status transition available.', tone: 'error'});
      return;
    }

    const job = activeJob ?? latestJob;
    if (!job) {
      setFeedback({message: 'No active job found.', tone: 'error'});
      return;
    }

    const result = await jobsService.updateJobStatus(
      session,
      job.id,
      overlay.nextStatus,
    );

    if (result.job) {
      onJobUpdated(result.job);
    }

    setFeedback(toFeedbackFromResult(result));
  };

  const runPrimaryAction = async (): Promise<void> => {
    setActionBusy(true);
    try {
      switch (overlay.primaryAction) {
        case 'refresh_jobs':
          await runRefresh();
          break;
        case 'request_location_permission':
          await runRequestPermission();
          break;
        case 'start_tracking':
          await runStartTracking();
          break;
        case 'open_job_detail': {
          const job = activeJob ?? latestJob;
          if (job) {
            onOpenJobDetail(job.id);
          } else {
            setFeedback({message: 'No active job found.', tone: 'error'});
          }
          break;
        }
        case 'update_status':
          await runStatusUpdate();
          break;
        default:
          break;
      }
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : 'Unable to complete map-shell action.',
        tone: 'error',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const toneStyle =
    overlay.tone === 'error'
      ? styles.panelToneError
      : overlay.tone === 'warning'
        ? styles.panelToneWarning
        : overlay.tone === 'success'
          ? styles.panelToneSuccess
          : styles.panelToneNeutral;

  return (
    <View style={styles.root}>
      <MapShellSurface
        activeJob={activeJob}
        courierLocation={locationState.lastLocation}
        routeCoordinates={routeSummary.coordinates}
        cameraMode={cameraMode}
        onCameraModeChange={setCameraMode}
      />

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={styles.topSlot}>
          <View style={styles.topCard}>
            <Text style={styles.topTitle}>Senderr MapShell</Text>
            <Text style={styles.topSubtitle}>
              State: {overlay.state.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.topSubtitle}>
              Last sync: {formatSyncTime(jobsSyncState.lastSyncedAt)}
            </Text>
            <Text style={styles.topSubtitle}>
              {routeSummary.legLabel} · {formatRouteDistance(routeSummary.distanceMeters)}
              {displayEtaMinutes ? ` · ETA ${displayEtaMinutes} min` : ''}
            </Text>
            {activeJob ? (
              <View style={styles.jobMetaRow}>
                <Text style={styles.jobMetaText} numberOfLines={1}>
                  {activeJob.customerName}
                </Text>
                <StatusBadge status={activeJob.status} />
              </View>
            ) : null}
            <View style={styles.cameraRow}>
              {(Object.keys(cameraLabels) as MapShellCameraMode[]).map(mode => {
                const active = cameraMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.cameraChip, active ? styles.cameraChipActive : null]}
                    onPress={() => setCameraMode(mode)}>
                    <Text style={[styles.cameraChipText, active ? styles.cameraChipTextActive : null]}>
                      {cameraLabels[mode]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View pointerEvents="box-none" style={styles.centerSlot}>
          {syncDegraded ? (
            <View style={styles.warningChip}>
              <Text style={styles.warningText}>
                Sync {jobsSyncState.status}: {jobsSyncState.message ?? 'Retry required'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomSlot}>
          <View style={[styles.panelCard, toneStyle]}>
            <Text style={styles.panelTitle}>{overlay.title}</Text>
            <Text style={styles.panelText}>{overlay.description}</Text>
            <Text style={styles.panelMeta}>
              Last location: {formatLocationSampleTime(locationState.lastLocation?.timestamp ?? null)}
            </Text>
            <Text style={styles.panelMeta}>
              Route: {routeSummary.legLabel} · {formatRouteDistance(routeSummary.distanceMeters)}
              {displayEtaMinutes ? ` · ETA ${displayEtaMinutes} min` : ''}
            </Text>
            <Text style={styles.panelMeta}>Camera: {cameraLabels[cameraMode]}</Text>
            {loadingJobs ? (
              <Text style={styles.panelMeta}>Refreshing jobs...</Text>
            ) : null}
            {!loadingJobs && jobsError ? (
              <Text style={styles.panelError}>{jobsError}</Text>
            ) : null}
            {feedback ? (
              <Text style={feedback.tone === 'error' ? styles.panelError : styles.panelInfo}>
                {feedback.message}
              </Text>
            ) : null}
            <PrimaryButton
              label={actionBusy ? 'Working...' : overlay.primaryLabel}
              disabled={actionBusy}
              onPress={() => {
                void runPrimaryAction();
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  topSlot: {
    paddingTop: 52,
    paddingHorizontal: 12,
  },
  topCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
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
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  jobMetaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  centerSlot: {
    alignItems: 'center',
    marginTop: 10,
  },
  cameraRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cameraChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cameraChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  cameraChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  cameraChipTextActive: {
    color: '#eff6ff',
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
    borderRadius: 16,
    padding: 14,
    minHeight: 220,
    gap: 8,
  },
  panelToneNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  panelToneWarning: {
    backgroundColor: 'rgba(254, 243, 199, 0.98)',
  },
  panelToneError: {
    backgroundColor: 'rgba(254, 226, 226, 0.98)',
  },
  panelToneSuccess: {
    backgroundColor: 'rgba(220, 252, 231, 0.98)',
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
  panelMeta: {
    color: '#475569',
    fontSize: 12,
  },
  panelError: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  panelInfo: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});

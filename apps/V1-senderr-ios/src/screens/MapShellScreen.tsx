import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {MapShellSurface} from '../components/MapShellSurface';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import {getActiveFirebaseProjectId, isFirebaseEmulatorEnabled} from '../services/firebase';
import {runtimeConfig} from '../config/runtime';
import type {
  JobStatusCommandResult,
  JobsSyncState,
} from '../services/ports/jobsPort';
import {fetchRoadRoute} from '../services/routeService';
import {buildMapShellOverlayModel, type MapShellState} from './mapShellOverlayController';
import {
  buildMapShellRoutePlan,
  buildMapShellRouteSummary,
  calculateRouteDistance,
  estimateEtaMinutes,
  formatRouteDistance,
  type MapShellCameraMode,
  type RouteCoordinate,
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
  onOpenSettings: () => void;
  // Handlers to cycle through multiple active jobs (optional)
  onNextActiveJob?: () => void;
  onPrevActiveJob?: () => void;
};

type Feedback = {
  message: string;
  tone: 'error' | 'info';
};

type ResolvedRouteState = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  etaMinutes: number | null;
  source: 'road' | 'direct';
};

const OFF_ROUTE_THRESHOLD_METERS = 120;
const ROUTE_REFRESH_COOLDOWN_MS = 12_000;

const isSyncDegraded = (syncState: JobsSyncState): boolean =>
  syncState.status === 'reconnecting' ||
  syncState.status === 'stale' ||
  syncState.status === 'error';

const distancePointToSegmentMeters = (
  point: RouteCoordinate,
  start: RouteCoordinate,
  end: RouteCoordinate,
): number => {
  const latitudeScale = 111_320;
  const longitudeScale = latitudeScale * Math.cos((point.latitude * Math.PI) / 180);

  const px = point.longitude * longitudeScale;
  const py = point.latitude * latitudeScale;
  const sx = start.longitude * longitudeScale;
  const sy = start.latitude * latitudeScale;
  const ex = end.longitude * longitudeScale;
  const ey = end.latitude * latitudeScale;

  const dx = ex - sx;
  const dy = ey - sy;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / (dx ** 2 + dy ** 2)));
  const closestX = sx + t * dx;
  const closestY = sy + t * dy;
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
};

const distanceToPolylineMeters = (
  point: RouteCoordinate,
  coordinates: RouteCoordinate[],
): number => {
  if (coordinates.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coordinates.length; index += 1) {
    const segmentDistance = distancePointToSegmentMeters(
      point,
      coordinates[index - 1],
      coordinates[index],
    );
    if (segmentDistance < minDistance) {
      minDistance = segmentDistance;
    }
  }

  return minDistance;
};

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
    // explicit label so couriers understand the update was queued and why
    return {message: `Queued — ${result.message}`, tone: 'info'};
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
  onOpenSettings,
  onNextActiveJob,
  onPrevActiveJob,
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
  const actionBusyRef = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [cameraMode, setCameraMode] = useState<MapShellCameraMode>('fit_route');
  const [routeState, setRouteState] = useState<ResolvedRouteState | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const lastRouteFetchAtRef = useRef(0);
  const routeRequestInFlightRef = useRef(false);
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
  const baseRouteSummary = useMemo(
    () => buildMapShellRouteSummary(activeJob, locationState.lastLocation),
    [activeJob, locationState.lastLocation],
  );
  const routePlan = useMemo(
    () => buildMapShellRoutePlan(activeJob, locationState.lastLocation),
    [activeJob, locationState.lastLocation],
  );
  const routeSummary = useMemo(
    () =>
      routeState
        ? {
            coordinates: routeState.coordinates,
            distanceMeters: routeState.distanceMeters,
            etaMinutes: routeState.etaMinutes,
            legLabel: baseRouteSummary.legLabel,
          }
        : baseRouteSummary,
    [baseRouteSummary, routeState],
  );
  const displayEtaMinutes = routeSummary.etaMinutes ?? activeJob?.etaMinutes ?? null;
  const cameraLabels: Record<MapShellCameraMode, string> = {
    follow_courier: 'Follow',
    fit_route: 'Fit',
    manual: 'Manual',
  };

  useEffect(() => {
    setCameraMode('fit_route');
    setRouteState(null);
  }, [activeJob?.id]);

  const routeLifecycleKey = useMemo(
    () => `${activeJob?.id ?? 'none'}:${activeJob?.status ?? 'none'}`,
    [activeJob?.id, activeJob?.status],
  );

  useEffect(() => {
    let cancelled = false;
    const shouldFetchRoute =
      Boolean(activeJob) &&
      routePlan.points.length >= 2 &&
      activeJob?.status !== 'cancelled' &&
      activeJob?.status !== 'delivered';

    if (!shouldFetchRoute) {
      setRouteState(null);
      return;
    }
    if (routeState) {
      return;
    }

    const refreshRoute = async (): Promise<void> => {
      if (routeRequestInFlightRef.current) {
        return;
      }
      routeRequestInFlightRef.current = true;
      setRouteBusy(true);
      try {
        const roadRoute = await fetchRoadRoute(routePlan.points);
        if (cancelled) {
          return;
        }

        if (roadRoute) {
          setRouteState({
            coordinates: roadRoute.coordinates,
            distanceMeters: roadRoute.distanceMeters,
            etaMinutes: Math.max(1, Math.round(roadRoute.durationSeconds / 60)),
            source: 'road',
          });
        } else {
          const fallbackDistance = calculateRouteDistance(routePlan.points);
          setRouteState({
            coordinates: routePlan.points,
            distanceMeters: fallbackDistance,
            etaMinutes: estimateEtaMinutes(fallbackDistance),
            source: 'direct',
          });
        }

        lastRouteFetchAtRef.current = Date.now();
      } finally {
        routeRequestInFlightRef.current = false;
        if (!cancelled) {
          setRouteBusy(false);
        }
      }
    };

    void refreshRoute();
    return () => {
      cancelled = true;
    };
  }, [activeJob, routeLifecycleKey, routePlan.points, routeState]);

  useEffect(() => {
    if (
      !activeJob ||
      activeJob.status === 'cancelled' ||
      activeJob.status === 'delivered' ||
      !locationState.lastLocation ||
      !routeState ||
      routeState.source !== 'road' ||
      routeState.coordinates.length < 2
    ) {
      return;
    }

    const point: RouteCoordinate = {
      latitude: locationState.lastLocation.latitude,
      longitude: locationState.lastLocation.longitude,
    };
    const distanceOffRoute = distanceToPolylineMeters(point, routeState.coordinates);
    const cooldownElapsed =
      Date.now() - lastRouteFetchAtRef.current >= ROUTE_REFRESH_COOLDOWN_MS;
    if (!cooldownElapsed || distanceOffRoute <= OFF_ROUTE_THRESHOLD_METERS) {
      return;
    }

    let cancelled = false;
    const reroute = async (): Promise<void> => {
      if (routeRequestInFlightRef.current) {
        return;
      }
      routeRequestInFlightRef.current = true;
      setRouteBusy(true);
      try {
        const roadRoute = await fetchRoadRoute(routePlan.points);
        if (cancelled || !roadRoute) {
          return;
        }

        setRouteState({
          coordinates: roadRoute.coordinates,
          distanceMeters: roadRoute.distanceMeters,
          etaMinutes: Math.max(1, Math.round(roadRoute.durationSeconds / 60)),
          source: 'road',
        });
        lastRouteFetchAtRef.current = Date.now();
      } finally {
        routeRequestInFlightRef.current = false;
        if (!cancelled) {
          setRouteBusy(false);
        }
      }
    };

    void reroute();
    return () => {
      cancelled = true;
    };
  }, [activeJob, locationState.lastLocation, routePlan.points, routeState]);

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
    if (actionBusyRef.current) return;
    setActionBusy(true);
    actionBusyRef.current = true;
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
      actionBusyRef.current = false;
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
            <View style={styles.headerActionsRow}>
              {/* Job-cycle controls (visible when multiple jobs are present) */}
              {jobs.length > 1 && (
                <>
                  <Pressable
                    accessibilityLabel="prev-active-job"
                    style={styles.cycleButton}
                    onPress={onPrevActiveJob}
                  >
                    <Text style={styles.cycleButtonText}>‹</Text>
                  </Pressable>

                  <Pressable
                    accessibilityLabel="next-active-job"
                    style={styles.cycleButton}
                    onPress={onNextActiveJob}
                  >
                    <Text style={styles.cycleButtonText}>›</Text>
                  </Pressable>
                </>
              )}

              {/* Close / Skip active job (pending or accepted) */}
              {activeJob && (activeJob.status === 'pending' || activeJob.status === 'accepted') ? (
                <Pressable
                  accessibilityLabel="close-active-job"
                  accessibilityRole="button"
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  style={[styles.cycleButton, {borderColor: 'rgba(220,38,38,0.6)', opacity: actionBusy ? 0.6 : 1}]}
                  onPress={async () => {
                    // guard early if session/job not available or another action in-flight
                    if (!session || !activeJob || actionBusyRef.current) return;

                    setActionBusy(true);
                    actionBusyRef.current = true;
                    setFeedback(null);

                    try {
                      const res = await jobsService.updateJobStatus(session, activeJob.id, 'cancelled');
                      if (res.kind === 'success' && res.job) {
                        onJobUpdated(res.job);
                        setFeedback({message: 'Job closed.', tone: 'info'});
                      } else if (res.job) {
                        onJobUpdated(res.job);
                        setFeedback({message: res.message, tone: 'error'});
                      } else {
                        setFeedback({message: res.message, tone: 'error'});
                      }
                    } catch (err) {
                      setFeedback({message: (err as Error).message ?? 'Failed to close job', tone: 'error'});
                    } finally {
                      setActionBusy(false);
                      actionBusyRef.current = false;
                    }
                  }}
                >
                  <Text style={styles.cycleButtonText}>✕</Text>
                </Pressable>
              ) : null}

              {/** Show active Firebase project when running in non‑prod (helps avoid emulator/namespace confusion) */}
              {typeof getActiveFirebaseProjectId === 'function' && runtimeConfig.envName !== 'prod' ? (
                <View style={styles.projectChip} testID="runtime-project-chip">
                  <Text style={styles.projectChipText} numberOfLines={1} ellipsizeMode="middle">
                    {isFirebaseEmulatorEnabled() ? `Emulator: ${getActiveFirebaseProjectId()}` : `Project: ${getActiveFirebaseProjectId()}`}
                  </Text>
                </View>
              ) : null}

              <Pressable style={styles.settingsChip} onPress={onOpenSettings}>
                <Text style={styles.settingsChipText}>Settings</Text>
              </Pressable>
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
            {routeBusy ? <Text style={styles.panelMeta}>Route: recalculating...</Text> : null}
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
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  projectChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  projectChipText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '600',
  },
  settingsChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  settingsChipText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  cycleButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleButtonText: {
    color: '#e6eefc',
    fontSize: 16,
    fontWeight: '800',
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

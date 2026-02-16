import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {launchCamera, type CameraOptions} from 'react-native-image-picker';

import {MapShellSurface} from '../components/MapShellSurface';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusBadge} from '../components/StatusBadge';
import {useAuth} from '../context/AuthContext';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {
  JobStatusCommandResult,
  JobsSyncState,
} from '../services/ports/jobsPort';
import {
  classifyCommandResultError,
  classifyUnknownError,
  formatErrorContext,
} from '../services/errorSystem';
import {
  buildCapabilityRequirementsForJob,
  missingCapabilityRequirements as findMissingCapabilityRequirements,
  type CapabilityRequirement,
} from '../services/jobEligibilityRules';
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
import {senderrTheme} from '../theme/senderrTheme';
import type {Job} from '../types/jobs';
import type {JobStatus} from '@gosenderr/contracts';
import type {CourierCapabilities} from '../types/profile';

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
  // optional navigation handler to return to the jobs list
  onOpenJobs?: () => void;
  // when true the screen will auto-focus the active job on mount — default false
  autoFocusActiveJob?: boolean;
};

type Feedback = {
  message: string;
  tone: 'error' | 'info';
};

type LocalStatusOverride = {
  status: JobStatus;
  requestedAt: number;
};

type ResolvedRouteState = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  etaMinutes: number | null;
  source: 'road' | 'direct';
};

type MapShellViewMode = 'full' | 'route_only';
type MapShellPanelSize = 'collapsed' | 'comfort' | 'expanded';

const OFF_ROUTE_THRESHOLD_METERS = 120;
const ROUTE_REFRESH_COOLDOWN_MS = 12_000;
const ACTION_TIMEOUT_MS = 15_000;
const LOCAL_STATUS_OVERRIDE_TTL_MS = 20_000;
const SWIPE_TRIGGER_PX = 72;
const SWIPE_RESET_DURATION_MS = 180;
const PANEL_DRAG_TRIGGER_PX = 54;
const PANEL_SIZE_ORDER: MapShellPanelSize[] = ['collapsed', 'comfort', 'expanded'];
const PANEL_SIZE_LABELS: Record<MapShellPanelSize, string> = {
  collapsed: 'Collapsed',
  comfort: 'Comfort',
  expanded: 'Expanded',
};

const isFlowJob = (job: Job): boolean =>
  job.status !== 'completed' &&
  job.status !== 'cancelled' &&
  job.status !== 'disputed' &&
  job.status !== 'expired' &&
  job.status !== 'failed';

const EMPTY_CAPABILITIES: CourierCapabilities = {
  canDeliverHot: false,
  canDeliverCold: false,
  canDeliverFrozen: false,
  canDeliverDrinks: false,
  canDeliverHeavy: false,
  canDeliverFurniture: false,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getPanelSizeIndex = (size: MapShellPanelSize): number =>
  PANEL_SIZE_ORDER.indexOf(size);

const getPanelSizeByIndex = (index: number): MapShellPanelSize =>
  PANEL_SIZE_ORDER[clamp(index, 0, PANEL_SIZE_ORDER.length - 1)];

export const getAdjacentPanelSize = (
  current: MapShellPanelSize,
  direction: 'up' | 'down',
): MapShellPanelSize => {
  const currentIndex = getPanelSizeIndex(current);
  if (direction === 'up') {
    return getPanelSizeByIndex(currentIndex + 1);
  }
  return getPanelSizeByIndex(currentIndex - 1);
};

export const getCycledPanelSize = (current: MapShellPanelSize): MapShellPanelSize => {
  if (current === 'comfort') return 'expanded';
  if (current === 'expanded') return 'collapsed';
  return 'comfort';
};

export const resolvePanelHeight = (
  size: MapShellPanelSize,
  viewportHeight: number,
): number => {
  const maxPanelHeight = Math.max(280, viewportHeight - 120);
  if (size === 'collapsed') {
    return clamp(Math.round(viewportHeight * 0.2), 140, maxPanelHeight);
  }
  if (size === 'expanded') {
    return clamp(Math.round(viewportHeight * 0.58), 300, maxPanelHeight);
  }
  return clamp(Math.round(viewportHeight * 0.34), 220, maxPanelHeight);
};

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

  const classified = classifyCommandResultError(result, {
    source: 'map_shell_status_update',
  });
  return {
    message: classified.userMessage,
    tone: classified.retryable ? 'info' : 'error',
  };
};

const withActionTimeout = async <T,>(
  action: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out. Please retry.`));
    }, timeoutMs);

    action.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

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
  onOpenJobs = () => {},
  autoFocusActiveJob = false,
}: MapShellScreenProps): React.JSX.Element => {
  const {session} = useAuth();
  const serviceRegistry = useServiceRegistry();
  const {
    analytics,
    jobs: jobsService,
    location: locationService,
  } = serviceRegistry;
  const profileService = serviceRegistry.profile;
  const {
    state: locationState,
    requestPermission,
    startTracking,
  } = locationService.useLocationTracking();
  const {height: viewportHeight} = useWindowDimensions();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [cameraMode, setCameraMode] = useState<MapShellCameraMode>('fit_route');
  const handleSetCameraMode = useCallback((mode: MapShellCameraMode) => {
    setCameraMode(mode);
  }, [setCameraMode]);


  const [viewMode, setViewMode] = useState<MapShellViewMode>('full');
  const [panelSize, setPanelSize] = useState<MapShellPanelSize>('comfort');
  // Top card visibility (dev/UX control)
  const [showTopCard, setShowTopCard] = useState(true);
  const [showDevControls, setShowDevControls] = useState(false);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, LocalStatusOverride>>({});
  const [routeState, setRouteState] = useState<ResolvedRouteState | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [courierCapabilities, setCourierCapabilities] = useState<CourierCapabilities>(EMPTY_CAPABILITIES);
  const [proofCaptureBusy, setProofCaptureBusy] = useState(false);
  // simulation controls (dev-only)
  const [simAutoAdvance, setSimAutoAdvance] = useState(false);
  const simSpeeds = useMemo(() => [
    {label: '0.25x', intervalMs: 250},
    {label: '0.5x', intervalMs: 500},
    {label: '1x', intervalMs: 1000},
    {label: '2x', intervalMs: 2000},
  ], []);
  const [simSpeedIndex, setSimSpeedIndex] = useState(2); // default 1x
  const autoAdvanceTriggeredRef = useRef<Map<string, Set<string>>>(new Map());
  const lastRouteFetchAtRef = useRef(0);
  const routeRequestInFlightRef = useRef(false);
  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const flowJobs = useMemo(() => jobs.filter(isFlowJob), [jobs]);
  const latestJob = useMemo(() => flowJobs[0] ?? null, [flowJobs]);
  const swipableJobs = useMemo(() => flowJobs, [flowJobs]);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  // userClearedFocus = true means the user intentionally cleared focus (Back to Jobs)
  // and we should *not* auto-reset focusedJobId back to the active job until the user
  // explicitly re-selects a job or the active job changes.
  const [userClearedFocus, setUserClearedFocus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!session || !profileService?.loadProfile) {
      setCourierCapabilities(EMPTY_CAPABILITIES);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const result = await profileService.loadProfile(session);
        if (!cancelled) {
          setCourierCapabilities(result.profile.capabilities);
        }
      } catch {
        if (!cancelled) {
          setCourierCapabilities(EMPTY_CAPABILITIES);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileService, session]);

  useEffect(() => {
    if (swipableJobs.length === 0) {
      setFocusedJobId(null);
      setUserClearedFocus(false);
      return;
    }

    // If focusedJobId is explicitly set and still present, keep it
    if (focusedJobId !== null && focusedJobId !== undefined && swipableJobs.some(job => job.id === focusedJobId)) {
      return;
    }

    // If the user explicitly cleared focus (Back to Jobs), do not auto-reselect active job
    if (userClearedFocus) {
      return;
    }

    // Only auto-select a focused job if the caller explicitly requested it.
    if (autoFocusActiveJob) {
      // prefer the active job when available
      if (activeJob?.id && swipableJobs.some(job => job.id === activeJob.id)) {
        setFocusedJobId(activeJob.id);
        return;
      }

      setFocusedJobId(swipableJobs[0].id);
    }

    // otherwise leave focusedJobId as null so the UI starts unlocked
  }, [activeJob?.id, focusedJobId, swipableJobs, userClearedFocus]);

  const focusedJob = useMemo(() => {
    if (focusedJobId) {
      const selected = swipableJobs.find(job => job.id === focusedJobId);
      if (selected) {
        return selected;
      }
    }

    // If the caller requested auto-focus, fall back to the active job so tests
    // and consumers that opt in still see the previous behavior immediately.
    if (autoFocusActiveJob && activeJob) {
      return activeJob;
    }

    // otherwise no focused job (unlocked state)
    return null;
  }, [activeJob, focusedJobId, latestJob, swipableJobs, autoFocusActiveJob]);
  const effectiveFocusedJob = useMemo(() => {
    if (!focusedJob) {
      return null;
    }
    const override = localStatusOverrides[focusedJob.id];
    const overrideStale = override ? Date.now() - override.requestedAt > LOCAL_STATUS_OVERRIDE_TTL_MS : false;
    if (!override || overrideStale || override.status === focusedJob.status) {
      return focusedJob;
    }
    return {
      ...focusedJob,
      status: override.status,
    };
  }, [focusedJob, localStatusOverrides]);
  const effectiveLatestJob = useMemo(() => {
    if (!latestJob) {
      return null;
    }
    const override = localStatusOverrides[latestJob.id];
    const overrideStale = override ? Date.now() - override.requestedAt > LOCAL_STATUS_OVERRIDE_TTL_MS : false;
    if (!override || overrideStale || override.status === latestJob.status) {
      return latestJob;
    }
    return {
      ...latestJob,
      status: override.status,
    };
  }, [latestJob, localStatusOverrides]);
  const presentationJob = useMemo(
    () => effectiveFocusedJob ?? effectiveLatestJob,
    [effectiveFocusedJob, effectiveLatestJob],
  );

  const focusedJobIndex = useMemo(
    () => (focusedJob ? swipableJobs.findIndex(job => job.id === focusedJob.id) : -1),
    [focusedJob, swipableJobs],
  );
  // Disable swipe when the focused job is the active job to avoid accidental job switches.
  const canSwipeJobs = swipableJobs.length > 1 && focusedJob?.id !== activeJob?.id;
  // Re-enable panel gestures so the bottom card and map can be moved by touch.
  const [panelLocked, setPanelLocked] = useState(false); // when true, disable panel gestures/cycling
  const enablePanelGestures = !panelLocked;
  const enablePanelDragGestures = enablePanelGestures && cameraMode !== 'manual';
  const jobPositionLabel =
    canSwipeJobs && focusedJobIndex >= 0 ? `${focusedJobIndex + 1}/${swipableJobs.length}` : null;
  const syncDegraded = isSyncDegraded(jobsSyncState);
  const panelHeight = useMemo(
    () => resolvePanelHeight(panelSize, viewportHeight),
    [panelSize, viewportHeight],
  );
  const showPanelRouteMeta = panelSize !== 'collapsed';
  const showExtendedPanelMeta = panelSize === 'expanded';
  const panelTitleLines = panelSize === 'collapsed' ? 1 : 2;
  const panelDescriptionLines = panelSize === 'collapsed' ? 1 : panelSize === 'comfort' ? 2 : 4;

  const overlay = useMemo(
    () =>
      buildMapShellOverlayModel({
        activeJob: effectiveFocusedJob,
        latestJob: effectiveLatestJob,
        jobsSyncState,
        courierLocation: locationState.lastLocation,
        tracking: locationState.tracking,
        hasPermission: locationState.hasPermission,
      }),
    [
      effectiveFocusedJob,
      effectiveLatestJob,
      jobsSyncState,
      locationState.hasPermission,
      locationState.lastLocation,
      locationState.tracking,
    ],
  );

  const missingCapabilityRequirements = useMemo<CapabilityRequirement[]>(() => {
    if (overlay.nextStatus !== 'assigned') {
      return [];
    }
    const required = buildCapabilityRequirementsForJob(presentationJob);
    return findMissingCapabilityRequirements(courierCapabilities, required);
  }, [courierCapabilities, overlay.nextStatus, presentationJob]);

  const capabilityBlockerMessage =
    missingCapabilityRequirements.length > 0
      ? `Missing: ${missingCapabilityRequirements.map(requirement => requirement.label).join(', ')}`
      : null;

  // Defensive wrapper: some runtime bundles may fail to export `formatSyncTime` —
  // guard against that and show a sensible fallback in the UI.
  const safeFormatSyncTime = (isoTime: string | null): string => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore allow runtime check
      return typeof formatSyncTime === 'function' ? formatSyncTime(isoTime) : 'Never';
    } catch {
      return 'Never';
    }
  };

  const previousStateRef = useRef<MapShellState | null>(null);
  const latestKnownStatus = presentationJob?.status ?? 'none';
  const baseRouteSummary = useMemo(
    () =>
      buildMapShellRouteSummary(presentationJob, locationState.lastLocation, {
        deliveryOnly: viewMode === 'route_only',
      }),
    [presentationJob, locationState.lastLocation, viewMode],
  );
  const routePlan = useMemo(
    () =>
      buildMapShellRoutePlan(presentationJob, locationState.lastLocation, {
        deliveryOnly: viewMode === 'route_only',
      }),
    [presentationJob, locationState.lastLocation, viewMode],
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
  const displayEtaMinutes = routeSummary.etaMinutes ?? presentationJob?.etaMinutes ?? null;
  const summaryLine = `${routeSummary.legLabel} · ${formatRouteDistance(routeSummary.distanceMeters)}${
    displayEtaMinutes ? ` · ETA ${displayEtaMinutes} min` : ''
  }`;
  const cameraLabels: Record<MapShellCameraMode, string> = {
    follow_courier: 'Follow',
    fit_route: 'Fit',
    manual: 'Manual',
  };
  const viewModeLabels: Record<MapShellViewMode, string> = {
    full: 'Full',
    route_only: 'Route Only',
  };

  const resetCardPosition = useCallback(() => {
    Animated.timing(cardTranslateX, {
      toValue: 0,
      duration: SWIPE_RESET_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [cardTranslateX]);

  const cycleFocusedJob = useCallback(
    (direction: 1 | -1) => {
      if (swipableJobs.length < 2) {
        return;
      }

      const anchorIndex = focusedJobIndex >= 0 ? focusedJobIndex : 0;
      const nextIndex = (anchorIndex + direction + swipableJobs.length) % swipableJobs.length;
      setFocusedJobId(swipableJobs[nextIndex].id);
      // when user cycles/swipes to another job, clear the `userClearedFocus` flag so
      // the normal auto-selection behavior is restored on subsequent updates
      setUserClearedFocus(false);
    },
    [focusedJobIndex, swipableJobs],
  );

  const cyclePanelSize = useCallback(() => {
    setPanelSize(current => getCycledPanelSize(current));
  }, []);

  const nudgePanelSize = useCallback((direction: 'up' | 'down') => {
    setPanelSize(current => getAdjacentPanelSize(current, direction));
  }, []);

  const cardSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          canSwipeJobs &&
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          cardTranslateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -SWIPE_TRIGGER_PX) {
            cycleFocusedJob(1);
          } else if (gestureState.dx >= SWIPE_TRIGGER_PX) {
            cycleFocusedJob(-1);
          }
          resetCardPosition();
        },
        onPanResponderTerminate: () => {
          resetCardPosition();
        },
      }),
    [canSwipeJobs, cardTranslateX, cycleFocusedJob, resetCardPosition],
  );

  const panelDragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy <= -PANEL_DRAG_TRIGGER_PX) {
            nudgePanelSize('up');
            return;
          }
          if (gestureState.dy >= PANEL_DRAG_TRIGGER_PX) {
            nudgePanelSize('down');
          }
        },
      }),
    [nudgePanelSize],
  );

  // Only reset camera to `fit_route` when the *focused job or viewMode actually
  // changes*. This prevents accidental overrides of an explicit user `manual`
  // selection during unrelated re-renders.
  const prevFocusIdRef = useRef<string | null | undefined>(presentationJob?.id);
  const prevViewModeRef = useRef<MapShellViewMode>(viewMode);
  useEffect(() => {
    setRouteState(null);

    const focusChanged = prevFocusIdRef.current !== presentationJob?.id;
    const viewModeChanged = prevViewModeRef.current !== viewMode;



    if ((focusChanged || viewModeChanged) && cameraMode !== 'manual') {
      setCameraMode('fit_route');
    }

    prevFocusIdRef.current = presentationJob?.id;
    prevViewModeRef.current = viewMode;
  }, [cameraMode, presentationJob?.id, viewMode]);

  const routeLifecycleKey = useMemo(
    () => `${presentationJob?.id ?? 'none'}:${presentationJob?.status ?? 'none'}:${viewMode}`,
    [presentationJob?.id, presentationJob?.status, viewMode],
  );

  useEffect(() => {
    let cancelled = false;
    const shouldFetchRoute =
      Boolean(presentationJob) &&
      routePlan.points.length >= 2 &&
      presentationJob?.status !== 'cancelled' &&
      presentationJob?.status !== 'completed';

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
      } catch {
        if (cancelled) {
          return;
        }
        const fallbackDistance = calculateRouteDistance(routePlan.points);
        setRouteState({
          coordinates: routePlan.points,
          distanceMeters: fallbackDistance,
          etaMinutes: estimateEtaMinutes(fallbackDistance),
          source: 'direct',
        });
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
  }, [presentationJob, routeLifecycleKey, routePlan.points, routeState]);

  useEffect(() => {
    if (
      !presentationJob ||
      presentationJob.status === 'cancelled' ||
      presentationJob.status === 'completed' ||
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
      } catch {
        // Keep the existing route and back off reroute attempts after failures.
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
  }, [presentationJob, locationState.lastLocation, routePlan.points, routeState]);

  useEffect(() => {
    setLocalStatusOverrides(prev => {
      let changed = false;
      const next = {...prev};
      const now = Date.now();
      for (const [jobId, override] of Object.entries(prev)) {
        const current = jobs.find(job => job.id === jobId);
        if (!current) {
          delete next[jobId];
          changed = true;
          continue;
        }
        if (now - override.requestedAt > LOCAL_STATUS_OVERRIDE_TTL_MS) {
          delete next[jobId];
          changed = true;
          continue;
        }
        if (current.status === override.status) {
          delete next[jobId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [jobs]);

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
      const classified = classifyUnknownError(error, {
        source: 'map_shell_refresh_jobs',
        fallbackMessage: 'Unable to refresh jobs.',
      });
      void analytics.recordError(error, formatErrorContext('map_shell_refresh_jobs', classified));
      setFeedback({
        message: classified.userMessage,
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

  const proofTypeForNextStatus = (job: Job | null, nextStatus: Job['status'] | null): 'pickup' | 'dropoff' | null => {
    if (!job || !nextStatus) return null;
    if (nextStatus === 'picked_up') return 'pickup';
    if (nextStatus === 'completed') return 'dropoff';
    return null;
  };

  const runCaptureProof = async (job: Job, proofType: 'pickup' | 'dropoff'): Promise<Job | null> => {
    if (proofCaptureBusy) {
      return null;
    }
    const options = {mediaType: 'photo', includeBase64: true, quality: 0.7};
    setProofCaptureBusy(true);
    try {
      // Defensive guard: native camera module can be null if pods aren't installed
      // or the app wasn't rebuilt after adding the dependency.
      if (typeof launchCamera !== 'function') {
        setFeedback({
          message: 'Camera unavailable — native module not linked. Rebuild the app and retry.',
          tone: 'error',
        });
        return null;
      }

      const response = await launchCamera(options as any);
      const asset = response.assets && response.assets[0];
      if (!asset || (!asset.base64 && !asset.uri)) {
        setFeedback({message: 'No photo captured.', tone: 'error'});
        return null;
      }

      const base64 = asset.base64 ?? null;
      const mime = asset.type ?? 'image/jpeg';
      const url = base64 ? `data:${mime};base64,${base64}` : asset.uri ?? '';

      const location = locationState.lastLocation
        ? {latitude: locationState.lastLocation.latitude, longitude: locationState.lastLocation.longitude}
        : undefined;
      const accuracy = locationState.lastLocation?.accuracy ?? undefined;
      const timestamp = new Date().toISOString();

      const attached = await jobsService.attachProof(session!, job.id, proofType, {
        url,
        location,
        accuracy,
        timestamp,
      });

      onJobUpdated(attached);
      setFeedback({message: 'Proof attached.', tone: 'info'});
      return attached;
    } catch (error) {
      const classified = classifyUnknownError(error, {
        source: 'map_shell_capture_proof',
        fallbackMessage: 'Unable to capture proof.',
      });
      void analytics.recordError(error, formatErrorContext('map_shell_capture_proof', classified));
      setFeedback({message: classified.userMessage, tone: 'error'});
      return null;
    } finally {
      setProofCaptureBusy(false);
    }
  };

  const runLifecycleCommand = (
    uidSession: NonNullable<typeof session>,
    jobId: string,
    nextStatus: JobStatus,
  ): Promise<JobStatusCommandResult> => {
    switch (nextStatus) {
      case 'assigned':
        return jobsService.commandAcceptJob
          ? jobsService.commandAcceptJob(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, nextStatus);
      case 'enroute_pickup':
        return jobsService.commandStartPickup
          ? jobsService.commandStartPickup(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, nextStatus);
      case 'arrived_pickup':
        return jobsService.commandMarkArrivedPickup
          ? jobsService.commandMarkArrivedPickup(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, nextStatus);
      case 'picked_up':
        return jobsService.commandConfirmPickup
          ? jobsService.commandConfirmPickup(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, nextStatus);
      case 'enroute_dropoff':
        return jobsService.commandStartDropoff
          ? jobsService.commandStartDropoff(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, nextStatus);
      case 'completed':
        return jobsService.commandCompleteDelivery
          ? jobsService.commandCompleteDelivery(uidSession, jobId)
          : jobsService.updateJobStatus(uidSession, jobId, nextStatus);
      default:
        return jobsService.updateJobStatus(uidSession, jobId, nextStatus);
    }
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
    const requestedStatus = overlay.nextStatus;

    const job = presentationJob;
    if (!job) {
      setFeedback({message: 'No active job found.', tone: 'error'});
      return;
    }

    if (requestedStatus === 'assigned' && missingCapabilityRequirements.length > 0) {
      const missingList = missingCapabilityRequirements
        .map(requirement => `${requirement.label} (${requirement.hint})`)
        .join(', ');
      setFeedback({
        message: `Cannot accept job until equipment is approved: ${missingList}.`,
        tone: 'error',
      });
      return;
    }

    // If this transition requires proof and proof is missing, capture first.
    const requiredProofType = proofTypeForNextStatus(job, requestedStatus);
    if (requiredProofType) {
      const hasProof = requiredProofType === 'pickup' ? !!job.pickupProof : !!job.dropoffProof;
      if (!hasProof) {
        const attached = await runCaptureProof(job, requiredProofType);
        if (!attached) {
          // user cancelled or attach failed; do not proceed with status update.
          return;
        }
      }
    }

    const optimisticJob: Job = {
      ...job,
      status: requestedStatus,
      updatedAt: new Date().toISOString(),
    };

    setLocalStatusOverrides(prev => ({
      ...prev,
      [job.id]: {
        status: requestedStatus,
        requestedAt: Date.now(),
      },
    }));
    onJobUpdated(optimisticJob);
    setFeedback({message: 'Status updated locally. Syncing in background...', tone: 'info'});

    const clearPendingStatusOverride = (jobId: string): void => {
      setLocalStatusOverrides(prev => {
        if (!(jobId in prev)) {
          return prev;
        }
        const next = {...prev};
        delete next[jobId];
        return next;
      });
    };

    void withActionTimeout(
      runLifecycleCommand(session, job.id, requestedStatus),
      ACTION_TIMEOUT_MS,
      'Status update sync',
    )
      .then(async result => {
        // Normal success/conflict handling
        const syncedJob = result.job;
        if (syncedJob) {
          onJobUpdated(syncedJob);
        }

        // Fallback for servers that don't allow `assigned -> arrived_pickup` directly:
        // if the server rejects `arrived_pickup` but the job is still `assigned`,
        // try the two-step sequence: `assigned -> enroute_pickup` then `enroute_pickup -> arrived_pickup`.
        const needsIntermediatePickupStep =
          result.kind === 'conflict' &&
          requestedStatus === 'arrived_pickup' &&
          result.job?.status === 'assigned';
        const needsIntermediateDropoffStep =
          result.kind === 'conflict' &&
          requestedStatus === 'arrived_dropoff' &&
          result.job?.status === 'picked_up';

        if (needsIntermediatePickupStep || needsIntermediateDropoffStep) {
          const intermediateStatus: JobStatus = needsIntermediatePickupStep
            ? 'enroute_pickup'
            : 'enroute_dropoff';
          try {
            // attempt intermediate transition
            const first = await withActionTimeout(
              runLifecycleCommand(session, job.id, intermediateStatus),
              ACTION_TIMEOUT_MS,
              'Status update sync (intermediate)',
            );

            if (first.job) {
              onJobUpdated(first.job);
            }

            const second = await withActionTimeout(
              runLifecycleCommand(session, job.id, requestedStatus),
              ACTION_TIMEOUT_MS,
              'Status update sync (final)',
            );

            if (second.job) {
              onJobUpdated(second.job);
            }

            const finalFeedback = toFeedbackFromResult(second);
            if (finalFeedback) {
              setFeedback(finalFeedback);
            }
            return;
          } catch (fallbackError) {
            // fall through to show original conflict message below
            void analytics.recordError(fallbackError, 'job_status_fallback_failed');
          }
        }

        const nextFeedback = toFeedbackFromResult(result);
        if (nextFeedback) {
          setFeedback(nextFeedback);
        }
      })
      .catch(error => {
        const classified = classifyUnknownError(error, {
          source: 'map_shell_status_update',
          fallbackMessage: 'Unable to update job status.',
        });
        void analytics.recordError(error, formatErrorContext('map_shell_status_update', classified));
        setFeedback({
          message: classified.userMessage,
          tone: 'error',
        });
      })
      .finally(() => {
        clearPendingStatusOverride(job.id);
      });
  };

  // Dev-only: when route simulator is running and Auto‑advance is ON, detect
  // proximity to pickup/dropoff and fire the appropriate status transitions.
  useEffect(() => {
    if (!__DEV__) return;
    let mounted = true;

    if (!simAutoAdvance) {
      return () => {
        mounted = false;
      };
    }

    const checkAutoAdvance = async (): Promise<void> => {
      try {
        // require here to avoid circular imports in production bundles
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loc = require('../services/locationService');
        const simState = typeof loc.devMockSimulationState === 'function' ? loc.devMockSimulationState() : {running: false, index: 0, total: 0};
        if (!simState.running || !simAutoAdvance) return;
        const job = effectiveFocusedJob ?? effectiveLatestJob;
        const last = locationState.lastLocation;
        if (!job || !last) return;

        const distMeters = (a: {latitude: number; longitude: number}, b: {latitude: number; longitude: number}) => {
          const latitudeScale = 111_320;
          const longitudeScale = latitudeScale * Math.cos((a.latitude * Math.PI) / 180);
          const dx = (a.longitude - b.longitude) * longitudeScale;
          const dy = (a.latitude - b.latitude) * latitudeScale;
          return Math.sqrt(dx * dx + dy * dy);
        };

        const pickup = job.pickupLocation;
        const dropoff = job.dropoffLocation;
        const threshold = 30; // meters
        const triggeredSet = autoAdvanceTriggeredRef.current.get(job.id) ?? new Set<string>();

        // arrived at pickup
        if (overlay.nextStatus === 'arrived_pickup' && pickup && distMeters(last, pickup) <= threshold && !triggeredSet.has('arrived_pickup')) {
          triggeredSet.add('arrived_pickup');
          autoAdvanceTriggeredRef.current.set(job.id, triggeredSet);
          await runStatusUpdate();

          // after arriving, auto attempt picked_up (attach synthetic proof if required)
          setTimeout(async () => {
            if (!mounted) return;
            const nowJob = (effectiveFocusedJob ?? effectiveLatestJob) as Job | null;
            if (!nowJob) return;
            const requiredProof = proofTypeForNextStatus(nowJob, 'picked_up');
            if (requiredProof && !nowJob.pickupProof) {
              // attach synthetic inline proof so picked_up will succeed in automated flow
              try {
                await jobsService.attachProof(session!, nowJob.id, 'pickup', {
                  url: 'data:image/png;base64,iVBORw0KGgo=',
                  location: {latitude: last.latitude, longitude: last.longitude},
                  accuracy: last.accuracy ?? 5,
                  timestamp: new Date().toISOString(),
                });
              } catch {
                // ignore attach error; picked_up will fail and UI remains consistent
              }
            }

            // request the picked_up transition if allowed by NEXT_STATUS
            try {
              await runLifecycleCommand(session!, nowJob.id, 'picked_up');
            } catch {
              // swallow - user can still manually progress
            }
          }, 800);
        }

        // arrived at dropoff / complete
        if ((overlay.nextStatus === 'arrived_dropoff' || overlay.nextStatus === 'completed') && dropoff && distMeters(last, dropoff) <= threshold && !triggeredSet.has('arrived_dropoff')) {
          triggeredSet.add('arrived_dropoff');
          autoAdvanceTriggeredRef.current.set(job.id, triggeredSet);
          await runStatusUpdate();

          setTimeout(async () => {
            if (!mounted) return;
            const nowJob = (effectiveFocusedJob ?? effectiveLatestJob) as Job | null;
            if (!nowJob) return;
            const requiredProof = proofTypeForNextStatus(nowJob, 'completed');
            if (requiredProof && !nowJob.dropoffProof) {
              try {
                await jobsService.attachProof(session!, nowJob.id, 'dropoff', {
                  url: 'data:image/png;base64,iVBORw0KGgo=',
                  location: {latitude: last.latitude, longitude: last.longitude},
                  accuracy: last.accuracy ?? 5,
                  timestamp: new Date().toISOString(),
                });
              } catch {
                // ignore attach error
              }
            }

            try {
              await runLifecycleCommand(session!, nowJob.id, 'completed');
            } catch {
              // swallow
            }
          }, 800);
        }
      } catch (e) {
        // ignore dev-only automation errors
      }
    };

    // run once immediately; if simulation is active *and* auto-advance is enabled
    // start polling. This avoids creating a persistent timer in unit tests when the
    // sim is not running.
    checkAutoAdvance();
    const loc = require('../services/locationService');
    const simState = typeof loc.devMockSimulationState === 'function' ? loc.devMockSimulationState() : {running: false, index: 0, total: 0};
    if (!simState.running) {
      return () => {
        mounted = false;
      };
    }

    const poll = setInterval(checkAutoAdvance, 700);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [simAutoAdvance, locationState.lastLocation, overlay.nextStatus, effectiveFocusedJob, effectiveLatestJob, session]);

  const runOpenJobDetail = (): void => {
    const job = effectiveFocusedJob ?? effectiveLatestJob;
    if (job) {
      onOpenJobDetail(job.id);
      return;
    }
    setFeedback({message: 'No active job found.', tone: 'error'});
  };

  const runPrimaryAction = async (): Promise<void> => {
    if (overlay.primaryAction === 'open_job_detail') {
      runOpenJobDetail();
      return;
    }
    if (overlay.primaryAction === 'update_status') {
      await runStatusUpdate();
      return;
    }

    try {
      const executePrimaryAction = async (): Promise<void> => {
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
            runOpenJobDetail();
            break;
          }
          case 'update_status':
            await runStatusUpdate();
            break;
          default:
            break;
        }
      };

      await withActionTimeout(
        executePrimaryAction(),
        ACTION_TIMEOUT_MS,
        'Primary action',
      );
    } catch (error) {
      const classified = classifyUnknownError(error, {
        source: 'map_shell_primary_action',
        fallbackMessage: 'Unable to complete map-shell action.',
      });
      void analytics.recordError(error, formatErrorContext('map_shell_primary_action', classified));
      setFeedback({
        message: classified.userMessage,
        tone: 'error',
      });
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
        activeJob={presentationJob}
        courierLocation={locationState.lastLocation}
        routeCoordinates={routeSummary.coordinates}
        cameraMode={cameraMode}
        onCameraModeChange={handleSetCameraMode}
        viewMode={viewMode}
      />

      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlayLayer]}>

        {showTopCard ? (
          <View pointerEvents="box-none" style={styles.topSlot}>
            <View pointerEvents="box-none" style={styles.topCard}>
              <View style={styles.topHeaderRow}>
                <View pointerEvents="none" style={styles.topCardContent}>
                  <Text style={styles.topTitle}>Senderr MapShell</Text>
                  <Text style={styles.topSubtitle}>State: {overlay.state.replace(/_/g, ' ')}</Text>
                  {presentationJob ? (
                    <View style={styles.jobMetaRow}>
                      <Text style={styles.jobMetaText} numberOfLines={1}>{presentationJob.customerName}</Text>
                      <StatusBadge status={presentationJob.status} />
                    </View>
                  ) : null}
                </View>

                <View style={styles.topHeaderActions}>
                  <Pressable style={styles.settingsChip} onPress={onOpenSettings}><Text style={styles.settingsChipText}>Settings</Text></Pressable>
                  <Pressable testID="top-card-close" style={styles.topClose} onPress={() => setShowTopCard(false)}>
                    <Text style={styles.topCloseText}>Hide</Text>
                  </Pressable>
                </View>
              </View>

              <View pointerEvents="none">
                <Text style={styles.topSubtitle}>Last sync: {safeFormatSyncTime(jobsSyncState.lastSyncedAt)}</Text>
                <Text style={styles.topSubtitle}>
                  {routeSummary.legLabel} · {formatRouteDistance(routeSummary.distanceMeters)}
                  {displayEtaMinutes ? ` · ETA ${displayEtaMinutes} min` : ''}
                </Text>
              </View>

              <View style={styles.controlGroup}>
                <Text style={styles.controlGroupLabel}>Camera</Text>
                <View style={styles.cameraRow}>
                  {(Object.keys(cameraLabels) as MapShellCameraMode[]).map(mode => {
                    const active = cameraMode === mode;
                    return (
                      <Pressable key={mode} style={[styles.cameraChip, active ? styles.cameraChipActive : null]} onPress={() => handleSetCameraMode(mode)}>
                        <Text style={[styles.cameraChipText, active ? styles.cameraChipTextActive : null]}>{cameraLabels[mode]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.controlGroup}>
                <Text style={styles.controlGroupLabel}>Route View</Text>
                <View style={styles.viewModeRow}>
                  {(Object.keys(viewModeLabels) as MapShellViewMode[]).map(mode => {
                    const active = viewMode === mode;
                    return (
                      <Pressable key={mode} style={[styles.viewModeChip, active ? styles.viewModeChipActive : null]} onPress={() => {
                        if (simAutoAdvance) {
                          setFeedback({
                            message: 'Stop auto-advance simulation before changing route view.',
                            tone: 'info',
                          });
                          return;
                        }
                        setViewMode(mode);
                      }}>
                        <Text style={[styles.viewModeChipText, active ? styles.viewModeChipTextActive : null]}>{viewModeLabels[mode]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {__DEV__ ? (
              <View style={styles.devControlsSlot}>
                <Pressable
                  testID="dev-controls-toggle"
                  style={[styles.devToggleChip, showDevControls ? styles.devToggleChipActive : null]}
                  onPress={() => setShowDevControls(value => !value)}>
                  <Text style={[styles.devToggleChipText, showDevControls ? styles.devToggleChipTextActive : null]}>
                    {showDevControls ? 'Hide Dev Controls' : 'Show Dev Controls'}
                  </Text>
                </Pressable>

                {showDevControls ? (
                  <View style={styles.devCard}>
                    <View style={styles.mockMoveRow}>
                      <Pressable
                        testID="mock-move-forward"
                        style={styles.mockMoveButton}
                        onPress={() => {
                          try {
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                            const loc = require('../services/locationService');
                            if (routeSummary?.coordinates && routeSummary.coordinates.length > 1 && typeof loc.devMockStartRouteSimulation === 'function') {
                              const state = loc.devMockSimulationState();
                              if (state.running && typeof loc.devMockStopRouteSimulation === 'function') {
                                loc.devMockStopRouteSimulation();
                              } else if (typeof loc.devMockStartRouteSimulation === 'function') {
                                setViewMode('full');
                                loc.devMockStartRouteSimulation(routeSummary.coordinates as any, {intervalMs: simSpeeds[simSpeedIndex].intervalMs});
                              }
                            } else {
                              const {devMockAdvance} = loc;
                              if (typeof devMockAdvance === 'function') devMockAdvance();
                            }
                          } catch (e) {}
                        }}>
                        <Text style={styles.mockMoveButtonText}>{(() => { try { const {devMockSimulationState} = require('../services/locationService'); return devMockSimulationState().running ? 'Pause Simulation' : 'Start Simulation'; } catch (e) { return 'Mock Move Forward'; } })()}</Text>
                      </Pressable>

                      <Pressable testID="mock-auto-advance" style={[styles.autoAdvanceChip, simAutoAdvance ? styles.autoAdvanceChipActive : null]} onPress={() => setSimAutoAdvance(p => !p)}>
                        <Text style={[styles.autoAdvanceText, simAutoAdvance ? styles.autoAdvanceTextActive : null]}>Auto‑advance: {simAutoAdvance ? 'ON' : 'OFF'}</Text>
                      </Pressable>

                      <Pressable testID="mock-speed" style={styles.autoAdvanceChip} onPress={() => setSimSpeedIndex(i => (i + 1) % simSpeeds.length)}>
                        <Text style={styles.autoAdvanceText}>{simSpeeds[simSpeedIndex].label}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable testID="show-top-card" style={styles.showTopCard} onPress={() => setShowTopCard(true)}>
            <Text style={styles.showTopCardText}>Show Top Card</Text>
          </Pressable>
        )}

        <View pointerEvents="box-none" style={styles.centerSlot}>
          {syncDegraded ? (
            <View style={styles.warningChip}>
              <Text style={styles.warningText}>
                Sync {jobsSyncState.status}: {jobsSyncState.message ?? 'Retry required'}
              </Text>
            </View>
          ) : null}
        </View>

        <View pointerEvents="box-none" style={styles.bottomSlot}>
          <Animated.View
            testID="map-shell-panel-card"
            /* allow map pan/zoom through card empty space while keeping controls clickable */
            pointerEvents="box-none"
            style={[
              styles.panelCard,
              toneStyle,
              {
                height: panelHeight,
                transform: [{translateX: cardTranslateX}],
              },
            ]}
            {...(enablePanelDragGestures && canSwipeJobs ? cardSwipeResponder.panHandlers : {})}>
            <View style={styles.panelHandleRow} {...(enablePanelDragGestures ? panelDragResponder.panHandlers : {})}>
              <View style={styles.panelHandle} testID="map-shell-panel-handle" />
              <View style={styles.panelTopRow}>
                {jobPositionLabel ? (
                  <Text testID="map-shell-panel-hint" style={styles.panelHint}>Swipe jobs ({jobPositionLabel})</Text>
                ) : (
                  <View />
                )}

                {/* Back to Jobs shown when focused job is the active job */}
                {focusedJob && focusedJob.id === activeJob?.id ? (
                  <Pressable
                    testID="map-shell-back-to-jobs"
                    style={styles.backToJobsChip}
                    onPress={() => {
                      // switch into 'browsing' mode: focus the first non-active job so the
                      // bottom-card can be swiped through. Also mark that the user
                      // cleared focus so we don't auto-relock to the active job.
                      const nonActive = swipableJobs.find(j => j.id !== activeJob?.id);
                      const browseId = nonActive ? nonActive.id : swipableJobs[0]?.id ?? null;
                      setFocusedJobId(browseId);
                      setUserClearedFocus(true);
                      try {
                        onOpenJobs();
                      } catch (err) {
                        /* swallow errors from optional handler */
                      }
                    }}>
                    <Text style={styles.backToJobsChipText}>Back to Jobs</Text>
                  </Pressable>
                ) : null}

                <Pressable testID="map-shell-panel-size-chip" style={styles.panelSizeChip} onPress={cyclePanelSize}>
                  <Text style={styles.panelSizeChipText}>Size: {PANEL_SIZE_LABELS[panelSize]}</Text>
                </Pressable>
                <Pressable testID="panel-lock-toggle" style={[styles.lockChip, panelLocked ? styles.lockChipActive : null]} onPress={() => setPanelLocked(p => !p)}>
                  <Text style={[styles.lockChipText, panelLocked ? styles.lockChipTextActive : null]}>{panelLocked ? 'Panel: Locked' : 'Panel: Unlocked'}</Text>
                </Pressable>
              </View>
            </View>

            {panelSize === 'collapsed' ? (
              <View pointerEvents="none" testID="map-shell-panel-summary" style={styles.panelSummarySection}>
                <Text numberOfLines={1} style={styles.panelTitle}>
                  {overlay.title}
                </Text>
                <Text numberOfLines={1} style={styles.panelSummaryText}>
                  {summaryLine}
                </Text>
              </View>
            ) : (
              <View pointerEvents="none" style={styles.panelSummarySection}>
                <Text numberOfLines={panelTitleLines} style={styles.panelTitle}>
                  {overlay.title}
                </Text>
                <Text numberOfLines={panelDescriptionLines} style={styles.panelText}>
                  {overlay.description}
                </Text>
              </View>
            )}

            <View pointerEvents="none">
              {showPanelRouteMeta ? (
                <Text style={styles.panelMeta}>
                  Route: {summaryLine}
                </Text>
              ) : null}
              {routeBusy ? <Text style={styles.panelMeta}>Route: recalculating...</Text> : null}
              {overlay.nextStatus === 'assigned' && missingCapabilityRequirements.length > 0 ? (
                <Text style={styles.panelError}>
                  Capability check: {missingCapabilityRequirements.map(requirement => requirement.label).join(', ')} required
                </Text>
              ) : null}
            </View>
            {showExtendedPanelMeta ? (
              <View pointerEvents="none" testID="map-shell-panel-details" style={styles.panelDetailsSection}>
                <Text style={styles.panelDetailsHeading}>Details</Text>
                <Text style={styles.panelMeta}>
                  Last location: {formatLocationSampleTime(locationState.lastLocation?.timestamp ?? null)}
                </Text>
                <Text testID="panel-camera-mode" style={styles.panelMeta}>Camera: {cameraLabels[cameraMode]}</Text>
                <Text style={styles.panelMeta}>
                  Last sync: {safeFormatSyncTime(jobsSyncState.lastSyncedAt)}
                </Text>
                {loadingJobs ? <Text style={styles.panelMeta}>Refreshing jobs...</Text> : null}
              </View>
            ) : null}
            <View pointerEvents="none">
              {!loadingJobs && jobsError ? (
                <Text style={styles.panelError}>{jobsError}</Text>
              ) : null}
              {feedback ? (
                <Text style={feedback.tone === 'error' ? styles.panelError : styles.panelInfo}>
                  {feedback.message}
                </Text>
              ) : null}
            </View>
            <View style={styles.panelActionSlot}>
              {/* Determine CTA disabled state: pending local override, missing proof, or degraded sync */}
              {(() => {
                const job = presentationJob;
                const requiredProofType = proofTypeForNextStatus(job, overlay.nextStatus);
                const hasProof = requiredProofType === 'pickup' ? !!job?.pickupProof : !!job?.dropoffProof;
                const pendingOverride = job ? localStatusOverrides[job.id] : undefined;
                const pending = Boolean(
                  pendingOverride &&
                    Date.now() - pendingOverride.requestedAt <= LOCAL_STATUS_OVERRIDE_TTL_MS,
                );
                const ctaDisabled =
                  overlay.primaryAction === 'update_status' &&
                  (pending || proofCaptureBusy || Boolean(capabilityBlockerMessage && overlay.nextStatus === 'assigned'));

                const helperMessage = pending
                  ? 'Working...'
                  : proofCaptureBusy
                    ? 'Opening camera...'
                  : capabilityBlockerMessage && overlay.nextStatus === 'assigned'
                    ? capabilityBlockerMessage
                  : requiredProofType && !hasProof
                    ? requiredProofType === 'pickup'
                      ? 'Tap to capture pickup proof and continue.'
                      : 'Tap to capture dropoff proof and continue.'
                    : syncDegraded
                      ? 'Sync degraded — actions continue and retry in background.'
                      : null;

                return (
                  <>
                    <PrimaryButton
                      label={overlay.primaryLabel}
                      onPress={() => {
                        void runPrimaryAction();
                      }}
                      disabled={ctaDisabled}
                    />
                    {helperMessage ? <Text style={styles.panelHelper}>{helperMessage}</Text> : null}
                  </>
                );
              })()}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: senderrTheme.colors.darkSurface,
  },
  overlayLayer: {
    zIndex: 10,
  },
  topSlot: {
    paddingTop: 52,
    paddingHorizontal: 12,
  },
  topCard: {
    backgroundColor: senderrTheme.colors.darkSurfaceSoft,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  topCardContent: {
    flex: 1,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topClose: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topCloseText: {
    color: '#F5F7FF',
    fontSize: 12,
    fontWeight: '700',
  },
  showTopCard: {
    marginTop: 52,
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: senderrTheme.colors.darkSurfaceSoft,
  },
  showTopCardText: {
    color: '#E4E9FF',
    fontSize: 12,
    fontWeight: '700',
  },
  topTitle: {
    color: '#F5F7FF',
    fontSize: 17,
    fontWeight: '800',
  },
  topSubtitle: {
    color: '#CCD2EC',
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
  controlGroup: {
    marginTop: 6,
    gap: 4,
  },
  controlGroupLabel: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cameraRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  viewModeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  settingsChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(199, 210, 254, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  settingsChipText: {
    color: '#E4E9FF',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cameraChipActive: {
    backgroundColor: senderrTheme.colors.brandPrimary,
    borderColor: senderrTheme.colors.brandPrimary,
  },
  cameraChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  cameraChipTextActive: {
    color: '#F3F5FF',
  },
  viewModeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewModeChipActive: {
    backgroundColor: senderrTheme.colors.brandSecondary,
    borderColor: senderrTheme.colors.brandSecondary,
  },
  viewModeChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  viewModeChipTextActive: {
    color: '#f0fdfa',
  },
  warningChip: {
    backgroundColor: 'rgba(217, 119, 6, 0.92)',
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
  devControlsSlot: {
    marginTop: 8,
    gap: 6,
  },
  devToggleChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    backgroundColor: senderrTheme.colors.darkSurfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  devToggleChipActive: {
    borderColor: 'rgba(107, 78, 255, 0.9)',
    backgroundColor: senderrTheme.colors.darkSurfaceStrong,
  },
  devToggleChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  devToggleChipTextActive: {
    color: '#E4E9FF',
  },
  devCard: {
    backgroundColor: senderrTheme.colors.darkSurfaceSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  bottomSlot: {
    marginTop: 'auto',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  panelCard: {
    borderRadius: 16,
    padding: 14,
    paddingTop: 10,
    gap: 6,
    overflow: 'hidden',
  },
  panelHandleRow: {
    gap: 6,
    marginBottom: 2,
  },
  panelHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
    alignSelf: 'center',
  },
  panelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  backToJobsChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#29405a',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
  },
  backToJobsChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  panelSizeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  panelSizeChipText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  panelToneNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
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
  panelSummarySection: {
    gap: 4,
  },
  panelSummaryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  panelText: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 13,
  },
  panelHelper: {
    marginTop: 8,
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
  },
  mockMoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  mockMoveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: senderrTheme.colors.brandSoft,
    alignSelf: 'flex-start',
  },
  mockMoveButtonText: {
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  autoAdvanceChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  autoAdvanceChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(34,197,94,0.28)',
  },
  autoAdvanceText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  autoAdvanceTextActive: {
    color: senderrTheme.colors.success,
  },
  lockChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  lockChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(250,204,21,0.18)',
  },
  lockChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  lockChipTextActive: {
    color: '#92400e',
  },
  panelHint: {
    color: senderrTheme.colors.info,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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
    color: senderrTheme.colors.info,
    fontWeight: '600',
  },
  panelDetailsSection: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  panelDetailsHeading: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  panelActionSlot: {
    marginTop: 'auto',
  },
});

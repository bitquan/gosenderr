import {useCallback, useEffect, useState} from 'react';
import {doc, getDoc, onSnapshot} from 'firebase/firestore';

import {isFirebaseReady, getFirebaseServices} from './firebase';
import type {
  FeatureFlagDefinition,
  FeatureFlagKey,
  FeatureFlagsServicePort,
  FeatureFlagsSnapshot,
} from './ports/featureFlagsPort';

const FEATURE_FLAG_DEFINITIONS: readonly FeatureFlagDefinition[] = [
  {
    key: 'trackingUpload',
    owner: 'senderr-ios',
    defaultValue: true,
    removalCriteria: 'Remove after location upload has no incident for 2 releases.',
  },
  {
    key: 'notifications',
    owner: 'senderr-ios',
    defaultValue: true,
    removalCriteria: 'Remove after notification pipeline is stable in production.',
  },
  {
    key: 'mapRouting',
    owner: 'dispatch-platform',
    defaultValue: true,
    removalCriteria: 'Remove after map/routing stack is the only supported path.',
  },
  {
    key: 'jobStatusActions',
    owner: 'senderr-ios',
    defaultValue: true,
    removalCriteria: 'Remove after status command flow has no rollout incidents.',
  },
];

const defaultsFromDefinitions = (): Record<FeatureFlagKey, boolean> => ({
  trackingUpload: FEATURE_FLAG_DEFINITIONS.find(d => d.key === 'trackingUpload')?.defaultValue ?? true,
  notifications: FEATURE_FLAG_DEFINITIONS.find(d => d.key === 'notifications')?.defaultValue ?? true,
  mapRouting: FEATURE_FLAG_DEFINITIONS.find(d => d.key === 'mapRouting')?.defaultValue ?? true,
  jobStatusActions: FEATURE_FLAG_DEFINITIONS.find(d => d.key === 'jobStatusActions')?.defaultValue ?? true,
});

const defaultFlags = defaultsFromDefinitions();

let snapshot: FeatureFlagsSnapshot = {
  flags: defaultFlags,
  source: 'defaults',
  loading: true,
  error: null,
  updatedAt: null,
};

type Listener = (next: FeatureFlagsSnapshot) => void;

const listeners = new Set<Listener>();
let unsubscribeRemote: (() => void) | null = null;

const setSnapshot = (updater: (previous: FeatureFlagsSnapshot) => FeatureFlagsSnapshot): void => {
  snapshot = updater(snapshot);
  listeners.forEach(listener => listener(snapshot));
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
  }
  return null;
};

const readPath = (data: Record<string, unknown>, path: readonly string[]): unknown => {
  let cursor: unknown = data;
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

const parseRemoteFlags = (data: Record<string, unknown>): Record<FeatureFlagKey, boolean> => {
  const next = {...defaultFlags};

  const trackingUpload =
    toBoolean(readPath(data, ['senderrIos', 'trackingUpload'])) ??
    toBoolean(readPath(data, ['courier', 'workModes']));
  if (trackingUpload !== null) {
    next.trackingUpload = trackingUpload;
  }

  const notifications =
    toBoolean(readPath(data, ['senderrIos', 'notifications'])) ??
    toBoolean(readPath(data, ['advanced', 'pushNotifications']));
  if (notifications !== null) {
    next.notifications = notifications;
  }

  const mapRouting =
    toBoolean(readPath(data, ['senderrIos', 'mapRouting'])) ??
    toBoolean(readPath(data, ['delivery', 'routes']));
  if (mapRouting !== null) {
    next.mapRouting = mapRouting;
  }

  const jobStatusActions = toBoolean(readPath(data, ['senderrIos', 'jobStatusActions']));
  if (jobStatusActions !== null) {
    next.jobStatusActions = jobStatusActions;
  }

  return next;
};

const applyRemoteData = (data: Record<string, unknown>): void => {
  const parsed = parseRemoteFlags(data);
  setSnapshot(previous => ({
    ...previous,
    flags: parsed,
    source: 'remote',
    loading: false,
    error: null,
    updatedAt: new Date().toISOString(),
  }));
};

const applyRemoteError = (error: unknown): void => {
  setSnapshot(previous => ({
    ...previous,
    loading: false,
    source: previous.source,
    error: error instanceof Error ? error.message : 'Failed to load feature flags.',
  }));
};

const connectRemote = (): void => {
  if (unsubscribeRemote || !isFirebaseReady()) {
    setSnapshot(previous => ({
      ...previous,
      loading: false,
    }));
    return;
  }

  const services = getFirebaseServices();
  if (!services) {
    setSnapshot(previous => ({
      ...previous,
      loading: false,
    }));
    return;
  }

  setSnapshot(previous => ({
    ...previous,
    loading: true,
    error: null,
  }));

  unsubscribeRemote = onSnapshot(
    doc(services.db, 'featureFlags', 'config'),
    document => {
      if (!document.exists()) {
        setSnapshot(previous => ({
          ...previous,
          flags: defaultFlags,
          source: 'defaults',
          loading: false,
          error: null,
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      applyRemoteData(document.data() as Record<string, unknown>);
    },
    applyRemoteError,
  );
};

const disconnectRemote = (): void => {
  if (unsubscribeRemote) {
    unsubscribeRemote();
    unsubscribeRemote = null;
  }
};

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(snapshot);

  if (listeners.size === 1) {
    connectRemote();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      disconnectRemote();
    }
  };
};

const refresh = async (): Promise<void> => {
  if (!isFirebaseReady()) {
    setSnapshot(previous => ({
      ...previous,
      loading: false,
    }));
    return;
  }

  const services = getFirebaseServices();
  if (!services) {
    setSnapshot(previous => ({
      ...previous,
      loading: false,
    }));
    return;
  }

  setSnapshot(previous => ({
    ...previous,
    loading: true,
    error: null,
  }));

  try {
    const snap = await getDoc(doc(services.db, 'featureFlags', 'config'));
    if (!snap.exists()) {
      setSnapshot(previous => ({
        ...previous,
        flags: defaultFlags,
        source: 'defaults',
        loading: false,
        error: null,
        updatedAt: new Date().toISOString(),
      }));
      return;
    }

    applyRemoteData(snap.data() as Record<string, unknown>);
  } catch (error) {
    applyRemoteError(error);
  }
};

const useFeatureFlags: FeatureFlagsServicePort['useFeatureFlags'] = () => {
  const [state, setState] = useState<FeatureFlagsSnapshot>(snapshot);

  useEffect(() => subscribe(setState), []);

  const runRefresh = useCallback(async (): Promise<void> => {
    await refresh();
  }, []);

  return {
    state,
    refresh: runRefresh,
  };
};

const isEnabled = (key: FeatureFlagKey): boolean => snapshot.flags[key];

const getSnapshot = (): FeatureFlagsSnapshot => snapshot;

export const featureFlagsService: FeatureFlagsServicePort = {
  useFeatureFlags,
  isEnabled,
  getSnapshot,
  definitions: FEATURE_FLAG_DEFINITIONS,
};

// Exported for tests.
export const __featureFlagsInternals = {
  parseRemoteFlags,
  defaultsFromDefinitions,
};

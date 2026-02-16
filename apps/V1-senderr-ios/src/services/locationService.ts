import {useCallback, useEffect, useState} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation, {
  type GeolocationError,
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LocationSnapshot,
  LocationTrackingController,
  LocationTrackingState,
} from './ports/locationPort';
import {featureFlagsService} from './featureFlagsService';
import {runtimeConfig} from '../config/runtime';

export type {LocationSnapshot, LocationTrackingController, LocationTrackingState} from './ports/locationPort';

const toSnapshot = (position: GeolocationResponse): LocationSnapshot => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  timestamp: position.timestamp,
});

const requestAndroidLocation = async (): Promise<boolean> => {
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);

  return (
    result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
    result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
  );
};

const requestIOSLocation = async (): Promise<boolean> => {
  return new Promise(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
};

type Listener = (state: LocationTrackingState) => void;

const listeners = new Set<Listener>();
let watchId: number | null = null;
let permissionPromise: Promise<boolean> | null = null;
let hydrationPromise: Promise<void> | null = null;
let hasHydratedState = false;
let lastPermissionRequestAt = 0;

const LOCATION_STATE_STORAGE_KEY = '@senderr/location_state_v1';
const LOCATION_PERMISSION_REQUEST_COOLDOWN_MS = 15_000;

let sharedState: LocationTrackingState = {
  hasPermission: false,
  tracking: false,
  lastLocation: null,
  error: null,
};

const persistLocationState = (): void => {
  const payload = {
    hasPermission: sharedState.hasPermission,
    lastLocation: sharedState.lastLocation,
  };
  void AsyncStorage.setItem(LOCATION_STATE_STORAGE_KEY, JSON.stringify(payload)).catch(() => undefined);
};

const publishState = (): void => {
  listeners.forEach(listener => {
    listener(sharedState);
  });
};

const updateSharedState = (updater: (prev: LocationTrackingState) => LocationTrackingState): void => {
  sharedState = updater(sharedState);
  persistLocationState();
  publishState();
};

const hydrateSharedState = async (): Promise<void> => {
  if (hasHydratedState) {
    return;
  }
  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCATION_STATE_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<LocationTrackingState> | null;
      if (!parsed) {
        return;
      }

      const nextHasPermission =
        typeof parsed.hasPermission === 'boolean' ? parsed.hasPermission : sharedState.hasPermission;
      const parsedLocation = parsed.lastLocation as Partial<LocationSnapshot> | null | undefined;
      const nextLastLocation =
        parsedLocation &&
        typeof parsedLocation.latitude === 'number' &&
        typeof parsedLocation.longitude === 'number' &&
        typeof parsedLocation.timestamp === 'number'
          ? {
              latitude: parsedLocation.latitude,
              longitude: parsedLocation.longitude,
              accuracy: typeof parsedLocation.accuracy === 'number' ? parsedLocation.accuracy : 0,
              timestamp: parsedLocation.timestamp,
            }
          : sharedState.lastLocation;

      sharedState = {
        ...sharedState,
        hasPermission: nextHasPermission,
        lastLocation: nextLastLocation,
      };
      publishState();
    } catch {
      // Keep defaults when cache is unavailable or malformed.
    } finally {
      hasHydratedState = true;
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
};

const setTrackingError = (error: GeolocationError): void => {
  updateSharedState(prev => ({
    ...prev,
    hasPermission: error.code === 1 ? false : prev.hasPermission,
    error: error.message,
    tracking: false,
  }));

  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
};

const requestPermissionInternal = async (): Promise<boolean> => {
  await hydrateSharedState();

  if (permissionPromise) {
    return permissionPromise;
  }

  permissionPromise = (async () => {
    try {
      const granted = Platform.OS === 'ios' ? await requestIOSLocation() : await requestAndroidLocation();
      updateSharedState(prev => ({
        ...prev,
        hasPermission: granted,
        error: granted ? null : 'Location permission denied.',
      }));
      return granted;
    } catch (error) {
      updateSharedState(prev => ({
        ...prev,
        hasPermission: false,
        error: error instanceof Error ? error.message : 'Unable to request location permission.',
      }));
      return false;
    }
  })();

  try {
    return await permissionPromise;
  } finally {
    permissionPromise = null;
  }
};

const stopTrackingInternal = (): void => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }

  updateSharedState(prev => ({
    ...prev,
    tracking: false,
  }));
};

const startTrackingInternal = async (): Promise<void> => {
  await hydrateSharedState();

  if (!featureFlagsService.isEnabled('trackingUpload')) {
    updateSharedState(prev => ({
      ...prev,
      tracking: false,
      error: 'Location tracking is temporarily disabled by rollout controls.',
    }));
    return;
  }

  if (watchId !== null) {
    return;
  }

  const now = Date.now();
  const canRequestPermission = now - lastPermissionRequestAt >= LOCATION_PERMISSION_REQUEST_COOLDOWN_MS;
  if (!sharedState.hasPermission && !canRequestPermission) {
    updateSharedState(prev => ({
      ...prev,
      tracking: false,
      error: prev.error ?? 'Location permission still pending. Open iOS Settings if blocked.',
    }));
    return;
  }
  if (!sharedState.hasPermission) {
    lastPermissionRequestAt = now;
  }

  const hasPermission = sharedState.hasPermission || (await requestPermissionInternal());
  if (!hasPermission) {
    return;
  }

  updateSharedState(prev => ({
    ...prev,
    tracking: true,
    error: null,
  }));

  const devMode = runtimeConfig.envName !== 'prod';
  const watchOptions = devMode
    ? {
        enableHighAccuracy: false,
        distanceFilter: 30,
        interval: 10_000,
        fastestInterval: 7_000,
      }
    : {
        enableHighAccuracy: true,
        distanceFilter: 15,
        interval: 5000,
        fastestInterval: 3000,
      };

  watchId = Geolocation.watchPosition(
    position => {
      updateSharedState(prev => ({
        ...prev,
        tracking: true,
        error: null,
        lastLocation: toSnapshot(position),
      }));
    },
    setTrackingError,
    watchOptions,
  );
};

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(sharedState);

  return () => {
    listeners.delete(listener);
  };
};

export const useLocationTracking = (): {
  state: LocationTrackingState;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
} => {
  const [state, setState] = useState<LocationTrackingState>(sharedState);

  useEffect(() => {
    const unsubscribe = subscribe(setState);
    void hydrateSharedState();
    return unsubscribe;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return requestPermissionInternal();
  }, []);
  const startTracking = useCallback(async (): Promise<void> => {
    return startTrackingInternal();
  }, []);
  const stopTracking = useCallback((): void => {
    stopTrackingInternal();
  }, []);

  const controller: LocationTrackingController = {
    state,
    requestPermission,
    startTracking,
    stopTracking,
  };

  return controller;
};

// Dev helper: nudge the shared location forward for testing flows that depend on GPS.
export const devMockAdvance = (deltaMeters = 25): void => {
  if (!__DEV__) return;
  const last = sharedState.lastLocation;
  if (!last) return;
  // very small lat/lon delta approximation
  const delta = (deltaMeters / 111_320) || 0.0002;
  updateSharedState(prev => ({
    ...prev,
    lastLocation: last
      ? {
          latitude: last.latitude + delta,
          longitude: last.longitude + delta,
          accuracy: last.accuracy,
          timestamp: Date.now(),
        }
      : null,
  }));
};

// Dev route-following simulator ------------------------------------------------
// The simulator emits synthetic location updates along a provided polyline so
// UI and job flows can be exercised in a deterministic way during development.
let _simCoords: Array<{latitude: number; longitude: number}> = [];
let _simIndex = 0;
let _simTimer: ReturnType<typeof setInterval> | null = null;
let _simIntervalMs = 1000;
let _simRunning = false;

export const devMockSimulationState = (): {running: boolean; index: number; total: number} => {
  return {running: _simRunning, index: _simIndex, total: _simCoords.length};
};

export const devMockStartRouteSimulation = (
  coordinates: Array<{latitude: number; longitude: number}>,
  options?: {intervalMs?: number},
): void => {
  if (!__DEV__) return;
  if (!coordinates || coordinates.length === 0) return;
  devMockStopRouteSimulation();
  _simCoords = coordinates.map(c => ({latitude: c.latitude, longitude: c.longitude}));
  _simIndex = 0;
  _simIntervalMs = options?.intervalMs ?? 1000;
  _simRunning = true;

  // immediately emit first coordinate
  updateSharedState(prev => ({
    ...prev,
    lastLocation: _simCoords[0]
      ? {
          latitude: _simCoords[0].latitude,
          longitude: _simCoords[0].longitude,
          accuracy: prev.lastLocation?.accuracy ?? 5,
          timestamp: Date.now(),
        }
      : prev.lastLocation,
  }));

  _simTimer = setInterval(() => {
    _simIndex = Math.min(_simIndex + 1, _simCoords.length - 1);
    const coord = _simCoords[_simIndex];
    updateSharedState(prev => ({
      ...prev,
      lastLocation: coord
        ? {
            latitude: coord.latitude,
            longitude: coord.longitude,
            accuracy: prev.lastLocation?.accuracy ?? 5,
            timestamp: Date.now(),
          }
        : prev.lastLocation,
    }));

    if (_simIndex >= _simCoords.length - 1) {
      // stop automatically at end
      devMockStopRouteSimulation();
    }
  }, _simIntervalMs);
};

export const devMockStopRouteSimulation = (): void => {
  if (!__DEV__) return;
  if (_simTimer) {
    clearInterval(_simTimer);
    _simTimer = null;
  }
  _simRunning = false;
  _simCoords = [];
  _simIndex = 0;
};

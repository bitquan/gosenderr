import {useCallback, useEffect, useState} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation, {
  type GeolocationError,
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import type {
  LocationSnapshot,
  LocationTrackingController,
  LocationTrackingState,
} from './ports/locationPort';

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

let sharedState: LocationTrackingState = {
  hasPermission: false,
  tracking: false,
  lastLocation: null,
  error: null,
};

const publishState = (): void => {
  listeners.forEach(listener => {
    listener(sharedState);
  });
};

const updateSharedState = (updater: (prev: LocationTrackingState) => LocationTrackingState): void => {
  sharedState = updater(sharedState);
  publishState();
};

const setTrackingError = (error: GeolocationError): void => {
  updateSharedState(prev => ({
    ...prev,
    error: error.message,
    tracking: false,
  }));

  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
};

const requestPermissionInternal = async (): Promise<boolean> => {
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
  if (watchId !== null) {
    return;
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
    {
      enableHighAccuracy: true,
      distanceFilter: 15,
      interval: 5000,
      fastestInterval: 3000,
    },
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

  useEffect(() => subscribe(setState), []);

  const requestPermission = useCallback(async (): Promise<boolean> => requestPermissionInternal(), []);
  const startTracking = useCallback(async (): Promise<void> => startTrackingInternal(), []);
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

import {useSyncExternalStore} from 'react';
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

const initialState: LocationTrackingState = {
  hasPermission: false,
  tracking: false,
  lastLocation: null,
  error: null,
};

let stateSnapshot: LocationTrackingState = initialState;
let watchId: number | null = null;

const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const setStateSnapshot = (
  updater: LocationTrackingState | ((previous: LocationTrackingState) => LocationTrackingState),
): void => {
  stateSnapshot = typeof updater === 'function' ? updater(stateSnapshot) : updater;
  emit();
};

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

const setTrackingError = (error: GeolocationError): void => {
  setStateSnapshot(previous => ({
    ...previous,
    error: error.message,
    tracking: false,
  }));
};

const requestPermissionInternal = async (): Promise<boolean> => {
  try {
    const granted = Platform.OS === 'ios' ? await requestIOSLocation() : await requestAndroidLocation();
    setStateSnapshot(previous => ({
      ...previous,
      hasPermission: granted,
      error: granted ? null : 'Location permission denied.',
    }));
    return granted;
  } catch (error) {
    setStateSnapshot(previous => ({
      ...previous,
      hasPermission: false,
      error: error instanceof Error ? error.message : 'Unable to request location permission.',
    }));
    return false;
  }
};

const stopTrackingInternal = (): void => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  setStateSnapshot(previous => ({
    ...previous,
    tracking: false,
  }));
};

const startTrackingInternal = async (): Promise<void> => {
  if (!stateSnapshot.hasPermission) {
    const granted = await requestPermissionInternal();
    if (!granted) {
      return;
    }
  }

  if (watchId !== null) {
    return;
  }

  setStateSnapshot(previous => ({
    ...previous,
    tracking: true,
    error: null,
  }));

  watchId = Geolocation.watchPosition(
    position => {
      setStateSnapshot(previous => ({
        ...previous,
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

export const useLocationTracking = (): {
  state: LocationTrackingState;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
} => {
  const state = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => stateSnapshot,
    () => stateSnapshot,
  );

  const controller: LocationTrackingController = {
    state,
    requestPermission: requestPermissionInternal,
    startTracking: startTrackingInternal,
    stopTracking: stopTrackingInternal,
  };

  return controller;
};

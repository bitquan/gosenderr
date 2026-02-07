import {useCallback, useEffect, useRef, useState} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation, {
  type GeolocationError,
  type GeolocationResponse,
} from '@react-native-community/geolocation';

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type LocationTrackingState = {
  hasPermission: boolean;
  tracking: boolean;
  lastLocation: LocationSnapshot | null;
  error: string | null;
};

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

export const useLocationTracking = (): {
  state: LocationTrackingState;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
} => {
  const watchIdRef = useRef<number | null>(null);
  const [state, setState] = useState<LocationTrackingState>({
    hasPermission: false,
    tracking: false,
    lastLocation: null,
    error: null,
  });

  const setTrackingError = (error: GeolocationError): void => {
    setState(prev => ({
      ...prev,
      error: error.message,
      tracking: false,
    }));
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = Platform.OS === 'ios' ? await requestIOSLocation() : await requestAndroidLocation();
      setState(prev => ({
        ...prev,
        hasPermission: granted,
        error: granted ? null : 'Location permission denied.',
      }));
      return granted;
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: error instanceof Error ? error.message : 'Unable to request location permission.',
      }));
      return false;
    }
  }, []);

  const stopTracking = useCallback((): void => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({
      ...prev,
      tracking: false,
    }));
  }, []);

  const startTracking = useCallback(async (): Promise<void> => {
    if (!state.hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    if (watchIdRef.current !== null) {
      return;
    }

    watchIdRef.current = Geolocation.watchPosition(
      position => {
        setState(prev => ({
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
  }, [requestPermission, state.hasPermission]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {state, requestPermission, startTracking, stopTracking};
};

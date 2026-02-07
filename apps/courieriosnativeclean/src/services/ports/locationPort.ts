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

export type LocationTrackingController = {
  state: LocationTrackingState;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
};

export type UseLocationTracking = () => LocationTrackingController;

export interface LocationServicePort {
  useLocationTracking: UseLocationTracking;
}

import { useEffect, useRef, useState } from "react";
import { updateLocation } from "@/lib/courierFunctions";

const DEFAULT_WRITE_INTERVAL_MS = 5000;
const MOVE_THRESHOLD_METERS = 25;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface UseLocationUpdaterOptions {
  enabled: boolean;
  intervalMs?: number;
}

export function useLocationUpdater(options: UseLocationUpdaterOptions) {
  const { enabled, intervalMs = DEFAULT_WRITE_INTERVAL_MS } = options;
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastWriteTimeRef = useRef<number>(0);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setIsTracking(true);
    setPermissionDenied(false);
    setLastError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy, speed, heading } = position.coords;
        const now = Date.now();

        const timeSinceLastWrite = now - lastWriteTimeRef.current;
        let shouldWrite = timeSinceLastWrite >= intervalMs;

        if (!shouldWrite && lastPositionRef.current) {
          const distance = getDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            lat,
            lng,
          );
          shouldWrite = distance >= MOVE_THRESHOLD_METERS;
        }

        if (!shouldWrite) {
          return;
        }

        try {
          await updateLocation({
            lat,
            lng,
            accuracy,
            speed: speed ?? undefined,
            heading: heading ?? undefined,
          });

          lastWriteTimeRef.current = now;
          lastPositionRef.current = { lat, lng };
        } catch (err: any) {
          const msg = err?.message || "Failed to update location";
          setLastError(msg);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }
        setLastError(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, intervalMs]);

  return { isTracking, permissionDenied, lastError };
}

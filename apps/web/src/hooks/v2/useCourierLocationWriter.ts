'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserRole } from './useUserRole';
import geohash from 'ngeohash';

const WRITE_INTERVAL_MS = 5000; // Write at most every 5 seconds
const MOVE_THRESHOLD_METERS = 25; // Or if moved > 25 meters

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
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

export function useCourierLocationWriter() {
  const { role, uid, userDoc } = useUserRole();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const lastWriteTimeRef = useRef<number>(0);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Only track if courier and online
    const shouldTrack =
      role === 'courier' &&
      uid &&
      userDoc?.courier?.isOnline === true;

    if (!shouldTrack) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsTracking(false);
      }
      return;
    }

    // Start tracking
    if (watchIdRef.current === null) {
      setIsTracking(true);
      setPermissionDenied(false);

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude: lat, longitude: lng, heading } = position.coords;
          const now = Date.now();

          // Throttle: check time and distance
          const timeSinceLastWrite = now - lastWriteTimeRef.current;
          let shouldWrite = timeSinceLastWrite >= WRITE_INTERVAL_MS;

          if (!shouldWrite && lastPositionRef.current) {
            const distance = getDistance(
              lastPositionRef.current.lat,
              lastPositionRef.current.lng,
              lat,
              lng
            );
            shouldWrite = distance >= MOVE_THRESHOLD_METERS;
          }

          if (shouldWrite && uid) {
            try {
              const geoHash = geohash.encode(lat, lng, 6);
              
              await updateDoc(doc(db, 'users', uid), {
                'location.lat': lat,
                'location.lng': lng,
                'location.geohash': geoHash,
                ...(heading !== null && { 'location.heading': heading }),
                'location.updatedAt': serverTimestamp(),
              });

              lastWriteTimeRef.current = now;
              lastPositionRef.current = { lat, lng };
            } catch (error) {
              console.error('Failed to update courier location:', error);
            }
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsTracking(false);
      }
    };
  }, [role, uid, userDoc?.courier?.isOnline]);

  return {
    isTracking,
    permissionDenied,
  };
}

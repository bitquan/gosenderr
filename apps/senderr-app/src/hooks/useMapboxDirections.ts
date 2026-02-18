/**
 * Hook for fetching and managing Mapbox directions/routes
 */

<<<<<<< HEAD
import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchJobRoute as fetchJobRouteAPI } from '@/lib/navigation/directions'
import type { DirectionsResponse, RouteData, RouteSegment } from '@/lib/navigation/types'

interface UseMapboxDirectionsOptions {
  autoFetch?: boolean
  cacheRoutes?: boolean
}

interface UseMapboxDirectionsResult {
  route: RouteData | null
  routeSegments: RouteSegment[]
  loading: boolean
  error: Error | null
  fetchRoute: (
    currentLocation: [number, number],
    destination: [number, number]
  ) => Promise<RouteData | undefined>
  fetchJobRoute: (
    currentLocation: [number, number],
    pickup: [number, number],
    dropoff: [number, number]
  ) => Promise<RouteData | undefined>
  clearRoute: () => void
=======
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchJobRoute as fetchJobRouteAPI } from "@/lib/navigation/directions";
import type {
  DirectionsResponse,
  RouteData,
  RouteSegment,
} from "@/lib/navigation/types";

interface UseMapboxDirectionsOptions {
  autoFetch?: boolean;
  cacheRoutes?: boolean;
}

interface UseMapboxDirectionsResult {
  route: RouteData | null;
  routeSegments: RouteSegment[];
  loading: boolean;
  error: Error | null;
  fetchRoute: (
    currentLocation: [number, number],
    destination: [number, number],
  ) => Promise<RouteData | undefined>;
  fetchJobRoute: (
    currentLocation: [number, number],
    pickup: [number, number],
    dropoff: [number, number],
  ) => Promise<RouteData | undefined>;
  clearRoute: () => void;
>>>>>>> senderr_app
}

/**
 * Hook to fetch and manage routes from Mapbox Directions API
 */
export function useMapboxDirections(
<<<<<<< HEAD
  options: UseMapboxDirectionsOptions = {}
): UseMapboxDirectionsResult {
  const { cacheRoutes = true } = options

  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Cache to avoid re-fetching same routes
  const cacheRef = useRef<Map<string, DirectionsResponse>>(new Map())

  // Generate cache key from coordinates
  const getCacheKey = useCallback(
    (current: [number, number], pickup: [number, number], dropoff: [number, number]) => {
      return `${current[0]},${current[1]};${pickup[0]},${pickup[1]};${dropoff[0]},${dropoff[1]}`
    },
    []
  )
=======
  options: UseMapboxDirectionsOptions = {},
): UseMapboxDirectionsResult {
  const { cacheRoutes = true } = options;

  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache to avoid re-fetching same routes
  const cacheRef = useRef<Map<string, DirectionsResponse>>(new Map());

  // Generate cache key from coordinates
  const getCacheKey = useCallback(
    (
      current: [number, number],
      pickup: [number, number],
      dropoff: [number, number],
    ) => {
      return `${current[0]},${current[1]};${pickup[0]},${pickup[1]};${dropoff[0]},${dropoff[1]}`;
    },
    [],
  );
>>>>>>> senderr_app

  /**
   * Fetch route from current location through pickup to dropoff (full job route)
   */
  const fetchJobRoute = useCallback(
    async (
      currentLocation: [number, number],
      pickup: [number, number],
<<<<<<< HEAD
      dropoff: [number, number]
    ) => {
      const cacheKey = getCacheKey(currentLocation, pickup, dropoff)

      // Check cache first
      if (cacheRoutes && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!
        const routeData = cached.routes[0]
        setRoute(routeData)
        setError(null)
        return routeData
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetchJobRouteAPI(currentLocation, pickup, dropoff)

        if (response.routes && response.routes.length > 0) {
          const routeData = response.routes[0]
          setRoute(routeData)

          // Cache the response
          if (cacheRoutes) {
            cacheRef.current.set(cacheKey, response)
          }

          return routeData
        } else {
          throw new Error('No route found')
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch route')
        setError(error)
        setRoute(null)
        console.error('Failed to fetch route:', error)
      } finally {
        setLoading(false)
      }
    },
    [cacheRoutes, getCacheKey]
  )
=======
      dropoff: [number, number],
    ) => {
      const cacheKey = getCacheKey(currentLocation, pickup, dropoff);

      // Check cache first
      if (cacheRoutes && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        const routeData = cached.routes[0];
        setRoute(routeData);
        setError(null);
        return routeData;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchJobRouteAPI(
          currentLocation,
          pickup,
          dropoff,
        );

        if (response.routes && response.routes.length > 0) {
          const routeData = response.routes[0];
          setRoute(routeData);

          // Cache the response
          if (cacheRoutes) {
            cacheRef.current.set(cacheKey, response);
          }

          return routeData;
        } else {
          throw new Error("No route found");
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to fetch route");
        setError(error);
        setRoute(null);
        console.error("Failed to fetch route:", error);
      } finally {
        setLoading(false);
      }
    },
    [cacheRoutes, getCacheKey],
  );
>>>>>>> senderr_app

  /**
   * Fetch simple point-to-point route (for navigation)
   */
  const fetchRoute = useCallback(
    async (
      currentLocation: [number, number],
<<<<<<< HEAD
      destination: [number, number]
    ) => {
      const cacheKey = `${currentLocation[0]},${currentLocation[1]};${destination[0]},${destination[1]}`

      // Check cache first
      if (cacheRoutes && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!
        const routeData = cached.routes[0]
        setRoute(routeData)
        setError(null)
        return routeData
      }

      setLoading(true)
      setError(null)

      try {
        // Use simple 2-point directions (not job route)
        const { fetchDirections } = await import('@/lib/navigation/directions')
        const response = await fetchDirections([currentLocation, destination])

        if (response.routes && response.routes.length > 0) {
          const routeData = response.routes[0]
          setRoute(routeData)

          // Cache the response
          if (cacheRoutes) {
            cacheRef.current.set(cacheKey, response)
          }

          return routeData
        } else {
          throw new Error('No route found')
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch route')
        setError(error)
        setRoute(null)
        console.error('Failed to fetch route:', error)
      } finally {
        setLoading(false)
      }
    },
    [cacheRoutes]
  )
=======
      destination: [number, number],
    ) => {
      const cacheKey = `${currentLocation[0]},${currentLocation[1]};${destination[0]},${destination[1]}`;

      // Check cache first
      if (cacheRoutes && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        const routeData = cached.routes[0];
        setRoute(routeData);
        setError(null);
        return routeData;
      }

      setLoading(true);
      setError(null);

      try {
        // Use simple 2-point directions (not job route)
        const { fetchDirections } = await import("@/lib/navigation/directions");
        const response = await fetchDirections([currentLocation, destination]);

        if (response.routes && response.routes.length > 0) {
          const routeData = response.routes[0];
          setRoute(routeData);

          // Cache the response
          if (cacheRoutes) {
            cacheRef.current.set(cacheKey, response);
          }

          return routeData;
        } else {
          throw new Error("No route found");
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to fetch route");
        setError(error);
        setRoute(null);
        console.error("Failed to fetch route:", error);
      } finally {
        setLoading(false);
      }
    },
    [cacheRoutes],
  );
>>>>>>> senderr_app

  /**
   * Clear current route
   */
  const clearRoute = useCallback(() => {
<<<<<<< HEAD
    setRoute(null)
    setError(null)
  }, [])
=======
    setRoute(null);
    setError(null);
  }, []);
>>>>>>> senderr_app

  /**
   * Generate route segments with different colors
   * Segment 1: Current location to pickup (blue)
   * Segment 2: Pickup to dropoff (green)
   */
  const routeSegments: RouteSegment[] = route
<<<<<<< HEAD
    ? [
        {
          coordinates: (route.legs[0] as any)?.geometry?.coordinates || route.legs[0]?.steps.flatMap(s => s.geometry.coordinates) || [],
          color: '#3b82f6', // blue-500
          type: 'to-pickup' as const,
        },
        {
          coordinates: (route.legs[1] as any)?.geometry?.coordinates || route.legs[1]?.steps.flatMap(s => s.geometry.coordinates) || [],
          color: '#10b981', // green-500
          type: 'pickup-to-dropoff' as const,
        },
      ].filter(segment => segment.coordinates.length > 0)
    : []
=======
    ? (() => {
        const legToCoords = (legIndex: number): [number, number][] => {
          const leg = route.legs[legIndex] as unknown as
            | {
                geometry?: { coordinates?: [number, number][] };
                steps?: { geometry?: { coordinates?: [number, number][] } }[];
              }
            | undefined;

          if (!leg) return [];
          if (leg.geometry && Array.isArray(leg.geometry.coordinates)) {
            return leg.geometry.coordinates;
          }
          if (Array.isArray(leg.steps)) {
            return leg.steps.flatMap((s) => s.geometry?.coordinates ?? []);
          }
          return [];
        };

        const coords0 = legToCoords(0);
        const coords1 = legToCoords(1);

        return [
          {
            coordinates: coords0,
            color: "#3b82f6",
            type: "to-pickup" as const,
          },
          {
            coordinates: coords1,
            color: "#10b981",
            type: "pickup-to-dropoff" as const,
          },
        ].filter((segment) => segment.coordinates.length > 0);
      })()
    : [];
>>>>>>> senderr_app

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
<<<<<<< HEAD
      cacheRef.current.clear()
    }
  }, [])
=======
      cacheRef.current.clear();
    };
  }, []);
>>>>>>> senderr_app

  return {
    route,
    routeSegments,
    loading,
    error,
    fetchRoute,
    fetchJobRoute,
    clearRoute,
<<<<<<< HEAD
  }
=======
  };
>>>>>>> senderr_app
}

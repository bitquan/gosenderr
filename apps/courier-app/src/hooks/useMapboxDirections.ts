/**
 * Hook for fetching and managing Mapbox directions/routes
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchJobRoute } from '@/lib/navigation/directions'
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
    pickup: [number, number],
    dropoff: [number, number]
  ) => Promise<void>
  clearRoute: () => void
}

/**
 * Hook to fetch and manage routes from Mapbox Directions API
 */
export function useMapboxDirections(
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

  /**
   * Fetch route from current location through pickup to dropoff
   */
  const fetchRoute = useCallback(
    async (
      currentLocation: [number, number],
      pickup: [number, number],
      dropoff: [number, number]
    ) => {
      const cacheKey = getCacheKey(currentLocation, pickup, dropoff)

      // Check cache first
      if (cacheRoutes && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!
        setRoute(cached.routes[0])
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetchJobRoute(currentLocation, pickup, dropoff)

        if (response.routes && response.routes.length > 0) {
          const routeData = response.routes[0]
          setRoute(routeData)

          // Cache the response
          if (cacheRoutes) {
            cacheRef.current.set(cacheKey, response)
          }
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

  /**
   * Clear current route
   */
  const clearRoute = useCallback(() => {
    setRoute(null)
    setError(null)
  }, [])

  /**
   * Generate route segments with different colors
   * Segment 1: Current location to pickup (blue)
   * Segment 2: Pickup to dropoff (green)
   */
  const routeSegments: RouteSegment[] = route
    ? [
        {
          coordinates: route.legs[0]?.geometry?.coordinates || route.legs[0]?.steps.flatMap(s => s.geometry.coordinates) || [],
          color: '#3b82f6', // blue-500
          type: 'to-pickup',
        },
        {
          coordinates: route.legs[1]?.geometry?.coordinates || route.legs[1]?.steps.flatMap(s => s.geometry.coordinates) || [],
          color: '#10b981', // green-500
          type: 'pickup-to-dropoff',
        },
      ].filter(segment => segment.coordinates.length > 0)
    : []

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      cacheRef.current.clear()
    }
  }, [])

  return {
    route,
    routeSegments,
    loading,
    error,
    fetchRoute,
    clearRoute,
  }
}

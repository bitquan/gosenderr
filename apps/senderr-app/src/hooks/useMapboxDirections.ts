/**
 * Hook for fetching and managing Mapbox directions/routes
 */

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
   * Fetch route from current location through pickup to dropoff (full job route)
   */
  const fetchJobRoute = useCallback(
    async (
      currentLocation: [number, number],
      pickup: [number, number],
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

  /**
   * Fetch simple point-to-point route (for navigation)
   */
  const fetchRoute = useCallback(
    async (
      currentLocation: [number, number],
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
  const routeSegments: RouteSegment[] = route ? (() => {
    const legToCoords = (legIndex: number): [number, number][] => {
      const leg = route.legs[legIndex] as unknown as {
        geometry?: { coordinates?: [number, number][] }
        steps?: { geometry?: { coordinates?: [number, number][] } }[]
      } | undefined

      if (!leg) return []
      if (leg.geometry && Array.isArray(leg.geometry.coordinates)) {
        return leg.geometry.coordinates
      }
      if (Array.isArray(leg.steps)) {
        return leg.steps.flatMap((s) => s.geometry?.coordinates ?? [])
      }
      return []
    }

    const coords0 = legToCoords(0)
    const coords1 = legToCoords(1)

    return [
      { coordinates: coords0, color: '#3b82f6', type: 'to-pickup' as const },
      { coordinates: coords1, color: '#10b981', type: 'pickup-to-dropoff' as const },
    ].filter(segment => segment.coordinates.length > 0)
  })() : []

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
    fetchJobRoute,
    clearRoute,
  }
}

/**
 * Hook for controlling Mapbox map camera/focus
 */

import { useCallback } from 'react'
import type mapboxgl from 'mapbox-gl'

interface FitBoundsOptions {
  padding?: number | { top: number; right: number; bottom: number; left: number }
  maxZoom?: number
  duration?: number
}

interface UseMapFocusResult {
  flyToLocation: (location: [number, number], zoom?: number) => void
  fitBounds: (coordinates: [number, number][], options?: FitBoundsOptions) => void
  fitRoute: (routeCoordinates: [number, number][]) => void
  recenterOnDriver: (location: [number, number]) => void
}

/**
 * Hook to control map camera and focus
 */
export function useMapFocus(map: mapboxgl.Map | null): UseMapFocusResult {
  /**
   * Fly to specific location with animation
   */
  const flyToLocation = useCallback(
    (location: [number, number], zoom: number = 14) => {
      if (!map) return

      map.flyTo({
        center: location,
        zoom,
        duration: 1500,
        essential: true,
      })
    },
    [map]
  )

  /**
   * Fit map bounds to show all coordinates
   */
  const fitBounds = useCallback(
    (coordinates: [number, number][], options: FitBoundsOptions = {}) => {
      if (!map || coordinates.length === 0) return

      const defaultOptions = {
        padding: 80,
        maxZoom: 15,
        duration: 1000,
        ...options,
      }

      // Create bounds from coordinates
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new (window as any).mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      )

      map.fitBounds(bounds, defaultOptions)
    },
    [map]
  )

  /**
   * Fit map to show entire route
   */
  const fitRoute = useCallback(
    (routeCoordinates: [number, number][]) => {
      fitBounds(routeCoordinates, {
        padding: { top: 100, right: 60, bottom: 320, left: 60 }, // Extra bottom padding for job list
        maxZoom: 13, // Don't zoom in too close - was 14
      })
    },
    [fitBounds]
  )

  /**
   * Recenter map on driver's current location
   */
  const recenterOnDriver = useCallback(
    (location: [number, number]) => {
      flyToLocation(location, 15)
    },
    [flyToLocation]
  )

  return {
    flyToLocation,
    fitBounds,
    fitRoute,
    recenterOnDriver,
  }
}

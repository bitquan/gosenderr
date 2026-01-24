/**
 * Mapbox Directions API integration
 * Docs: https://docs.mapbox.com/api/navigation/directions/
 */

import type { DirectionsResponse, DirectionsOptions } from './types'

const MAPBOX_API_BASE = 'https://api.mapbox.com/directions/v5/mapbox'

/**
 * Fetch directions from Mapbox Directions API
 * @param coordinates Array of [lng, lat] waypoints
 * @param options Directions API options
 * @returns Promise with route data
 */
export async function fetchDirections(
  coordinates: [number, number][],
  options: DirectionsOptions = {}
): Promise<DirectionsResponse> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN

  if (!token) {
    throw new Error('VITE_MAPBOX_TOKEN not configured')
  }

  if (coordinates.length < 2) {
    throw new Error('At least 2 coordinates required for directions')
  }

  // Default options
  const defaultOptions: DirectionsOptions = {
    profile: 'driving-traffic',
    geometries: 'geojson',
    steps: true,
    bannerInstructions: true,
    voiceInstructions: false,
    alternatives: false,
    overview: 'full',
    ...options,
  }

  // Build coordinate string: lng,lat;lng,lat;lng,lat
  const coordinateString = coordinates
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(';')

  // Build query params
  const params = new URLSearchParams({
    access_token: token,
    geometries: defaultOptions.geometries!,
    steps: String(defaultOptions.steps),
    banner_instructions: String(defaultOptions.bannerInstructions),
    voice_instructions: String(defaultOptions.voiceInstructions),
    alternatives: String(defaultOptions.alternatives),
    overview: defaultOptions.overview!,
  })

  const url = `${MAPBOX_API_BASE}/${defaultOptions.profile}/${coordinateString}?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Mapbox API error: ${error.message || response.statusText}`)
    }

    const data: DirectionsResponse = await response.json()

    if (data.code !== 'Ok') {
      throw new Error(`Directions API returned code: ${data.code}`)
    }

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found')
    }

    return data
  } catch (error) {
    console.error('Failed to fetch directions:', error)
    throw error
  }
}

/**
 * Fetch route from current location to pickup to dropoff
 * @param currentLocation Current driver location [lng, lat]
 * @param pickup Pickup location [lng, lat]
 * @param dropoff Dropoff location [lng, lat]
 * @returns Promise with route data
 */
export async function fetchJobRoute(
  currentLocation: [number, number],
  pickup: [number, number],
  dropoff: [number, number]
): Promise<DirectionsResponse> {
  return fetchDirections([currentLocation, pickup, dropoff], {
    profile: 'driving-traffic',
    steps: true,
  })
}

/**
 * Calculate distance in miles from meters
 */
export function metersToMiles(meters: number): number {
  return meters * 0.000621371
}

/**
 * Calculate duration in minutes from seconds
 */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60)
}

/**
 * Format ETA string from seconds
 */
export function formatETA(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

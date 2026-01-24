/**
 * Navigation and routing types for Mapbox Directions API integration
 */

export interface RouteManeuver {
  type: string
  modifier?: string
  instruction: string
  location: [number, number] // [lng, lat]
}

export interface RouteStep {
  distance: number // meters
  duration: number // seconds
  instruction: string
  geometry: {
    type: 'LineString'
    coordinates: [number, number][] // [lng, lat]
  }
  maneuver: RouteManeuver
}

export interface RouteLeg {
  distance: number // meters
  duration: number // seconds
  steps: RouteStep[]
}

export interface RouteGeometry {
  type: 'LineString'
  coordinates: [number, number][] // [lng, lat]
}

export interface RouteData {
  geometry: RouteGeometry
  legs: RouteLeg[]
  distance: number // total distance in meters
  duration: number // total duration in seconds
  weight: number
  weight_name: string
}

export interface DirectionsResponse {
  routes: RouteData[]
  waypoints: Array<{
    name: string
    location: [number, number]
  }>
  code: string
  uuid?: string
}

export interface DirectionsOptions {
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling'
  geometries?: 'geojson' | 'polyline' | 'polyline6'
  steps?: boolean
  bannerInstructions?: boolean
  voiceInstructions?: boolean
  alternatives?: boolean
  overview?: 'full' | 'simplified' | 'false'
}

export interface RouteSegment {
  coordinates: [number, number][]
  color: string
  type: 'to-pickup' | 'pickup-to-dropoff'
}

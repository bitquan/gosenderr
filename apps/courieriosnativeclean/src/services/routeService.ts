import {runtimeConfig} from '../config/runtime';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RoadRoute = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
};

const toLngLatPath = (points: RouteCoordinate[]): string =>
  points.map(point => `${point.longitude},${point.latitude}`).join(';');

const decodeGeoJsonCoordinates = (coordinates: unknown): RouteCoordinate[] => {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  const decoded: RouteCoordinate[] = [];
  for (const entry of coordinates) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }
    const longitude = Number(entry[0]);
    const latitude = Number(entry[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    decoded.push({latitude, longitude});
  }
  return decoded;
};

type DirectionsPayload = {
  routes?: Array<{
    geometry?: {coordinates?: unknown};
    distance?: number;
    duration?: number;
  }>;
};

const parseRoadRoute = (payload: DirectionsPayload): RoadRoute | null => {
  const firstRoute = payload.routes?.[0];
  if (!firstRoute) {
    return null;
  }

  const coordinates = decodeGeoJsonCoordinates(firstRoute.geometry?.coordinates);
  if (coordinates.length < 2) {
    return null;
  }

  const distanceMeters = Number(firstRoute.distance);
  const durationSeconds = Number(firstRoute.duration);
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    return null;
  }

  return {
    coordinates,
    distanceMeters,
    durationSeconds,
  };
};

const fetchMapboxRoute = async (points: RouteCoordinate[]): Promise<RoadRoute | null> => {
  const token = runtimeConfig.maps.mapboxAccessToken;
  if (!token) {
    return null;
  }

  const path = toLngLatPath(points);
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${path}` +
    `?alternatives=false&geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DirectionsPayload;
  return parseRoadRoute(payload);
};

const fetchOsrmRoute = async (points: RouteCoordinate[]): Promise<RoadRoute | null> => {
  const path = toLngLatPath(points);
  const url =
    `https://router.project-osrm.org/route/v1/driving/${path}` +
    `?alternatives=false&geometries=geojson&overview=full`;

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DirectionsPayload;
  return parseRoadRoute(payload);
};

export const fetchRoadRoute = async (points: RouteCoordinate[]): Promise<RoadRoute | null> => {
  if (points.length < 2) {
    return null;
  }

  if (runtimeConfig.maps.provider === 'mapbox') {
    const mapboxRoute = await fetchMapboxRoute(points);
    if (mapboxRoute) {
      return mapboxRoute;
    }
  }

  // Keep prod fully token-backed; OSRM fallback is for local/dev testing only.
  if (runtimeConfig.envName !== 'prod') {
    return fetchOsrmRoute(points);
  }

  return null;
};

// Exported for testing only
export const testExports = {
  decodeGeoJsonCoordinates,
  parseRoadRoute,
};

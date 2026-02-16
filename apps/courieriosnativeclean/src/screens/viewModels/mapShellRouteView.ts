import type {LocationSnapshot} from '../../services/ports/locationPort';
import type {Job} from '../../types/jobs';

export type MapShellCameraMode = 'follow_courier' | 'fit_route' | 'manual';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapShellRouteSummary = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  etaMinutes: number | null;
  legLabel: string;
};

export type MapShellRoutePlan = {
  points: RouteCoordinate[];
  legLabel: string;
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

export const distanceMeters = (
  from: RouteCoordinate,
  to: RouteCoordinate,
): number => {
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const toCoordinate = (
  value: LocationSnapshot | Job['pickupLocation'] | undefined | null,
): RouteCoordinate | null => {
  if (!value) {
    return null;
  }
  if (
    typeof value.latitude !== 'number' ||
    typeof value.longitude !== 'number' ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude)
  ) {
    return null;
  }
  return {
    latitude: value.latitude,
    longitude: value.longitude,
  };
};

const uniqueCoordinates = (points: RouteCoordinate[]): RouteCoordinate[] => {
  const next: RouteCoordinate[] = [];
  let previous: RouteCoordinate | null = null;

  for (const point of points) {
    if (
      !previous ||
      previous.latitude !== point.latitude ||
      previous.longitude !== point.longitude
    ) {
      next.push(point);
      previous = point;
    }
  }

  return next;
};

export const calculateRouteDistance = (coordinates: RouteCoordinate[]): number => {
  if (coordinates.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += distanceMeters(coordinates[index - 1], coordinates[index]);
  }
  return total;
};

export const estimateEtaMinutes = (distance: number): number | null => {
  if (distance <= 0) {
    return null;
  }
  const assumedMetersPerSecond = 8.33;
  const minutes = Math.round(distance / assumedMetersPerSecond / 60);
  return Math.max(1, minutes);
};

export const buildMapShellRoutePlan = (
  activeJob: Job | null,
  courierLocation: LocationSnapshot | null,
): MapShellRoutePlan => {
  const courier = toCoordinate(courierLocation);
  const pickup = toCoordinate(activeJob?.pickupLocation ?? null);
  const dropoff = toCoordinate(activeJob?.dropoffLocation ?? null);

  if (!activeJob || activeJob.status === 'cancelled' || activeJob.status === 'delivered') {
    return {points: courier ? [courier] : [], legLabel: 'Waiting for active job'};
  }

  const points: RouteCoordinate[] = [];
  let legLabel = 'Active route';

  if (activeJob.status === 'pending' || activeJob.status === 'accepted') {
    if (courier) {
      points.push(courier);
    }
    if (pickup) {
      points.push(pickup);
    }
    if (dropoff) {
      points.push(dropoff);
    }
    legLabel = 'To pickup';
  } else if (activeJob.status === 'picked_up') {
    if (courier) {
      points.push(courier);
    }
    if (dropoff) {
      points.push(dropoff);
    }
    legLabel = 'To dropoff';
  } else {
    if (courier) {
      points.push(courier);
    }
    if (pickup) {
      points.push(pickup);
    }
    if (dropoff) {
      points.push(dropoff);
    }
  }

  return {
    points: uniqueCoordinates(points),
    legLabel,
  };
};

export const buildMapShellRouteSummary = (
  activeJob: Job | null,
  courierLocation: LocationSnapshot | null,
): MapShellRouteSummary => {
  const plan = buildMapShellRoutePlan(activeJob, courierLocation);
  const totalDistance = calculateRouteDistance(plan.points);
  return {
    coordinates: plan.points,
    distanceMeters: totalDistance,
    etaMinutes: estimateEtaMinutes(totalDistance),
    legLabel: plan.legLabel,
  };
};

export const formatRouteDistance = (distanceMeters: number): string => {
  if (distanceMeters <= 0) {
    return '--';
  }
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
};

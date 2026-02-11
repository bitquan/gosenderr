import {
  buildMapShellRouteSummary,
  formatRouteDistance,
} from '../viewModels/mapShellRouteView';
import type {LocationSnapshot} from '../../services/ports/locationPort';
import type {Job} from '../../types/jobs';

const baseJob: Job = {
  id: 'job_route_1',
  customerName: 'Courier Customer',
  pickupAddress: 'Pickup',
  dropoffAddress: 'Dropoff',
  pickupLocation: {latitude: 37.7901, longitude: -122.4002},
  dropoffLocation: {latitude: 37.7911, longitude: -122.4012},
  etaMinutes: 18,
  status: 'accepted',
  updatedAt: new Date().toISOString(),
};

const courierLocation: LocationSnapshot = {
  latitude: 37.7896,
  longitude: -122.3996,
  accuracy: 10,
  timestamp: Date.now(),
};

describe('mapShellRouteView', () => {
  it('returns waiting summary with no active job', () => {
    const summary = buildMapShellRouteSummary(null, null);

    expect(summary.coordinates).toEqual([]);
    expect(summary.distanceMeters).toBe(0);
    expect(summary.etaMinutes).toBeNull();
    expect(summary.legLabel).toBe('Waiting for active job');
  });

  it('builds pickup leg route for accepted jobs', () => {
    const summary = buildMapShellRouteSummary(
      {...baseJob, status: 'accepted'},
      courierLocation,
    );

    expect(summary.legLabel).toBe('To pickup');
    expect(summary.coordinates).toHaveLength(3);
    expect(summary.distanceMeters).toBeGreaterThan(0);
    expect(summary.etaMinutes).toBeGreaterThan(0);
  });

  it('builds dropoff leg route for picked-up jobs', () => {
    const summary = buildMapShellRouteSummary(
      {...baseJob, status: 'picked_up'},
      courierLocation,
    );

    expect(summary.legLabel).toBe('To dropoff');
    expect(summary.coordinates).toHaveLength(2);
    expect(summary.distanceMeters).toBeGreaterThan(0);
  });

  it('deduplicates consecutive points when courier equals pickup', () => {
    const summary = buildMapShellRouteSummary(
      {...baseJob, status: 'accepted'},
      {
        ...courierLocation,
        latitude: baseJob.pickupLocation!.latitude,
        longitude: baseJob.pickupLocation!.longitude,
      },
    );

    expect(summary.coordinates).toHaveLength(2);
  });

  it('formats route distances for meter and kilometer ranges', () => {
    expect(formatRouteDistance(0)).toBe('--');
    expect(formatRouteDistance(145)).toBe('145 m');
    expect(formatRouteDistance(1530)).toBe('1.5 km');
  });
});

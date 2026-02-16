import {
  buildMapShellOverlayModel,
  deriveMapShellState,
} from '../mapShellOverlayController';
import type {JobsSyncState} from '../../services/ports/jobsPort';
import type {Job} from '../../types/jobs';

const baseSyncState: JobsSyncState = {
  status: 'live',
  stale: false,
  reconnectAttempt: 0,
  lastSyncedAt: null,
  message: null,
  source: 'firebase',
};

const pendingJob: Job = {
  id: 'job_1',
  customerName: 'Customer',
  pickupAddress: 'Pickup',
  dropoffAddress: 'Dropoff',
  pickupLocation: {latitude: 37.7901, longitude: -122.4002},
  dropoffLocation: {latitude: 37.7911, longitude: -122.4012},
  etaMinutes: 20,
  status: 'open',
  updatedAt: new Date().toISOString(),
};

describe('mapShellOverlayController', () => {
  it('returns offline_reconnect when sync is degraded', () => {
    const state = deriveMapShellState({
      activeJob: pendingJob,
      latestJob: pendingJob,
      jobsSyncState: {...baseSyncState, status: 'reconnecting'},
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe('offline_reconnect');
  });

  it('returns offer state for open jobs', () => {
    const state = deriveMapShellState({
      activeJob: pendingJob,
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe('offer');
  });

  it('returns arrived_pickup when courier is close to pickup', () => {
    const state = deriveMapShellState({
      activeJob: {...pendingJob, status: 'assigned'},
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: {
        latitude: 37.79011,
        longitude: -122.40021,
        accuracy: 10,
        timestamp: Date.now(),
      },
      tracking: true,
    });

    expect(state).toBe('arrived_pickup');
  });

  it('returns proof_required when notes indicate proof near dropoff', () => {
    const state = deriveMapShellState({
      activeJob: {
        ...pendingJob,
        status: 'picked_up',
        notes: 'Photo proof required at dropoff',
      },
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
        accuracy: 10,
        timestamp: Date.now(),
      },
      tracking: true,
    });

    expect(state).toBe('proof_required');
  });

  it('maps arrived_dropoff to completed transition action', () => {
    const overlay = buildMapShellOverlayModel({
      activeJob: {
        ...pendingJob,
        status: 'picked_up',
      },
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
        accuracy: 10,
        timestamp: Date.now(),
      },
      tracking: true,
      hasPermission: true,
    });

    expect(overlay.state).toBe('arrived_dropoff');
    expect(overlay.primaryAction).toBe('update_status');
    expect(overlay.nextStatus).toBe('completed');
  });

  it('maps enroute states to direct status actions so flow is not blocked by location tracking', () => {
    const enroutePickup = buildMapShellOverlayModel({
      activeJob: {
        ...pendingJob,
        status: 'enroute_pickup',
      },
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: null,
      tracking: false,
      hasPermission: false,
    });

    expect(enroutePickup.state).toBe('enroute_pickup');
    expect(enroutePickup.primaryAction).toBe('update_status');
    expect(enroutePickup.nextStatus).toBe('arrived_pickup');

    const enrouteDropoff = buildMapShellOverlayModel({
      activeJob: {
        ...pendingJob,
        status: 'enroute_dropoff',
      },
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: null,
      tracking: false,
      hasPermission: false,
    });

    expect(enrouteDropoff.state).toBe('enroute_dropoff');
    expect(enrouteDropoff.primaryAction).toBe('update_status');
    expect(enrouteDropoff.nextStatus).toBe('arrived_dropoff');
  });

  it('keeps picked_up state until explicit start dropoff transition', () => {
    const overlay = buildMapShellOverlayModel({
      activeJob: {
        ...pendingJob,
        status: 'picked_up',
      },
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: {
        latitude: 37.0,
        longitude: -122.0,
        accuracy: 12,
        timestamp: Date.now(),
      },
      tracking: true,
      hasPermission: true,
    });

    expect(overlay.state).toBe('picked_up');
    expect(overlay.primaryAction).toBe('update_status');
    expect(overlay.nextStatus).toBe('enroute_dropoff');
  });
});

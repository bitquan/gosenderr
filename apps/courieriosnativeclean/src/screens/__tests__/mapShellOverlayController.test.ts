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
  status: 'pending',
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

  it('returns offer state for pending jobs', () => {
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
      activeJob: {...pendingJob, status: 'accepted'},
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

  it('maps arrived_dropoff to delivered transition action', () => {
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
    expect(overlay.nextStatus).toBe('delivered');
  });

  it('returns completed when active job is delivered', () => {
    const state = deriveMapShellState({
      activeJob: {...pendingJob, status: 'delivered'},
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe('completed');
  });

  it('returns enroute_pickup when accepted and tracking far from pickup', () => {
    const state = deriveMapShellState({
      activeJob: {...pendingJob, status: 'accepted'},
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: {
        latitude: 37.7801,
        longitude: -122.3902,
        accuracy: 12,
        timestamp: Date.now(),
      },
      tracking: true,
    });

    expect(state).toBe('enroute_pickup');
  });

  it('returns enroute_dropoff when picked up and tracking far from dropoff', () => {
    const state = deriveMapShellState({
      activeJob: {...pendingJob, status: 'picked_up'},
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: {
        latitude: 37.7801,
        longitude: -122.3902,
        accuracy: 12,
        timestamp: Date.now(),
      },
      tracking: true,
    });

    expect(state).toBe('enroute_dropoff');
  });

  it('returns picked_up when courier has not started tracking after pickup', () => {
    const state = deriveMapShellState({
      activeJob: {...pendingJob, status: 'picked_up'},
      latestJob: pendingJob,
      jobsSyncState: baseSyncState,
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe('picked_up');
  });

  it('treats stale and error sync states as offline_reconnect', () => {
    const staleState = deriveMapShellState({
      activeJob: pendingJob,
      latestJob: pendingJob,
      jobsSyncState: {...baseSyncState, status: 'stale'},
      courierLocation: null,
      tracking: false,
    });
    const errorState = deriveMapShellState({
      activeJob: pendingJob,
      latestJob: pendingJob,
      jobsSyncState: {...baseSyncState, status: 'error'},
      courierLocation: null,
      tracking: false,
    });

    expect(staleState).toBe('offline_reconnect');
    expect(errorState).toBe('offline_reconnect');
  });
});

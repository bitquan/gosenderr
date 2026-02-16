import React from 'react';
import renderer, {act} from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// avoid loading real MapView / Firebase modules in this unit test
jest.mock('../../components/MapShellSurface', () => ({
  MapShellSurface: () => null,
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    session: {uid: 'courier-1', email: 'courier@example.com', displayName: 'Courier', token: 'token', provider: 'firebase'},
  })),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(() => ({
    analytics: {track: jest.fn(), recordError: jest.fn()},
    jobs: {updateJobStatus: jest.fn(), attachProof: jest.fn()},
    location: {useLocationTracking: () => ({state: {hasPermission: true, tracking: true, lastLocation: null, error: null}, requestPermission: jest.fn(), startTracking: jest.fn(), stopTracking: jest.fn()})},
    featureFlags: {useFeatureFlags: () => ({state: {flags: {jobStatusActions: true, mapRouting: true}}})},
  })),
}));

import {MapShellScreen} from '../MapShellScreen';
import type {Job} from '../../types/jobs';

const pendingJob: Job = {
  id: 'job-1',
  customerName: 'Alice',
  pickupAddress: '1 Main St',
  dropoffAddress: '2 Main St',
  etaMinutes: 10,
  status: 'enroute_pickup',
  updatedAt: new Date().toISOString(),
};

const liveSyncState = {status: 'live', stale: false, reconnectAttempt: 0, lastSyncedAt: Date.now(), message: null, source: 'firebase'} as any;

describe('MapShellScreen unlock behavior', () => {
  it('starts unlocked (not focused) and Back to Jobs unlocks cycling', () => {
    const active: Job = {...pendingJob, id: 'job-active', status: 'enroute_pickup'};
    const other: Job = {...pendingJob, id: 'job-2', status: 'enroute_pickup'};

    const screen = renderer.create(
      <MapShellScreen
        jobs={[active, other]}
        loadingJobs={false}
        jobsError={null}
        jobsSyncState={liveSyncState}
        activeJob={active}
        onRefreshJobs={jest.fn().mockResolvedValue([active, other])}
        onOpenJobDetail={jest.fn()}
        onJobUpdated={jest.fn()}
        onOpenSettings={jest.fn()}
      />,
    );

    // flush effects
    act(() => {});

    // initially should NOT be locked to the active job
    expect(() => screen.root.findByProps({testID: 'map-shell-back-to-jobs'})).toThrow();

    // simulate the user selecting the active job by re-rendering with autoFocusActiveJob
    act(() => {
      screen.update(
        <MapShellScreen
          jobs={[active, other]}
          loadingJobs={false}
          jobsError={null}
          jobsSyncState={liveSyncState}
          activeJob={active}
          autoFocusActiveJob={true}
          onRefreshJobs={jest.fn().mockResolvedValue([active, other])}
          onOpenJobDetail={jest.fn()}
          onJobUpdated={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );
    });

    // now Back to Jobs should appear
    expect(screen.root.findByProps({testID: 'map-shell-back-to-jobs'})).toBeTruthy();

    // press Back to Jobs to unlock focus (browsing mode)
    const back = screen.root.findByProps({testID: 'map-shell-back-to-jobs'});
    act(() => back.props.onPress());

    // after clearing focus, jobPositionLabel should appear (swipe unlocked)
    const label = screen.root.findByProps({testID: 'map-shell-panel-hint'});
    expect(label).toBeTruthy();
    // focused job becomes the first non-active job (browsing mode)
    expect(label.props.children.join('')).toMatch(/2\/2/);
  });
});
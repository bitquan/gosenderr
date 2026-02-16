import React from 'react';
import renderer from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

jest.mock('../../components/MapShellSurface', () => ({
  MapShellSurface: () => null,
}));

// This test ensures MapShellScreen is resilient when `formatSyncTime` is undefined
// (defensive wrapper `safeFormatSyncTime` should render 'Never').
import {MapShellScreen} from '../MapShellScreen';
import type {Job} from '../../types/jobs';

const pendingJob: Job = {
  id: 'job-map-shell',
  customerName: 'Courier Customer',
  pickupAddress: 'Pickup',
  dropoffAddress: 'Dropoff',
  etaMinutes: 18,
  status: 'open',
  updatedAt: new Date().toISOString(),
};

test('renders Last sync fallback when formatSyncTime is missing', () => {
  // patch the viewModel export to simulate a broken bundle
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vm = require('../viewModels/jobsViewState');
  const orig = vm.formatSyncTime;
  vm.formatSyncTime = undefined;

  (useAuth as jest.Mock).mockReturnValue({
    session: {uid: 'courier-1'} as any,
    initializing: false,
  });

  (useServiceRegistry as jest.Mock).mockReturnValue({
    analytics: {track: jest.fn()},
    jobs: {updateJobStatus: jest.fn()},
    location: {useLocationTracking: () => ({state: {hasPermission: true, tracking: false, lastLocation: null, error: null}, requestPermission: jest.fn(), startTracking: jest.fn(), stopTracking: jest.fn()})},
  });

  const screen = renderer.create(
    <MapShellScreen
      jobs={[pendingJob]}
      loadingJobs={false}
      jobsError={null}
      jobsSyncState={{status: 'live', stale: false, reconnectAttempt: 0, lastSyncedAt: null, message: null, source: 'firebase'}}
      activeJob={pendingJob}
      onRefreshJobs={jest.fn().mockResolvedValue([pendingJob])}
      onOpenJobDetail={jest.fn()}
      onJobUpdated={jest.fn()}
      onOpenSettings={jest.fn()}
    />,
  );

  const tree = screen.toJSON() as any;
  const contains = JSON.stringify(tree);
  // Text children are rendered separately in the JSON tree, assert both parts exist
  expect(contains).toContain('"Last sync: "');
  expect(contains).toContain('"Never"');

  // restore
  vm.formatSyncTime = orig;
});
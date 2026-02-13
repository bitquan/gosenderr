import React from 'react';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';
import {MapShellScreen} from '../MapShellScreen';
import type {Job} from '../../types/jobs';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

const jobA: Job = {
  id: 'job-a',
  customerName: 'Alice',
  pickupAddress: '1 A St',
  dropoffAddress: '2 B Ave',
  etaMinutes: 10,
  status: 'accepted',
  updatedAt: '2026-02-08T08:00:00.000Z',
};

const jobB: Job = {
  id: 'job-b',
  customerName: 'Bob',
  pickupAddress: '3 C Rd',
  dropoffAddress: '4 D Ln',
  etaMinutes: 5,
  status: 'accepted',
  updatedAt: '2026-02-08T08:00:00.000Z',
};

describe('MapShellScreen', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      session: {uid: 'courier-1', email: 'c@example.com'},
    });

    (useServiceRegistry as jest.Mock).mockReturnValue({
      analytics: {track: jest.fn(), recordError: jest.fn()},
      jobs: {updateJobStatus: jest.fn()},
      location: {
        useLocationTracking: () => ({
          state: {lastLocation: null, tracking: false, hasPermission: false},
          requestPermission: jest.fn(),
          startTracking: jest.fn(),
        }),
      },
      featureFlags: {useFeatureFlags: () => ({state: {flags: {}}})},
    });
  });

  it('renders job-cycle buttons and calls handlers when multiple jobs exist', () => {
    const onNext = jest.fn();
    const onPrev = jest.fn();

    const screen = renderer.create(
      <MapShellScreen
        jobs={[jobA, jobB]}
        loadingJobs={false}
        jobsError={null}
        jobsSyncState={{status: 'live', stale: false, reconnectAttempt: 0, lastSyncedAt: '2026-02-08T08:00:00.000Z', message: null, source: 'firebase'}}
        activeJob={jobA}
        onRefreshJobs={jest.fn().mockResolvedValue([jobA, jobB])}
        onOpenJobDetail={jest.fn()}
        onJobUpdated={jest.fn()}
        onOpenSettings={jest.fn()}
        onNextActiveJob={onNext}
        onPrevActiveJob={onPrev}
      />,
    );

    const prev = screen.root.findByProps({accessibilityLabel: 'prev-active-job'});
    const next = screen.root.findByProps({accessibilityLabel: 'next-active-job'});

    act(() => {
      prev.props.onPress();
    });
    act(() => {
      next.props.onPress();
    });

    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();

    // Close/Skip action should render for pending/accepted active job
    const close = screen.root.findByProps({accessibilityLabel: 'close-active-job'});
    act(() => {
      close.props.onPress();
    });
    // jobs.updateJobStatus is mocked in the serviceRegistry stub — assert it was callable
    const {jobs} = (require('../../services/serviceRegistry').useServiceRegistry as jest.Mock)();
    expect(jobs.updateJobStatus).toHaveBeenCalled();
  });
});

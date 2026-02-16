import React from 'react';
import {Pressable} from 'react-native';
import renderer, {act} from 'react-test-renderer';

import {JobsScreen} from '../JobsScreen';
import type {JobsSyncState} from '../../services/ports/jobsPort';
import type {Job} from '../../types/jobs';

const sampleJob: Job = {
  id: 'job-1',
  customerName: 'Demo Customer',
  pickupAddress: '123 Pickup Ave',
  dropoffAddress: '456 Dropoff Blvd',
  etaMinutes: 18,
  status: 'pending',
  updatedAt: '2026-02-08T08:00:00.000Z',
};

const liveSyncState: JobsSyncState = {
  status: 'live',
  stale: false,
  reconnectAttempt: 0,
  lastSyncedAt: '2026-02-08T08:00:00.000Z',
  message: null,
  source: 'firebase',
};

describe('JobsScreen', () => {
  it('renders loading state when no jobs are loaded yet', () => {
    const screen = renderer.create(
      <JobsScreen
        jobs={[]}
        setJobs={jest.fn()}
        loadingJobs
        jobsError={null}
        syncState={liveSyncState}
        onRefresh={jest.fn().mockResolvedValue([])}
        onOpenDetail={jest.fn()}
      />,
    );

    expect(screen.root.findByProps({children: 'Loading jobs'})).toBeTruthy();
  });

  it('opens job detail when tapping a job card', () => {
    const onOpenDetail = jest.fn();
    const screen = renderer.create(
      <JobsScreen
        jobs={[sampleJob]}
        setJobs={jest.fn()}
        loadingJobs={false}
        jobsError={null}
        syncState={liveSyncState}
        onRefresh={jest.fn().mockResolvedValue([sampleJob])}
        onOpenDetail={onOpenDetail}
      />,
    );

    const jobPressables = screen.root.findAllByType(Pressable).filter(node => node.props.onPress);
    act(() => {
      jobPressables[0].props.onPress();
    });

    expect(onOpenDetail).toHaveBeenCalledWith('job-1');
  });
});

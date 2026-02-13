import React from 'react';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';
import {JobDetailScreen} from '../JobDetailScreen';
import type {Job} from '../../types/jobs';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

const sampleJob: Job = {
  id: 'job-1',
  customerName: 'Demo Customer',
  pickupAddress: '123 Pickup Ave',
  dropoffAddress: '456 Dropoff Blvd',
  etaMinutes: 18,
  status: 'pending',
  updatedAt: '2026-02-08T08:00:00.000Z',
};

describe('JobDetailScreen - close action', () => {
  it('shows Close Job and calls updateJobStatus when pressed', async () => {
    const onJobUpdated = jest.fn();
    const updateJobStatus = jest.fn();
    const analytics = {track: jest.fn(), recordError: jest.fn()};

    (useAuth as jest.Mock).mockReturnValue({session: {uid: 'courier-1'}});
    (useServiceRegistry as jest.Mock).mockReturnValue({
      jobs: {updateJobStatus},
      featureFlags: {useFeatureFlags: () => ({state: {flags: {jobStatusActions: true}}})},
      analytics,
    });

    updateJobStatus.mockResolvedValueOnce({kind: 'success', job: {...sampleJob, status: 'cancelled'}, requestedStatus: 'cancelled', idempotent: false, message: null});

    const screen = renderer.create(
      <JobDetailScreen job={sampleJob} onBack={jest.fn()} onJobUpdated={onJobUpdated} />,
    );

    const closeButton = screen.root.findByProps({label: 'Close Job'});

    await act(async () => {
      closeButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateJobStatus).toHaveBeenCalledWith(expect.any(Object), 'job-1', 'cancelled');
    expect(onJobUpdated).toHaveBeenCalledWith(expect.objectContaining({status: 'cancelled'}));
    expect(analytics.track).toHaveBeenCalledWith('job_status_updated', expect.objectContaining({from_status: 'pending', to_status: 'cancelled'}));
  });
});

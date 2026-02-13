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

describe('JobDetailScreen', () => {
  const onJobUpdated = jest.fn();
  const updateJobStatus = jest.fn();
  const analytics = {
    track: jest.fn(),
    recordError: jest.fn(),
  };

  beforeEach(() => {
    onJobUpdated.mockReset();
    updateJobStatus.mockReset();
    analytics.track.mockReset();
    analytics.recordError.mockReset();

    (useAuth as jest.Mock).mockReturnValue({
      session: {
        uid: 'courier-1',
        email: 'courier@example.com',
        displayName: 'Courier',
        token: 'token',
        provider: 'firebase',
      },
    });

    (useServiceRegistry as jest.Mock).mockReturnValue({
      jobs: {
        updateJobStatus,
      },
      featureFlags: {
        useFeatureFlags: () => ({
          state: {
            flags: {
              jobStatusActions: true,
            },
          },
        }),
      },
      analytics,
    });
  });

  it('updates status and publishes analytics on success and closes detail when accepted', async () => {
    updateJobStatus.mockResolvedValueOnce({
      kind: 'success',
      requestedStatus: 'accepted',
      idempotent: false,
      message: null,
      job: {
        ...sampleJob,
        status: 'accepted',
      },
    });

    const onBack = jest.fn();
    const screen = renderer.create(
      <JobDetailScreen
        job={sampleJob}
        onBack={onBack}
        onJobUpdated={onJobUpdated}
      />,
    );
    const actionButton = screen.root.findByProps({label: 'Mark as accepted'});

    await act(async () => {
      actionButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateJobStatus).toHaveBeenCalledWith(expect.any(Object), 'job-1', 'accepted');
    expect(onJobUpdated).toHaveBeenCalledWith(expect.objectContaining({status: 'accepted'}));
    expect(analytics.track).toHaveBeenCalledWith(
      'job_status_updated',
      expect.objectContaining({
        from_status: 'pending',
        to_status: 'accepted',
      }),
    );
    expect(onBack).toHaveBeenCalled();
  });

  it('ignores duplicate update requests while updating is in-flight', async () => {
    // Make updateJobStatus return a promise that resolves later so we can tap twice
    let resolveUpdate: (val?: unknown) => void;
    updateJobStatus.mockImplementation(() => new Promise(resolve => { resolveUpdate = resolve; }));

    const screen = renderer.create(
      <JobDetailScreen
        job={sampleJob}
        onBack={jest.fn()}
        onJobUpdated={onJobUpdated}
      />,
    );
    const actionButton = screen.root.findByProps({label: 'Mark as accepted'});

    act(() => {
      actionButton.props.onPress();
      actionButton.props.onPress();
    });

    expect(updateJobStatus).toHaveBeenCalledTimes(1);

    act(() => {
      resolveUpdate({kind: 'success', requestedStatus: 'accepted', idempotent: false, message: null, job: {...sampleJob, status: 'accepted'}});
    });
  });

  it('disables status action when rollout flag is off', () => {
    (useServiceRegistry as jest.Mock).mockReturnValue({
      jobs: {
        updateJobStatus,
      },
      featureFlags: {
        useFeatureFlags: () => ({
          state: {
            flags: {
              jobStatusActions: false,
            },
          },
        }),
      },
      analytics,
    });

    const screen = renderer.create(
      <JobDetailScreen
        job={sampleJob}
        onBack={jest.fn()}
        onJobUpdated={onJobUpdated}
      />,
    );

    expect(
      screen.root.findByProps({children: 'Status updates are currently disabled by rollout controls.'}),
    ).toBeTruthy();
    expect(screen.root.findByProps({label: 'Mark as accepted'}).props.disabled).toBe(true);
  });
});

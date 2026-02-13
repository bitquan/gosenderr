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

describe('JobDetailScreen — retryable feedback', () => {
  const onJobUpdated = jest.fn();
  const updateJobStatus = jest.fn();
  const analytics = {track: jest.fn(), recordError: jest.fn()};

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
      jobs: {updateJobStatus},
      featureFlags: {useFeatureFlags: () => ({state: {flags: {jobStatusActions: true}}})},
      analytics,
    });
  });

  it('shows informational feedback when update is queued (retryable)', async () => {
    updateJobStatus.mockResolvedValueOnce({
      kind: 'retryable_error',
      requestedStatus: 'accepted',
      idempotent: false,
      message: 'Status update queued while connection recovers. Pending updates: 1.',
      job: {...sampleJob, status: 'accepted'},
    });

    const screen = renderer.create(
      <JobDetailScreen job={sampleJob} onBack={jest.fn()} onJobUpdated={onJobUpdated} />,
    );

    const actionButton = screen.root.findByProps({label: 'Mark as accepted'});

    await act(async () => {
      actionButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    // feedback should render as informational (not error)
    const feedbackText = screen.root.findAllByProps({children: 'Status update queued while connection recovers. Pending updates: 1.'});
    expect(feedbackText.length).toBeGreaterThan(0);
  });
});
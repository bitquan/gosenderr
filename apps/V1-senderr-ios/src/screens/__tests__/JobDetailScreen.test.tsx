import React from 'react';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));
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
  status: 'open',
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
      location: {
        useLocationTracking: () => ({
          state: {hasPermission: true, tracking: false, lastLocation: null, error: null},
          requestPermission: jest.fn(),
          startTracking: jest.fn(),
          stopTracking: jest.fn(),
        }),
      },
    });
  });

  it('updates status and publishes analytics on success', async () => {
    updateJobStatus.mockResolvedValueOnce({
      kind: 'success',
      requestedStatus: 'assigned',
      idempotent: false,
      message: null,
      job: {
        ...sampleJob,
        status: 'assigned',
      },
    });

    const screen = renderer.create(
      <JobDetailScreen
        job={sampleJob}
        onBack={jest.fn()}
        onJobUpdated={onJobUpdated}
      />,
    );
    const actionButton = screen.root.findByProps({label: 'Mark as assigned'});

    await act(async () => {
      actionButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateJobStatus).toHaveBeenCalledWith(expect.any(Object), 'job-1', 'assigned');
    expect(onJobUpdated).toHaveBeenCalledWith(expect.objectContaining({status: 'assigned'}));
    expect(analytics.track).toHaveBeenCalledWith(
      'job_status_updated',
      expect.objectContaining({
        from_status: 'open',
        to_status: 'assigned',
      }),
    );
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
      location: {
        useLocationTracking: () => ({
          state: {hasPermission: true, tracking: false, lastLocation: null, error: null},
          requestPermission: jest.fn(),
          startTracking: jest.fn(),
          stopTracking: jest.fn(),
        }),
      },
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
    expect(screen.root.findByProps({label: 'Mark as assigned'}).props.disabled).toBe(true);
  });

  it('shows Attach proof CTA and uploads proof before status change', async () => {
    const attachProof = jest.fn().mockResolvedValue({
      ...sampleJob,
      pickupProof: {url: 'data:image/jpeg;base64,AAA', location: {latitude: 1, longitude: 2}, accuracy: 4, timestamp: new Date().toISOString()},
    });

    (useServiceRegistry as jest.Mock).mockReturnValue({
      jobs: {attachProof: attachProof, updateJobStatus: jest.fn().mockResolvedValue({kind: 'success', requestedStatus: 'picked_up', idempotent: false, message: null, job: {...sampleJob, status: 'picked_up'}})},
      featureFlags: {useFeatureFlags: () => ({state: {flags: {jobStatusActions: true}}})},
      analytics,
      location: {
        useLocationTracking: () => ({
          state: {hasPermission: true, tracking: false, lastLocation: {latitude: 1, longitude: 2, accuracy: 4, timestamp: Date.now()}, error: null},
          requestPermission: jest.fn(),
          startTracking: jest.fn(),
          stopTracking: jest.fn(),
        }),
      },
    });

    const {launchCamera} = require('react-native-image-picker');
    launchCamera.mockResolvedValue({assets: [{base64: 'AAA', type: 'image/jpeg'}]});

    const screen = renderer.create(
      <JobDetailScreen job={{...sampleJob, status: 'arrived_pickup'}} onBack={jest.fn()} onJobUpdated={onJobUpdated} />,
    );

    const attachButton = screen.root.findByProps({label: 'Attach pickup proof'});
    await act(async () => {
      attachButton.props.onPress();
      await Promise.resolve();
    });

    expect(launchCamera).toHaveBeenCalled();
    expect(attachProof).toHaveBeenCalledWith(expect.any(Object), 'job-1', 'pickup', expect.objectContaining({url: expect.stringContaining('data:image/jpeg;base64,')}));

    // now simulate a failure and retry flow
    const failingAttach = jest.fn().mockRejectedValueOnce(new Error('upload failed')).mockResolvedValueOnce({
      ...sampleJob,
      pickupProof: {url: 'https://storage.example.com/job-1/pickup-1.jpg', location: {latitude: 1, longitude: 2}, accuracy: 4, timestamp: new Date().toISOString()},
    });

    // make the service registry return the failing attachProof implementation for the second screen
    (useServiceRegistry as jest.Mock).mockReturnValue({
      jobs: {attachProof: failingAttach, updateJobStatus: jest.fn()},
      featureFlags: {useFeatureFlags: () => ({state: {flags: {jobStatusActions: true}}})},
      analytics,
      location: {
        useLocationTracking: () => ({
          state: {hasPermission: true, tracking: false, lastLocation: {latitude: 1, longitude: 2, accuracy: 4, timestamp: Date.now()}, error: null},
          requestPermission: jest.fn(),
          startTracking: jest.fn(),
          stopTracking: jest.fn(),
        }),
      },
    });

    const screen2 = renderer.create(
      <JobDetailScreen job={{...sampleJob, status: 'arrived_pickup'}} onBack={jest.fn()} onJobUpdated={onJobUpdated} />,
    );

    const attachButton2 = screen2.root.findByProps({label: 'Attach pickup proof'});
    await act(async () => {
      attachButton2.props.onPress();
      await Promise.resolve();
    });

    // after failing attach, retry button should be visible
    const retry = screen2.root.findByProps({label: 'Retry Upload'});
    expect(retry).toBeTruthy();

    await act(async () => {
      retry.props.onPress();
      // wait a couple microtasks to ensure promise chains resolve in the test renderer
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(failingAttach).toHaveBeenCalledTimes(2);
  });
});

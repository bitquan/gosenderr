import React from 'react';
import renderer, {act} from 'react-test-renderer';

import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';
import {DashboardScreen} from '../DashboardScreen';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

jest.mock('../../components/JobsMapCard', () => ({
  JobsMapCard: () => null,
}));

describe('DashboardScreen', () => {
  const requestPermission = jest.fn();
  const startTracking = jest.fn();
  const stopTracking = jest.fn();
  const analytics = {
    track: jest.fn(),
    recordError: jest.fn(),
  };

  beforeEach(() => {
    requestPermission.mockReset();
    startTracking.mockReset();
    stopTracking.mockReset();
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
      location: {
        useLocationTracking: () => ({
          state: {
            hasPermission: true,
            tracking: false,
            lastLocation: null,
            error: null,
          },
          requestPermission,
          startTracking,
          stopTracking,
        }),
      },
      analytics,
    });
  });

  it('classifies start tracking permission errors and offers settings recovery', async () => {
    startTracking.mockRejectedValueOnce(new Error('Permission denied while starting location tracking'));

    const screen = renderer.create(
      <DashboardScreen
        onOpenJobs={jest.fn()}
        onRetryJobs={jest.fn()}
        activeJobsCount={0}
        loadingJobs={false}
        jobsError={null}
        jobsSyncState={{
          status: 'live',
          stale: false,
          reconnectAttempt: 0,
          lastSyncedAt: null,
          message: null,
          source: 'firebase',
        }}
        activeJob={null}
      />,
    );

    const startButton = screen.root.findByProps({label: 'Start tracking'});

    await act(async () => {
      startButton.props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.root.findByProps({children: 'Permission denied. Open settings and try again.'}),
    ).toBeTruthy();
    expect(screen.root.findByProps({label: 'Open Settings'})).toBeTruthy();
    expect(analytics.recordError).toHaveBeenCalledWith(
      expect.any(Error),
      'dashboard_start_tracking:E_PERMISSION_DENIED:permission',
    );
  });
});

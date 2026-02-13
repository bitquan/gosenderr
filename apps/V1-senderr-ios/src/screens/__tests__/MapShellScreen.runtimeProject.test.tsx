import React from 'react';
import renderer from 'react-test-renderer';

import {runtimeConfig} from '../../config/runtime';
import {useAuth} from '../../context/AuthContext';
import {useServiceRegistry} from '../../services/serviceRegistry';
import {MapShellScreen} from '../MapShellScreen';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/serviceRegistry', () => ({
  useServiceRegistry: jest.fn(),
}));

jest.mock('../../services/firebase', () => ({
  getActiveFirebaseProjectId: jest.fn(() => 'demo-senderr'),
  isFirebaseEmulatorEnabled: jest.fn(() => true),
}));

describe('MapShellScreen — runtime project label', () => {
  beforeEach(() => {
    runtimeConfig.envName = 'dev';
    (useAuth as jest.Mock).mockReturnValue({session: {uid: 'courier-1', email: 'courier@example.com'}});
    (useServiceRegistry as jest.Mock).mockReturnValue({
      analytics: {track: jest.fn(), recordError: jest.fn()},
      jobs: { /* not used */ },
      location: {useLocationTracking: () => ({state: {lastLocation: null, tracking: false, hasPermission: false}})},
    });
  });

  it('renders runtime project chip when in dev/emulator mode', () => {
    const tree = renderer.create(
      <MapShellScreen
        jobs={[]}
        loadingJobs={false}
        jobsError={null}
        jobsSyncState={{status: 'ok'}}
        activeJob={null}
        onRefreshJobs={async () => []}
        onOpenJobDetail={() => {}}
        onJobUpdated={() => {}}
        onOpenSettings={() => {}}
      />,
    );

    const chip = tree.root.findByProps({testID: 'runtime-project-chip'});
    expect(chip).toBeTruthy();
    expect(chip.findByType('Text').props.children).toContain('Emulator: demo-senderr');
  });
});
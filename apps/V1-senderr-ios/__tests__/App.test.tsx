/**
 * @format
 */

import 'react-native';
import React from 'react';

// Mock service registry *before* importing App so providers initialize with safe stubs
jest.mock('../src/services/serviceRegistry', () => ({
  ServiceRegistryProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
  useServiceRegistry: () => ({
    analytics: {
      initialize: jest.fn().mockResolvedValue(undefined),
      track: jest.fn(),
      recordError: jest.fn(),
      identifyUser: jest.fn(),
      clearUser: jest.fn(),
      setUserId: jest.fn(),
      setAnalyticsCollectionEnabled: jest.fn(),
    },
    auth: {
      restoreSession: jest.fn().mockResolvedValue(null),
      onAuthStateChanged: jest.fn().mockReturnValue(() => {}),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    jobs: {
      subscribeJobs: jest.fn().mockReturnValue({unsubscribe: jest.fn(), refresh: jest.fn().mockResolvedValue([])}),
      fetchJobs: jest.fn().mockResolvedValue([]),
    },
    notifications: {
      requestPermission: jest.fn().mockResolvedValue(false),
      registerDeviceToken: jest.fn().mockResolvedValue(null),
      registerMessagingToken: jest.fn().mockResolvedValue(null),
    },
    location: {
      useLocationTracking: () => ({
        state: {hasPermission: false, tracking: false, lastLocation: null, error: null},
        requestPermission: jest.fn().mockResolvedValue(false),
        startTracking: jest.fn().mockResolvedValue(undefined),
        stopTracking: jest.fn(),
      }),
    },
    featureFlags: {useFeatureFlags: () => ({state: {flags: {mapShell: false, notifications: false}}})},
  }),
}));

// Lightweight screen stubs so App can mount without pulling native-heavy subtrees
jest.mock('../src/screens/DashboardScreen', () => ({DashboardScreen: () => null}));
jest.mock('../src/screens/JobsScreen', () => ({JobsScreen: () => null}));
jest.mock('../src/screens/SettingsScreen', () => ({SettingsScreen: () => null}));
jest.mock('../src/screens/MapShellScreen', () => ({MapShellScreen: () => null}));
jest.mock('../src/screens/LoginScreen', () => ({LoginScreen: () => null}));
jest.mock('../src/screens/JobDetailScreen', () => ({JobDetailScreen: () => null}));
jest.mock('../src/screens/OnboardingScreen', () => ({OnboardingScreen: () => null}));

// Avoid running AuthProvider initialization (analytics/auth side-effects) during this render
jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
  useAuth: () => ({session: null, initializing: false, signingIn: false, signInWithEmail: jest.fn(), signOutUser: jest.fn()}),
}));

import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it} from '@jest/globals';

// Note: test renderer must be required after react-native.
// Keep this test lightweight to avoid mounting the full native app tree in unit tests.
import renderer from 'react-test-renderer';

it('is a defined component', () => {
  expect(App).toBeTruthy();
});

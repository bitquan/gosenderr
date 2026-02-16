import {describe, expect, it, jest} from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@react-native-community/geolocation', () => ({
  requestAuthorization: jest.fn((success?: () => void) => success?.()),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
}));

import {authFirebaseAdapter} from '../adapters/authFirebaseAdapter';
import {jobsFirebaseAdapter} from '../adapters/jobsFirebaseAdapter';
import {locationNativeAdapter} from '../adapters/locationNativeAdapter';
import * as authService from '../authService';
import * as jobsService from '../jobsService';
import * as locationService from '../locationService';

describe('service adapters contract harness', () => {
  it('auth adapter exposes stable auth contract', () => {
    expect(authFirebaseAdapter.restoreSession).toBe(authService.restoreSession);
    expect(authFirebaseAdapter.signIn).toBe(authService.signIn);
    expect(authFirebaseAdapter.signOut).toBe(authService.signOut);
    expect(authFirebaseAdapter.onAuthStateChanged).toBe(authService.onFirebaseAuthChanged);
  });

  it('jobs adapter exposes stable jobs contract', () => {
    expect(jobsFirebaseAdapter.fetchJobs).toBe(jobsService.fetchJobs);
    expect(jobsFirebaseAdapter.getJobById).toBe(jobsService.getJobById);
    expect(jobsFirebaseAdapter.updateJobStatus).toBe(jobsService.updateJobStatus);
    expect(jobsFirebaseAdapter.subscribeJobs).toBe(jobsService.subscribeJobs);
  });

  it('location adapter exposes tracking controller hook', () => {
    expect(locationNativeAdapter.useLocationTracking).toBe(locationService.useLocationTracking);
    expect(typeof locationNativeAdapter.useLocationTracking).toBe('function');
  });
});

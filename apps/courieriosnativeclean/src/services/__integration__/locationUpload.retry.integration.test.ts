import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.useRealTimers();

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (store[k] ?? null)),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
    },
  };
});

// We'll mock firebase/firestore updateDoc to simulate transient failure followed by success
jest.mock('firebase/firestore', () => {
  let __calls = 0;
  return {
    doc: jest.fn(),
    updateDoc: jest.fn(() => {
      __calls += 1;
      if (__calls === 1) return Promise.reject(new Error('transient error'));
      return Promise.resolve(undefined);
    }),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  };
});

// Ensure the firebase wrapper reports readiness so performLocationUpload proceeds
jest.mock('../firebase', () => ({
  isFirebaseReady: () => true,
  getFirebaseServices: () => ({db: {}}),
}));

import * as sut from '../locationUploadService';

describe('locationUploadService retry scheduling (service-level)', () => {
  const uid = `retry-int-${Date.now()}`;

  beforeEach(() => {
    jest.clearAllMocks();
    callCount = 0;
  });

  afterEach(() => {
    // return timers to real mode in case a test switched them
    jest.useRealTimers();
  });

  it('schedules a retry on transient failure and succeeds on retry', async () => {
    // make backoff tiny so test runs fast
    sut.setLocationUploadBackoffBase(10);

    const mockTelemetry = {track: jest.fn()};
    const mockAnalytics = {track: jest.fn()};
    sut.setLocationUploadTelemetry(mockTelemetry as any);
    sut.setLocationUploadAnalytics(mockAnalytics as any);

    // enqueue a location
    await sut.enqueueLocation(uid, {
      latitude: 10,
      longitude: 20,
      timestamp: Date.now(),
    } as any);

    // The first flush should fail (simulated by our mock) and schedule a retry
    await expect(sut.flushQueuedLocationsForSession(uid)).rejects.toThrow('transient');

    expect(mockTelemetry.track).toHaveBeenCalledWith(
      'location_upload_retry_scheduled',
      expect.objectContaining({uid}),
    );
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'location_upload_retry_scheduled',
      expect.objectContaining({uid}),
    );

    // Simulate the scheduled retry by invoking flush again (service-level retry test)
    await expect(sut.flushQueuedLocationsForSession(uid)).resolves.toEqual(
      expect.objectContaining({flushed: 1}),
    );

    // Check that the queue is cleared
    const remaining = await sut.readQueuedLocations();
    expect(remaining.find(r => r.uid === uid)).toBeUndefined();

    expect(mockTelemetry.track).toHaveBeenCalledWith(
      'location_upload_success',
      expect.objectContaining({uid}),
    );
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'location_upload_success',
      expect.objectContaining({uid}),
    );
  }, 15000);
});

import {beforeEach, describe, expect, it, jest} from '@jest/globals';

const mockGetItem: any = jest.fn();
const mockSetItem: any = jest.fn();
const mockRemoveItem: any = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
    removeItem: (key: string) => mockRemoveItem(key),
  },
}));

// Mock firebase/firestore exports so importing the module under test does not
// cause Jest to attempt to parse ESM firebase modules directly.
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

// Mock the local firebase wrapper so it doesn't import the ESM firebase libs
// For tests we provide a minimal db object so performLocationUpload can proceed
jest.mock('../firebase', () => ({
  isFirebaseReady: () => true,
  getFirebaseServices: () => ({db: {}}),
}));

import * as firestore from 'firebase/firestore';
import * as sut from '../locationUploadService';

import type {EnqueuedLocation} from '../locationUploadService';

describe('locationUploadService queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('enqueueLocation stores the latest location for a uid', async () => {
    await sut.enqueueLocation('user_1', {
      latitude: 1,
      longitude: 2,
      accuracy: 5,
      timestamp: Date.now(),
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
    );
    const stored = JSON.parse(
      mockSetItem.mock.calls[0][1],
    ) as EnqueuedLocation[];
    expect(stored).toHaveLength(1);
    expect(stored[0].uid).toBe('user_1');
    expect(stored[0].latitude).toBe(1);
  });

  it('flushQueuedLocationsForSession calls performLocationUpload and clears queue on success', async () => {
    const now = new Date().toISOString();
    mockGetItem.mockResolvedValue(
      JSON.stringify([
        {
          uid: 'user_42',
          latitude: 10,
          longitude: 20,
          timestamp: now,
          attempts: 0,
        },
      ]),
    );

    jest.spyOn(firestore, 'updateDoc').mockResolvedValue(undefined);

    const result = await sut.flushQueuedLocationsForSession('user_42');

    expect(result.flushed).toBe(1);
    // persisted should have been called to clear the queue
    expect(mockRemoveItem).toHaveBeenCalledWith(
      '@senderr/location-upload-queue',
    );
  });

  it('flushQueuedLocationsForSession increments attempts on failure and persists', async () => {
    const now = new Date().toISOString();
    mockGetItem.mockResolvedValue(
      JSON.stringify([
        {
          uid: 'user_99',
          latitude: 3,
          longitude: 4,
          timestamp: now,
          attempts: 0,
        },
      ]),
    );

    const mockTelemetry = {track: jest.fn()};
    const mockAnalytics = {track: jest.fn()};
    sut.setLocationUploadTelemetry(mockTelemetry as any);
    sut.setLocationUploadAnalytics(mockAnalytics as any);

    const error = new Error('network');
    jest.spyOn(firestore, 'updateDoc').mockRejectedValue(error);

    await expect(sut.flushQueuedLocationsForSession('user_99')).rejects.toThrow(
      'network',
    );

    // persisted updated queue should be saved
    const persisted = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(persisted[0].attempts).toBeGreaterThanOrEqual(1);
    expect(persisted[0].lastError).toContain('network');

    // scheduleRetry should have emitted telemetry and analytics for retry
    expect(mockTelemetry.track).toHaveBeenCalledWith(
      'location_upload_retry_scheduled',
      expect.objectContaining({uid: 'user_99'}),
    );
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'location_upload_retry_scheduled',
      expect.objectContaining({uid: 'user_99'}),
    );
  });

  it('reports telemetry on enqueue and flush', async () => {
    const mockTelemetry = {track: jest.fn()};
    const mockAnalytics = {track: jest.fn()};
    sut.setLocationUploadTelemetry(mockTelemetry as any);
    sut.setLocationUploadAnalytics(mockAnalytics as any);

    // enqueue should call telemetry and analytics
    await sut.enqueueLocation('tuser', {
      latitude: 1,
      longitude: 2,
      timestamp: Date.now(),
    });
    expect(mockTelemetry.track).toHaveBeenCalledWith(
      'location_enqueue',
      expect.objectContaining({uid: 'tuser'}),
    );
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'location_enqueue',
      expect.objectContaining({uid: 'tuser'}),
    );

    // simulate queued entry and successful flush
    const now = new Date().toISOString();
    mockGetItem.mockResolvedValue(
      JSON.stringify([
        {uid: 'tuser', latitude: 1, longitude: 2, timestamp: now, attempts: 0},
      ]),
    );
    jest.spyOn(firestore, 'updateDoc').mockResolvedValue(undefined);

    const res = await sut.flushQueuedLocationsForSession('tuser');
    expect(res.flushed).toBe(1);
    expect(mockTelemetry.track).toHaveBeenCalledWith(
      'location_upload_flushed',
      expect.objectContaining({uid: 'tuser'}),
    );
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'location_upload_flushed',
      expect.objectContaining({uid: 'tuser'}),
    );
  });

  it('drops entry after exceeding max attempts and emits dropped telemetry', async () => {
    // make max attempts low
    sut.setLocationUploadMaxAttempts(1);

    const mockTelemetry = {track: jest.fn()};
    const mockAnalytics = {track: jest.fn()};
    sut.setLocationUploadTelemetry(mockTelemetry as any);
    sut.setLocationUploadAnalytics(mockAnalytics as any);

    const now = new Date().toISOString();
    // existing attempts already at 1 will cause drop when we catch another failure
    mockGetItem.mockResolvedValue(
      JSON.stringify([
        {
          uid: 'dropper',
          latitude: 3,
          longitude: 4,
          timestamp: now,
          attempts: 1,
        },
      ]),
    );
    jest.spyOn(firestore, 'updateDoc').mockRejectedValue(new Error('network'));

    await expect(sut.flushQueuedLocationsForSession('dropper')).rejects.toThrow(
      'network',
    );

    // queue should be cleared (persisted via removeItem)
    expect(mockRemoveItem).toHaveBeenCalledWith(
      '@senderr/location-upload-queue',
    );
    expect(mockTelemetry.track).toHaveBeenCalledWith(
      'location_upload_dropped',
      expect.objectContaining({uid: 'dropper'}),
    );
    // analytics adapter should also be invoked for dropped events
    expect(mockAnalytics.track).toHaveBeenCalledWith(
      'location_upload_dropped',
      expect.objectContaining({uid: 'dropper'}),
    );

    // restore max attempts default for other tests
    sut.setLocationUploadMaxAttempts(5);
  });
});

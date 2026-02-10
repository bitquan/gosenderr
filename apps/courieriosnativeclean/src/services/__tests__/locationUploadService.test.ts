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

import * as sut from '../locationUploadService';

import type {EnqueuedLocation} from '../locationUploadService';

describe('locationUploadService queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('enqueueLocation stores the latest location for a uid', async () => {
    await sut.enqueueLocation('user_1', {latitude: 1, longitude: 2, accuracy: 5, timestamp: Date.now()});

    expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    const stored = JSON.parse(mockSetItem.mock.calls[0][1]) as EnqueuedLocation[];
    expect(stored).toHaveLength(1);
    expect(stored[0].uid).toBe('user_1');
    expect(stored[0].latitude).toBe(1);
  });

  it('flushQueuedLocationsForSession calls performLocationUpload and clears queue on success', async () => {
    const now = new Date().toISOString();
    mockGetItem.mockResolvedValue(JSON.stringify([{uid: 'user_42', latitude: 10, longitude: 20, timestamp: now, attempts:0}]));

    const spyPerform = jest.spyOn(sut, 'performLocationUpload').mockResolvedValue(undefined);

    const result = await sut.flushQueuedLocationsForSession('user_42');

    expect(spyPerform).toHaveBeenCalledWith(expect.objectContaining({uid: 'user_42'}));
    expect(result.flushed).toBe(1);
    // persisted should have been called to clear the queue
    expect(mockRemoveItem).toHaveBeenCalledWith('@senderr/location-upload-queue');
  });

  it('flushQueuedLocationsForSession increments attempts on failure and persists', async () => {
    const now = new Date().toISOString();
    mockGetItem.mockResolvedValue(JSON.stringify([{uid: 'user_99', latitude: 3, longitude: 4, timestamp: now, attempts:0}]));

    const error = new Error('network');
    jest.spyOn(sut, 'performLocationUpload').mockRejectedValue(error);

    await expect(sut.flushQueuedLocationsForSession('user_99')).rejects.toThrow('network');

    // persisted updated queue should be saved
    const persisted = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(persisted[0].attempts).toBeGreaterThanOrEqual(1);
    expect(persisted[0].lastError).toContain('network');
  });
});

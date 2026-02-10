import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import type {AuthSession} from '../../types/auth';
import type {Job} from '../../types/jobs';

const mockGetItem = jest.fn() as jest.MockedFunction<
  (key: string) => Promise<string | null>
>;
const mockSetItem = jest.fn() as jest.MockedFunction<
  (key: string, value: string) => Promise<void>
>;
const mockRemoveItem = jest.fn() as jest.MockedFunction<
  (key: string) => Promise<void>
>;

const mockIsFirebaseReady = jest.fn() as jest.MockedFunction<() => boolean>;
const mockGetFirebaseServices = jest.fn() as jest.MockedFunction<
  () => {db: unknown}
>;

const mockCollection = jest.fn() as jest.MockedFunction<
  (db: unknown, path: string) => unknown
>;
const mockWhere = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => unknown
>;
const mockOrderBy = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => unknown
>;
const mockQuery = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => unknown
>;
const mockGetDocs = jest.fn() as jest.MockedFunction<
  () => Promise<{
    empty: boolean;
    docs: Array<{id: string; data: () => Record<string, unknown>}>;
  }>
>;
const mockDoc = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => unknown
>;
const mockUpdateDoc = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => Promise<void>
>;
const mockGetDoc = jest.fn() as jest.MockedFunction<
  () => Promise<{exists: () => boolean; data: () => Record<string, unknown>}>
>;
const mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');
const mockOnSnapshot = jest.fn() as jest.MockedFunction<
  (...args: unknown[]) => () => void
>;
const mockRunTransaction = jest.fn() as jest.MockedFunction<
  (
    db: unknown,
    updater: (tx: {
      get: () => Promise<{exists: () => boolean; id: string; data: () => Record<string, unknown>}>
      update: jest.Mock
    }) => Promise<unknown>
  ) => Promise<unknown>
>;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  },
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem,
}));

jest.mock('../firebase', () => ({
  isFirebaseReady: () => mockIsFirebaseReady(),
  getFirebaseServices: () => mockGetFirebaseServices(),
}));

jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  where: mockWhere,
  orderBy: mockOrderBy,
  query: mockQuery,
  getDocs: mockGetDocs,
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  getDoc: mockGetDoc,
  runTransaction: mockRunTransaction,
  serverTimestamp: () => mockServerTimestamp(),
  onSnapshot: mockOnSnapshot,
}));

import {runtimeConfig} from '../../config/runtime';
import {fetchJobs, subscribeJobs, updateJobStatus} from '../jobsService';

const session: AuthSession = {
  uid: 'courier_123',
  email: 'courier@example.com',
  displayName: 'Courier',
  token: 'token',
  provider: 'mock',
};

const makeLocalJobs = (): Job[] => [
  {
    id: 'local_job_1',
    customerName: 'Local Customer',
    pickupAddress: '1 Main St',
    dropoffAddress: '2 Main St',
    etaMinutes: 20,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  },
];

const makeRemoteJobData = (status: string) => ({
  customerName: 'Remote Customer',
  pickupAddress: 'Remote Pickup',
  dropoffAddress: 'Remote Dropoff',
  etaMinutes: 14,
  status,
  updatedAt: new Date().toISOString(),
});

describe('jobsService firebase/mock fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    runtimeConfig.envName = 'dev';

    mockIsFirebaseReady.mockReturnValue(true);
    mockGetFirebaseServices.mockReturnValue({db: {}});

    mockCollection.mockReturnValue('jobs_ref');
    mockWhere.mockReturnValue('where_clause');
    mockOrderBy.mockReturnValue('order_clause');
    mockQuery.mockReturnValue('jobs_query');
    mockDoc.mockReturnValue('job_doc_ref');

    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    mockGetDoc.mockResolvedValue({exists: () => false, data: () => ({})});

    mockRunTransaction.mockImplementation(
      async (
        _db: unknown,
        updater: (tx: {
          get: () => Promise<{
            exists: () => boolean;
            id: string;
            data: () => Record<string, unknown>;
          }>;
          update: jest.Mock;
        }) => Promise<unknown>,
      ) => {
        const tx = {
          get: async () => ({
            exists: () => true,
            id: 'local_job_1',
            data: () => makeRemoteJobData('pending'),
          }),
          update: jest.fn(),
        };
        return updater(tx);
      },
    );
  });

  it('falls back to local jobs when Firebase fetch fails', async () => {
    mockGetDocs.mockRejectedValue(new Error('network unavailable'));

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('local_job_1');
    expect(mockGetDocs).toHaveBeenCalledWith('jobs_query');
    expect(mockGetItem).toHaveBeenCalledWith('@senderr/jobs');
  });

  it('returns retryable command result when status update fails in dev', async () => {
    mockRunTransaction.mockRejectedValue(new Error('network unavailable'));

    const result = await updateJobStatus(session, 'local_job_1', 'accepted');

    expect(result.kind).toBe('retryable_error');
    if (result.kind !== 'retryable_error') {
      throw new Error('Expected retryable_error');
    }
    expect(result.job.status).toBe('accepted');
    expect(mockSetItem).toHaveBeenCalledWith(
      '@senderr/jobs',
      expect.any(String),
    );
  });

  it('queues status updates in prod mode when connectivity drops', async () => {
    runtimeConfig.envName = 'prod';
    mockRunTransaction.mockRejectedValue(new Error('network unavailable'));

    const result = await updateJobStatus(session, 'local_job_1', 'accepted');

    expect(result.kind).toBe('retryable_error');
    expect(mockSetItem).toHaveBeenCalledWith(
      '@senderr/jobs/status-update-queue',
      expect.any(String),
    );
  });

  it('clears queued status update after a successful Firebase write', async () => {
    runtimeConfig.envName = 'prod';
    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(
          JSON.stringify([
            {
              jobId: 'local_job_1',
              sessionUid: session.uid,
              nextStatus: 'accepted',
              enqueuedAt: new Date().toISOString(),
              attempts: 1,
              lastError: 'network unavailable',
            },
          ]),
        );
      }
      return Promise.resolve(null);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'accepted');

    expect(result.kind).toBe('success');
    expect(mockRemoveItem).toHaveBeenCalledWith(
      '@senderr/jobs/status-update-queue',
    );
  });

  it('returns conflict result when transition is invalid', async () => {
    mockRunTransaction.mockImplementation(
      async (
        _db: unknown,
        updater: (tx: {
          get: () => Promise<{
            exists: () => boolean;
            id: string;
            data: () => Record<string, unknown>;
          }>;
          update: jest.Mock;
        }) => Promise<unknown>,
      ) => {
        const tx = {
          get: async () => ({
            exists: () => true,
            id: 'local_job_1',
            data: () => makeRemoteJobData('delivered'),
          }),
          update: jest.fn(),
        };
        return updater(tx);
      },
    );

    const result = await updateJobStatus(session, 'local_job_1', 'accepted');

    expect(result.kind).toBe('conflict');
    if (result.kind !== 'conflict') {
      throw new Error('Expected conflict');
    }
    expect(result.job.status).toBe('delivered');
    expect(result.message).toContain(
      'Cannot change job from delivered to accepted',
    );
  });

  it('returns idempotent success when requested status matches current status', async () => {
    mockRunTransaction.mockImplementation(
      async (
        _db: unknown,
        updater: (tx: {
          get: () => Promise<{
            exists: () => boolean;
            id: string;
            data: () => Record<string, unknown>;
          }>;
          update: jest.Mock;
        }) => Promise<unknown>,
      ) => {
        const tx = {
          get: async () => ({
            exists: () => true,
            id: 'local_job_1',
            data: () => makeRemoteJobData('accepted'),
          }),
          update: jest.fn(),
        };
        return updater(tx);
      },
    );

    const result = await updateJobStatus(session, 'local_job_1', 'accepted');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.idempotent).toBe(true);
    expect(result.job.status).toBe('accepted');
  });

  it('returns Firebase jobs when query succeeds', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'remote_job_1',
          data: () => ({
            customerName: 'Remote Customer',
            pickupAddress: 'Remote Pickup',
            dropoffAddress: 'Remote Dropoff',
            etaMinutes: 14,
            status: 'accepted',
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('remote_job_1');
    expect(jobs[0].status).toBe('accepted');
    expect(mockGetItem).not.toHaveBeenCalledWith('@senderr/jobs');
  });

  it('streams listener updates and reports live sync state', () => {
    type ListenerSnapshot = {
      docs: Array<{id: string; data: () => Record<string, unknown>}>;
      metadata: {fromCache: boolean};
    };
    let onNext: ((snapshot: ListenerSnapshot) => void) | null = null;
    const detach = jest.fn();
    mockOnSnapshot.mockImplementation((...args: unknown[]) => {
      onNext = args[2] as (snapshot: ListenerSnapshot) => void;
      return detach;
    });

    const states: {status: string; stale: boolean}[] = [];
    const payloads: Job[][] = [];

    const subscription = subscribeJobs(session, {
      onJobs: nextJobs => payloads.push(nextJobs),
      onSyncState: state =>
        states.push({status: state.status, stale: state.stale}),
    });

    expect(states[0]?.status).toBe('connecting');

    if (!onNext) {
      throw new Error('Expected snapshot handler to be registered');
    }
    const nextHandler = onNext as (snapshot: ListenerSnapshot) => void;

    nextHandler({
      docs: [
        {
          id: 'remote_job_listener',
          data: () => ({
            customerName: 'Listener Customer',
            pickupAddress: 'Pickup',
            dropoffAddress: 'Dropoff',
            etaMinutes: 12,
            status: 'accepted',
          }),
        },
      ],
      metadata: {fromCache: false},
    });

    expect(payloads[0]?.[0].id).toBe('remote_job_listener');
    expect(states[states.length - 1]?.status).toBe('live');
    expect(states[states.length - 1]?.stale).toBe(false);

    subscription.unsubscribe();
    expect(detach).toHaveBeenCalled();
  });

  it('retries listener attach with backoff after disconnect', () => {
    jest.useFakeTimers();

    let onError: ((error: Error) => void) | null = null;
    mockOnSnapshot.mockImplementation((...args: unknown[]) => {
      onError = args[3] as (error: Error) => void;
      return jest.fn();
    });

    const states: {status: string; reconnectAttempt: number}[] = [];
    const subscription = subscribeJobs(session, {
      onJobs: () => {},
      onSyncState: state =>
        states.push({
          status: state.status,
          reconnectAttempt: state.reconnectAttempt,
        }),
    });

    if (!onError) {
      throw new Error('Expected error handler to be registered');
    }
    const errorHandler = onError as (error: Error) => void;

    errorHandler(new Error('socket disconnected'));
    expect(states[states.length - 1]?.status).toBe('reconnecting');
    expect(states[states.length - 1]?.reconnectAttempt).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);

    subscription.unsubscribe();
    jest.useRealTimers();
  });

  it('does not silently fall back to local seed jobs in prod mode', async () => {
    runtimeConfig.envName = 'prod';
    mockGetDocs.mockRejectedValue(new Error('network unavailable'));

    await expect(fetchJobs(session)).rejects.toThrow(
      'fetchJobs failed in Firebase mode',
    );
    expect(mockGetItem).not.toHaveBeenCalledWith('@senderr/jobs');
  });
});

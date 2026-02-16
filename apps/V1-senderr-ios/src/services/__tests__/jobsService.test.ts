import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import type {AuthSession} from '../../types/auth';
import type {Job} from '../../types/jobs';

const mockGetItem: any = jest.fn();
const mockSetItem: any = jest.fn();
const mockRemoveItem: any = jest.fn();

const mockIsFirebaseReady: any = jest.fn();
const mockIsFirebaseEmulatorEnabled: any = jest.fn();
const mockGetFirebaseServices: any = jest.fn();
const mockGetFirebaseFunctions: any = jest.fn();
const mockHttpsCallable: any = jest.fn();

const mockCollection: any = jest.fn();
const mockWhere: any = jest.fn();
const mockOrderBy: any = jest.fn();
const mockQuery: any = jest.fn();
const mockGetDocs: any = jest.fn();
const mockDoc: any = jest.fn();
const mockUpdateDoc: any = jest.fn();
const mockGetDoc: any = jest.fn();
const mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');
const mockOnSnapshot: any = jest.fn();
const mockRunTransaction: any = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

jest.mock('../firebase', () => ({
  isFirebaseReady: () => mockIsFirebaseReady(),
  isFirebaseEmulatorEnabled: () => mockIsFirebaseEmulatorEnabled(),
  getFirebaseServices: () => mockGetFirebaseServices(),
  getFirebaseFunctions: () => mockGetFirebaseFunctions(),
  // provide a stub getFirebaseStorage so tests can simulate Storage being available
  getFirebaseStorage: () => ({}),
}));

jest.mock('firebase/functions', () => ({
  __esModule: true,
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

jest.mock('firebase/firestore', () => ({
  __esModule: true,
  collection: (...args: unknown[]) => mockCollection(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  serverTimestamp: () => mockServerTimestamp(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

import {runtimeConfig} from '../../config/runtime';
import * as jobsModule from '../jobsService';
import {commandAcceptJob, commandStartPickup, fetchJobs, subscribeJobs, updateJobStatus} from '../jobsService';

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
    status: 'open',
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
    mockIsFirebaseEmulatorEnabled.mockReturnValue(false);
    mockGetFirebaseServices.mockReturnValue({db: {}} as unknown);
    mockGetFirebaseFunctions.mockReturnValue(null);

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

    mockGetDoc.mockResolvedValue({exists: () => false});

    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => makeRemoteJobData('open'),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    mockHttpsCallable.mockReset();
  });

  it('falls back to local jobs when Firebase fetch fails', async () => {
    mockGetDocs.mockRejectedValue(new Error('network unavailable'));

    // sanity checks for mocks
    expect(mockIsFirebaseReady()).toBe(true);
    expect(mockGetFirebaseServices()).toEqual({db: {}});

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('local_job_1');
    expect(mockGetItem).toHaveBeenCalledWith('@senderr/jobs');
  });

  it('returns retryable command result when status update fails in dev', async () => {
    mockRunTransaction.mockRejectedValue(new Error('network unavailable'));

    const result = await updateJobStatus(session, 'local_job_1', 'assigned');

    expect(result.kind).toBe('retryable_error');
    if (result.kind !== 'retryable_error') {
      throw new Error('Expected retryable_error');
    }
    expect(result.job.status).toBe('assigned');
    expect(mockSetItem).toHaveBeenCalledWith('@senderr/jobs', expect.any(String));
  });

  it('queues status updates in prod mode when connectivity drops', async () => {
    runtimeConfig.envName = 'prod';
    mockRunTransaction.mockRejectedValue(new Error('network unavailable'));

    const result = await updateJobStatus(session, 'local_job_1', 'assigned');

    expect(result.kind).toBe('retryable_error');
    expect(mockSetItem).toHaveBeenCalledWith('@senderr/jobs/status-update-queue', expect.any(String));
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
              nextStatus: 'assigned',
              enqueuedAt: new Date().toISOString(),
              attempts: 1,
              lastError: 'network unavailable',
            },
          ]),
        );
      }
      return Promise.resolve(null);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'assigned');

    expect(result.kind).toBe('success');
    expect(mockRemoveItem).toHaveBeenCalledWith('@senderr/jobs/status-update-queue');
  });

  it('returns conflict result when transition is invalid', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => makeRemoteJobData('completed'),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'assigned');

    expect(result.kind).toBe('conflict');
    if (result.kind !== 'conflict') {
      throw new Error('Expected conflict');
    }
    expect(result.job.status).toBe('completed');
    expect(result.message).toContain('Cannot change job from completed to assigned');
  });

  it('uses commandAcceptJob callable when Firebase Functions is available', async () => {
    mockGetFirebaseFunctions.mockReturnValue({functions: true});
    mockHttpsCallable.mockReturnValue(async () => ({
      data: {
        kind: 'success',
        requestedStatus: 'assigned',
        idempotent: false,
        message: null,
        correlationId: 'corr_test_accept',
        job: {
          id: 'remote_job_1',
          customerName: 'Remote Customer',
          pickupAddress: 'Remote Pickup',
          dropoffAddress: 'Remote Dropoff',
          etaMinutes: 14,
          status: 'assigned',
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    const result = await commandAcceptJob(session, 'remote_job_1');

    expect(mockHttpsCallable).toHaveBeenCalledWith({functions: true}, 'commandAcceptJob');
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.job.status).toBe('assigned');
    expect(result.correlationId).toBe('corr_test_accept');
  });

  it('falls back to Firestore transaction when commandAcceptJob callable is unavailable', async () => {
    mockGetFirebaseFunctions.mockReturnValue({functions: true});
    mockHttpsCallable.mockReturnValue(async () => {
      throw {
        code: 'functions/unimplemented',
        message: 'Callable not deployed.',
      };
    });

    const result = await commandAcceptJob(session, 'local_job_1');

    expect(mockHttpsCallable).toHaveBeenCalledWith({functions: true}, 'commandAcceptJob');
    expect(mockRunTransaction).toHaveBeenCalled();
    expect(result.kind).toBe('success');
  });

  it('uses callable commandStartPickup when Firebase Functions is available', async () => {
    mockGetFirebaseFunctions.mockReturnValue({functions: true});
    mockHttpsCallable.mockReturnValue(async () => ({
      data: {
        kind: 'success',
        requestedStatus: 'enroute_pickup',
        idempotent: false,
        message: null,
        correlationId: 'corr_start_pickup',
        job: {
          id: 'remote_job_1',
          customerName: 'Remote Customer',
          pickupAddress: 'Remote Pickup',
          dropoffAddress: 'Remote Dropoff',
          etaMinutes: 14,
          status: 'enroute_pickup',
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    const result = await commandStartPickup(session, 'remote_job_1');

    expect(mockHttpsCallable).toHaveBeenCalledWith({functions: true}, 'commandStartPickup');
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.job.status).toBe('enroute_pickup');
  });

  it('allows assigned -> arrived_pickup transition (UI may skip enroute)', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => makeRemoteJobData('assigned'),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'arrived_pickup');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.job.status).toBe('arrived_pickup');
  });

  it('returns conflict when payment is not authorized for trip progression', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => ({
            ...makeRemoteJobData('arrived_pickup'),
            paymentStatus: 'pending',
          }),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'picked_up');

    expect(result.kind).toBe('conflict');
    if (result.kind !== 'conflict') {
      throw new Error('Expected conflict');
    }
    expect(result.job.status).toBe('arrived_pickup');
    expect(result.message).toContain('Payment is not authorized');
  });

  it('returns conflict when pickup proof is missing', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => ({
            ...makeRemoteJobData('arrived_pickup'),
            paymentStatus: 'authorized',
            notes: 'Photo proof required at pickup',
          }),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'picked_up');

    expect(result.kind).toBe('conflict');
    if (result.kind !== 'conflict') {
      throw new Error('Expected conflict');
    }
    expect(result.message).toContain('Pickup proof is required');
  });

  it('returns conflict when dropoff proof is missing', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => ({
            ...makeRemoteJobData('arrived_dropoff'),
            paymentStatus: 'authorized',
            notes: 'Dropoff proof required',
          }),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'completed');

    expect(result.kind).toBe('conflict');
    if (result.kind !== 'conflict') {
      throw new Error('Expected conflict');
    }
    expect(result.message).toContain('Dropoff proof is required');
  });

  it('allows completion when payment is authorized and dropoff proof exists', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => ({
            ...makeRemoteJobData('arrived_dropoff'),
            paymentStatus: 'authorized',
            notes: 'Dropoff proof required',
            dropoffProof: {
              url: 'https://example.com/proof.jpg',
              location: {latitude: 38.9, longitude: -77.04},
              accuracy: 8,
              timestamp: new Date().toISOString(),
            },
          }),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'completed');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.job.status).toBe('completed');
  });

  it('uploads inline proof to Firebase Storage when available and saves storage URL', async () => {
    // prepare a local job in AsyncStorage with id 'job-storage'
    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(
          JSON.stringify([
            {
              id: 'job-storage',
              customerName: 'Local Customer',
              pickupAddress: '1 Main St',
              dropoffAddress: '2 Main St',
              etaMinutes: 20,
              status: 'arrived_dropoff',
              updatedAt: new Date().toISOString(),
            },
          ]),
        );
      }
      return Promise.resolve(null);
    });

    mockIsFirebaseReady.mockReturnValue(true);
    mockGetFirebaseServices.mockReturnValue({db: {}});

    // mock firebase/storage functions used in attachProof
    const mockUploadString = jest.fn().mockResolvedValue(undefined);
    const mockGetDownloadURL = jest.fn().mockResolvedValue('https://storage.example.com/jobs/job-storage/dropoff-123.jpg');
    const mockRef = jest.fn();
    const mockUploadBytes = jest.fn().mockResolvedValue(undefined);

    jest.mock('firebase/storage', () => ({
      ref: (...args: any[]) => mockRef(...args),
      uploadString: (...args: any[]) => mockUploadString(...args),
      uploadBytes: (...args: any[]) => mockUploadBytes(...args),
      getDownloadURL: (...args: any[]) => mockGetDownloadURL(...args),
    }));

    const proofPayload = {
      url: 'data:image/jpeg;base64,AAA',
      location: {latitude: 1, longitude: 2},
      accuracy: 5,
      timestamp: new Date().toISOString(),
    };

    // simulate Firestore readback returning a job with the storage URL
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'job-storage',
      data: () => ({
        customerName: 'Local Customer',
        pickupAddress: '1 Main St',
        dropoffAddress: '2 Main St',
        etaMinutes: 20,
        status: 'arrived_dropoff',
        updatedAt: new Date().toISOString(),
        dropoffProof: {
          url: 'https://storage.example.com/jobs/job-storage/dropoff-123.jpg',
          location: {latitude: 1, longitude: 2},
          accuracy: 5,
          timestamp: proofPayload.timestamp,
        },
      }),
    });

    // call attachProof
    const updated = await jobsModule.attachProof(session, 'job-storage', 'dropoff', proofPayload as any);

    // verify we attempted to upload and then updated Firestore (updateDoc called)
    expect(mockUploadString).toHaveBeenCalled();
    // ensure the stored job has a storage URL (getDownloadURL result)
    expect(updated.dropoffProof?.url).toBe('https://storage.example.com/jobs/job-storage/dropoff-123.jpg');
  });

  it('returns idempotent success when requested status matches current status', async () => {
    mockRunTransaction.mockImplementation(async (_db: unknown, updater: (tx: any) => Promise<any>) => {
      const tx = {
        get: async () => ({
          exists: () => true,
          id: 'local_job_1',
          data: () => makeRemoteJobData('assigned'),
        }),
        update: jest.fn(),
      };
      return updater(tx);
    });

    const result = await updateJobStatus(session, 'local_job_1', 'assigned');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success');
    }
    expect(result.idempotent).toBe(true);
    expect(result.job.status).toBe('assigned');
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
            status: 'assigned',
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('remote_job_1');
    expect(jobs[0].status).toBe('assigned');
    expect(mockGetItem).not.toHaveBeenCalledWith('@senderr/jobs');
  });

  it('uses active-status feed query in dev emulator mode', async () => {
    mockIsFirebaseEmulatorEnabled.mockReturnValue(true);
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'remote_job_emulator',
          data: () => ({
            customerName: 'Remote Customer',
            pickupAddress: 'Remote Pickup',
            dropoffAddress: 'Remote Dropoff',
            etaMinutes: 14,
            status: 'open',
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('remote_job_emulator');
    expect(mockWhere).toHaveBeenCalledWith(
      'status',
      'in',
      expect.arrayContaining(['open', 'assigned', 'enroute_pickup', 'arrived_dropoff', 'pending', 'accepted']),
    );
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('masks open-job addresses before acceptance for courier privacy', async () => {
    runtimeConfig.envName = 'prod';
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'remote_open_1',
          data: () => ({
            customerName: 'Masked Customer',
            pickupAddress: '123 Main St, Arlington, VA 22201',
            dropoffAddress: '555 Pine Rd, Washington, DC 20001',
            etaMinutes: 14,
            status: 'open',
            courierUid: null,
            courierId: null,
            photos: [
              {
                url: 'https://cdn.example.com/job/photo-1.jpg',
                path: 'jobs/job-1/photo-1.jpg',
                uploadedBy: 'customer_1',
                uploadedAt: {
                  toDate: () => new Date('2026-02-14T00:00:00.000Z'),
                },
              },
            ],
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].customerName).toBe('Customer');
    expect(jobs[0].pickupAddress).toBe('Arlington, VA 22201');
    expect(jobs[0].dropoffAddress).toBe('Washington, DC 20001');
    expect(jobs[0].photos).toEqual([
      {
        url: 'https://cdn.example.com/job/photo-1.jpg',
        path: 'jobs/job-1/photo-1.jpg',
        uploadedBy: 'customer_1',
        uploadedAt: '2026-02-14T00:00:00.000Z',
      },
    ]);
  });

  it('filters out open jobs offered to a different courier', async () => {
    runtimeConfig.envName = 'prod';
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'remote_open_other_offer',
          data: () => ({
            customerName: 'Remote Customer',
            pickupAddress: 'Remote Pickup',
            dropoffAddress: 'Remote Dropoff',
            etaMinutes: 14,
            status: 'open',
            offeredToCourierUid: 'another_courier',
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(0);
  });

  it('filters out food jobs when food work mode is disabled', async () => {
    runtimeConfig.envName = 'prod';
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        courierProfileV1: {
          workModes: {
            packagesEnabled: true,
            foodEnabled: false,
          },
        },
      }),
    });
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'remote_food_job',
          data: () => ({
            customerName: 'Food Customer',
            pickupAddress: 'Food Pickup',
            dropoffAddress: 'Food Dropoff',
            etaMinutes: 12,
            status: 'open',
            jobType: 'food',
          }),
        },
        {
          id: 'remote_package_job',
          data: () => ({
            customerName: 'Package Customer',
            pickupAddress: 'Package Pickup',
            dropoffAddress: 'Package Dropoff',
            etaMinutes: 16,
            status: 'open',
            jobType: 'package',
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('remote_package_job');
  });

  it('filters out capability-gated open jobs when courier lacks required equipment capability', async () => {
    runtimeConfig.envName = 'prod';
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        courierProfileV1: {
          capabilities: {
            canDeliverHot: false,
            canDeliverCold: true,
            canDeliverFrozen: false,
            canDeliverDrinks: true,
            canDeliverHeavy: true,
            canDeliverFurniture: false,
          },
        },
      }),
    });
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'remote_hot_job',
          data: () => ({
            customerName: 'Hot Customer',
            pickupAddress: 'Pickup',
            dropoffAddress: 'Dropoff',
            etaMinutes: 10,
            status: 'open',
            notes: 'Hot food - keep warm',
            jobType: 'food',
          }),
        },
      ],
    });

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(0);
  });

  it('streams listener updates and reports live sync state', () => {
    let onNext: ((snapshot: any) => void) | null = null;
    const detach = jest.fn();
    mockOnSnapshot.mockImplementation((...args: any[]) => {
      onNext = args[2] as (snapshot: any) => void;
      return detach;
    });

    const states: {status: string; stale: boolean}[] = [];
    const payloads: Job[][] = [];

    const subscription = subscribeJobs(session, {
      onJobs: nextJobs => payloads.push(nextJobs),
      onSyncState: state => states.push({status: state.status, stale: state.stale}),
    });

    expect(states[0]?.status).toBe('connecting');

    if (!onNext) {
      throw new Error('Expected snapshot handler to be registered');
    }
    const nextHandler = onNext as (snapshot: any) => void;

    nextHandler({
      docs: [
        {
          id: 'remote_job_listener',
          data: () => ({
            customerName: 'Listener Customer',
            pickupAddress: 'Pickup',
            dropoffAddress: 'Dropoff',
            etaMinutes: 12,
            status: 'assigned',
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

  it('triggers flushQueuedStatusUpdates when listener becomes live (fromCache false)', async () => {
    // seed queued updates so a live snapshot triggers queue processing
    const now = new Date().toISOString();
    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(
          JSON.stringify([
            {
              jobId: 'job_live_flush',
              sessionUid: session.uid,
              nextStatus: 'assigned',
              enqueuedAt: now,
              attempts: 1,
              lastError: 'network unavailable',
            },
          ]),
        );
      }
      return Promise.resolve(null);
    });
    mockDoc.mockImplementation((_db: any, _col: string, id: string) => `doc:${id}`);
    mockUpdateDoc.mockResolvedValue(undefined);

    let onNext: ((snapshot: any) => void) | null = null;
    const detach = jest.fn();
    mockOnSnapshot.mockImplementation((...args: any[]) => {
      onNext = args[2] as (snapshot: any) => void;
      return detach;
    });

    const states: any[] = [];
    subscribeJobs(session, {
      onJobs: () => {},
      onSyncState: state => states.push(state),
    });

    if (!onNext) {
      throw new Error('Expected snapshot handler to be registered');
    }

    // First deliver a cached snapshot (fromCache: true) — should NOT flush
    onNext({docs: [], metadata: {fromCache: true}});
    expect(mockUpdateDoc).not.toHaveBeenCalled();

    // Then deliver a live snapshot (fromCache: false) — should trigger flush
    onNext({docs: [], metadata: {fromCache: false}});

    // allow async flushQueue to run
    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc:job_live_flush',
      expect.objectContaining({status: 'assigned'}),
    );
  });

  it('retries listener attach with backoff after disconnect', () => {
    jest.useFakeTimers();

    let onError: ((error: Error) => void) | null = null;
    mockOnSnapshot.mockImplementation((...args: any[]) => {
      onError = args[3] as (error: Error) => void;
      return jest.fn();
    });

    const states: {status: string; reconnectAttempt: number}[] = [];
    const subscription = subscribeJobs(session, {
      onJobs: () => {},
      onSyncState: state => states.push({status: state.status, reconnectAttempt: state.reconnectAttempt}),
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

  it('flushQueuedStatusUpdates drops non-retryable entries and continues flushing others', async () => {
    // Setup a queue with a non-retryable failure for the first entry and a succeeding second entry
    const now = new Date().toISOString();
    const queued = [
      {jobId: 'job_drop', sessionUid: session.uid, nextStatus: 'assigned', enqueuedAt: now, attempts: 1, lastError: 'permission-denied'},
      {jobId: 'job_ok', sessionUid: session.uid, nextStatus: 'assigned', enqueuedAt: now, attempts: 1, lastError: null},
    ];

    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(JSON.stringify(queued));
      }
      return Promise.resolve(null);
    });

    // Make doc() return the id in the ref so updateDoc can inspect it
    mockDoc.mockImplementation((_db: any, _col: string, id: string) => `doc:${id}`);
    mockUpdateDoc.mockImplementation(async (ref: string) => {
      if (ref === 'doc:job_drop') {
        const err: any = new Error('permission denied');
        err.code = 'permission-denied';
        throw err;
      }
      return Promise.resolve();
    });

    const sub = subscribeJobs(session, {onJobs: () => {}, onSyncState: () => {}});
    const result = await sub.refresh();

    // The non-retryable entry should be dropped and the successful one flushed
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    // Queue key should be removed when nothing remains
    expect(mockRemoveItem).toHaveBeenCalledWith('@senderr/jobs/status-update-queue');
  });

  it('flushQueuedStatusUpdates stops on first retryable error and increments attempts', async () => {
    const now = new Date().toISOString();
    const queued = [
      {jobId: 'job_retry', sessionUid: session.uid, nextStatus: 'assigned', enqueuedAt: now, attempts: 1, lastError: 'network unavailable'},
      {jobId: 'job_left', sessionUid: session.uid, nextStatus: 'assigned', enqueuedAt: now, attempts: 1, lastError: null},
    ];

    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(JSON.stringify(queued));
      }
      return Promise.resolve(null);
    });

    mockDoc.mockImplementation((_db: any, _col: string, id: string) => `doc:${id}`);

    // First updateDoc call fails with a connectivity-like error (retryable)
    mockUpdateDoc.mockImplementationOnce(async (ref: string) => {
      const err: any = new Error('network request failed');
      err.code = 'unavailable';
      throw err;
    });

    const sub = subscribeJobs(session, {onJobs: () => {}, onSyncState: () => {}});
    await sub.refresh();

    // Only the first queued entry should have been attempted
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

    // The queue should be persisted with attempts incremented for the retryable entry
    expect(mockSetItem).toHaveBeenCalledWith(
      '@senderr/jobs/status-update-queue',
      expect.stringContaining('job_retry'),
    );

    const queuePersistCall = mockSetItem.mock.calls.find(
      ([key]) => key === '@senderr/jobs/status-update-queue',
    );
    expect(queuePersistCall).toBeDefined();
    const saved = JSON.parse(String(queuePersistCall?.[1]));
    const retryEntry = saved.find((e: any) => e.jobId === 'job_retry');
    expect(retryEntry.attempts).toBe(2);

    // The second entry should remain in the queue (flush stopped)
    expect(saved.find((e: any) => e.jobId === 'job_left')).toBeDefined();
  });

  it('flushQueuedStatusUpdates uses only the latest queued item per job (dedupe)', async () => {
    const older = new Date(Date.now() - 10000).toISOString();
    const newer = new Date().toISOString();

    const queued = [
      {jobId: 'job_dup', sessionUid: session.uid, nextStatus: 'assigned', enqueuedAt: older, attempts: 1, lastError: null},
      {jobId: 'job_dup', sessionUid: session.uid, nextStatus: 'completed', enqueuedAt: newer, attempts: 1, lastError: null},
    ];

    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(JSON.stringify(queued));
      }
      return Promise.resolve(null);
    });

    mockDoc.mockImplementation((_db: any, _col: string, id: string) => `doc:${id}`);
    mockUpdateDoc.mockResolvedValue(undefined);

    const sub = subscribeJobs(session, {onJobs: () => {}, onSyncState: () => {}});
    await sub.refresh();

    // Only one updateDoc call should be made for the deduped job
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

    // The status written should be the latest queued status ('completed')
    const writtenArgs = mockUpdateDoc.mock.calls[0][1];
    expect(writtenArgs.status).toBe('completed');
  });

  it('drops queued entries that exceed max attempts', async () => {
    const now = new Date().toISOString();
    const queued = [
      {jobId: 'job_stuck', sessionUid: session.uid, nextStatus: 'assigned', enqueuedAt: now, attempts: 5, lastError: 'gone wrong'},
    ];

    mockGetItem.mockImplementation((key: string) => {
      if (key === '@senderr/jobs') {
        return Promise.resolve(JSON.stringify(makeLocalJobs()));
      }
      if (key === '@senderr/jobs/status-update-queue') {
        return Promise.resolve(JSON.stringify(queued));
      }
      return Promise.resolve(null);
    });

    mockDoc.mockImplementation((_db: any, _col: string, id: string) => `doc:${id}`);
    mockUpdateDoc.mockResolvedValue(undefined);

    const sub = subscribeJobs(session, {onJobs: () => {}, onSyncState: () => {}});
    const result = await sub.refresh();

    // No updateDoc call should be made because entry exceeded attempts and gets dropped
    expect(mockUpdateDoc).toHaveBeenCalledTimes(0);

    // The persisted queue should be cleared
    expect(mockRemoveItem).toHaveBeenCalledWith('@senderr/jobs/status-update-queue');
  });

  it('does not silently fall back to local seed jobs in prod mode', async () => {
    runtimeConfig.envName = 'prod';
    mockGetDocs.mockRejectedValue(new Error('network unavailable'));

    await expect(fetchJobs(session)).rejects.toThrow('fetchJobs failed in Firebase mode');
    expect(mockGetItem).not.toHaveBeenCalledWith('@senderr/jobs');
  });
});

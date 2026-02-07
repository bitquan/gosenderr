import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import type {AuthSession} from '../../types/auth';
import type {Job} from '../../types/jobs';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

const mockIsFirebaseReady = jest.fn();
const mockGetFirebaseServices = jest.fn();

const mockCollection = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockQuery = jest.fn();
const mockGetDocs = jest.fn();
const mockDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  },
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
  serverTimestamp: () => mockServerTimestamp(),
}));

import {fetchJobs, updateJobStatus} from '../jobsService';

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

describe('jobsService firebase/mock fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockIsFirebaseReady.mockReturnValue(true);
    mockGetFirebaseServices.mockReturnValue({db: {}} as unknown);

    mockCollection.mockReturnValue('jobs_ref');
    mockWhere.mockReturnValue('where_clause');
    mockOrderBy.mockReturnValue('order_clause');
    mockQuery.mockReturnValue('jobs_query');
    mockDoc.mockReturnValue('job_doc_ref');
  });

  it('falls back to local jobs when Firebase fetch fails', async () => {
    (mockGetDocs as any).mockRejectedValue(new Error('network unavailable'));
    (mockGetItem as any).mockResolvedValue(JSON.stringify(makeLocalJobs()));

    const jobs = await fetchJobs(session);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('local_job_1');
    expect(mockGetDocs).toHaveBeenCalledWith('jobs_query');
    expect(mockGetItem).toHaveBeenCalledWith('@senderr/jobs');
  });

  it('updates local job state when Firebase status update fails', async () => {
    (mockUpdateDoc as any).mockRejectedValue(new Error('write failed'));
    (mockGetItem as any).mockResolvedValue(JSON.stringify(makeLocalJobs()));

    const updated = await updateJobStatus(session, 'local_job_1', 'accepted');

    expect(updated.status).toBe('accepted');
    expect(mockSetItem).toHaveBeenCalledWith('@senderr/jobs', expect.any(String));
    const setItemCalls = mockSetItem.mock.calls as unknown[][];
    const persistedJobs = JSON.parse(setItemCalls[0][1] as string) as Job[];
    expect(persistedJobs[0].status).toBe('accepted');
  });

  it('returns Firebase jobs when query succeeds', async () => {
    (mockGetDocs as any).mockResolvedValue({
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
    expect(mockGetItem).not.toHaveBeenCalled();
  });
});

import type {AuthSession} from '../../types/auth';
import type {Job} from '../../types/jobs';
import type {JobStatus, JobStatusCommandResult} from '@gosenderr/contracts';
export type {JobStatusCommandResult} from '@gosenderr/contracts';

export type JobsSyncStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'stale' | 'error';

export type JobsSyncState = {
  status: JobsSyncStatus;
  stale: boolean;
  reconnectAttempt: number;
  lastSyncedAt: string | null;
  message: string | null;
  source: 'firebase' | 'local';
};

export type JobsSubscription = {
  unsubscribe: () => void;
  refresh: () => Promise<Job[]>;
};

export type JobsSubscriptionHandlers = {
  onJobs: (jobs: Job[]) => void;
  onSyncState: (state: JobsSyncState) => void;
};

export interface JobsServicePort {
  fetchJobs: (session: AuthSession) => Promise<Job[]>;
  getJobById: (session: AuthSession, id: string) => Promise<Job | null>;
  updateJobStatus: (session: AuthSession, id: string, nextStatus: JobStatus) => Promise<JobStatusCommandResult>;
  commandAcceptJob?: (session: AuthSession, id: string) => Promise<JobStatusCommandResult>;
  commandStartPickup?: (session: AuthSession, id: string) => Promise<JobStatusCommandResult>;
  commandMarkArrivedPickup?: (session: AuthSession, id: string) => Promise<JobStatusCommandResult>;
  commandConfirmPickup?: (session: AuthSession, id: string) => Promise<JobStatusCommandResult>;
  commandStartDropoff?: (session: AuthSession, id: string) => Promise<JobStatusCommandResult>;
  commandCompleteDelivery?: (session: AuthSession, id: string) => Promise<JobStatusCommandResult>;
  subscribeJobs: (session: AuthSession, handlers: JobsSubscriptionHandlers) => JobsSubscription;
  // Attach proof (photo) for pickup or dropoff. Returns the updated Job document.
  attachProof: (
    session: AuthSession,
    id: string,
    type: 'pickup' | 'dropoff',
    proof: {url: string; location?: {latitude: number; longitude: number}; accuracy?: number; timestamp?: string},
  ) => Promise<Job>;
}

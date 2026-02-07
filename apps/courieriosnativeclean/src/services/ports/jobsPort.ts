import type {AuthSession} from '../../types/auth';
import type {Job, JobStatus} from '../../types/jobs';

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
  updateJobStatus: (session: AuthSession, id: string, nextStatus: JobStatus) => Promise<Job>;
  subscribeJobs: (session: AuthSession, handlers: JobsSubscriptionHandlers) => JobsSubscription;
}

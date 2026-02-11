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

export type JobStatusCommandResult =
  | {
      kind: 'success';
      job: Job;
      requestedStatus: JobStatus;
      idempotent: boolean;
      message: string | null;
    }
  | {
      kind: 'conflict';
      job: Job;
      requestedStatus: JobStatus;
      message: string;
    }
  | {
      kind: 'retryable_error';
      job: Job;
      requestedStatus: JobStatus;
      message: string;
    }
  | {
      kind: 'fatal_error';
      job: Job | null;
      requestedStatus: JobStatus;
      message: string;
    };

export interface JobsServicePort {
  fetchJobs: (session: AuthSession) => Promise<Job[]>;
  getJobById: (session: AuthSession, id: string) => Promise<Job | null>;
  updateJobStatus: (session: AuthSession, id: string, nextStatus: JobStatus) => Promise<JobStatusCommandResult>;
  subscribeJobs: (session: AuthSession, handlers: JobsSubscriptionHandlers) => JobsSubscription;
}

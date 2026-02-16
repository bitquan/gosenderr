import type {Job} from '../jobs/types';
import type {JobStatus} from '../jobs/status';

export type CommandResultKind =
  | 'success'
  | 'conflict'
  | 'retryable_error'
  | 'fatal_error';

export type CommandActorRole =
  | 'customer'
  | 'courier'
  | 'vendor'
  | 'admin'
  | 'system';

export type CommandMetadata = {
  actorUid: string;
  actorRole: CommandActorRole;
  deviceId?: string;
  clientTimestamp: string;
  idempotencyKey: string;
  correlationId: string;
};

export type JobStatusCommandResult =
  | {
      kind: 'success';
      job: Job;
      requestedStatus: JobStatus;
      idempotent: boolean;
      message: string | null;
      correlationId?: string;
    }
  | {
      kind: 'conflict';
      job: Job;
      requestedStatus: JobStatus;
      message: string;
      correlationId?: string;
    }
  | {
      kind: 'retryable_error';
      job: Job;
      requestedStatus: JobStatus;
      message: string;
      correlationId?: string;
    }
  | {
      kind: 'fatal_error';
      job: Job | null;
      requestedStatus: JobStatus;
      message: string;
      correlationId?: string;
    };

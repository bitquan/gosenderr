import type {JobStatus} from '../types/jobs';

const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['picked_up', 'cancelled'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const canTransitionJobStatus = (currentStatus: JobStatus, nextStatus: JobStatus): boolean => {
  if (currentStatus === nextStatus) {
    return true;
  }
  return ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
};

export const buildTransitionConflictMessage = (currentStatus: JobStatus, nextStatus: JobStatus): string =>
  `Cannot change job from ${currentStatus.replace('_', ' ')} to ${nextStatus.replace('_', ' ')}.`;

export const getAllowedTransitions = (status: JobStatus): readonly JobStatus[] => ALLOWED_TRANSITIONS[status];

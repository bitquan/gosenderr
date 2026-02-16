import type {JobStatus} from './status';

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  open: ['assigned', 'cancelled', 'expired'],
  assigned: ['enroute_pickup', 'arrived_pickup', 'cancelled'],
  enroute_pickup: ['arrived_pickup', 'cancelled'],
  arrived_pickup: ['picked_up', 'cancelled', 'failed'],
  picked_up: ['enroute_dropoff', 'failed'],
  enroute_dropoff: ['arrived_dropoff', 'failed'],
  arrived_dropoff: ['completed', 'disputed', 'failed'],
  completed: [],
  cancelled: [],
  disputed: [],
  expired: [],
  failed: [],
};

export const canTransitionJobStatus = (
  currentStatus: JobStatus,
  nextStatus: JobStatus,
): boolean => {
  if (currentStatus === nextStatus) {
    return true;
  }
  return JOB_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
};

export const getAllowedJobTransitions = (
  currentStatus: JobStatus,
): readonly JobStatus[] => JOB_STATUS_TRANSITIONS[currentStatus];

export const buildJobTransitionConflictMessage = (
  currentStatus: JobStatus,
  nextStatus: JobStatus,
): string =>
  `Cannot change job from ${currentStatus.replace(/_/g, ' ')} to ${nextStatus.replace(/_/g, ' ')}.`;

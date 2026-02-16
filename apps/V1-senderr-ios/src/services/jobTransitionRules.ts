import {
  buildJobTransitionConflictMessage,
  canTransitionJobStatus,
  getAllowedJobTransitions,
  type JobStatus,
} from '@gosenderr/contracts';

export const buildTransitionConflictMessage = (
  currentStatus: JobStatus,
  nextStatus: JobStatus,
): string => buildJobTransitionConflictMessage(currentStatus, nextStatus);

export const getAllowedTransitions = (
  status: JobStatus,
): readonly JobStatus[] => getAllowedJobTransitions(status);

export {canTransitionJobStatus};

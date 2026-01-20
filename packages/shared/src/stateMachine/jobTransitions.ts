import { JobStatus } from '../types/firestore';

/**
 * Define allowed job status transitions for the delivery workflow
 */
export const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  [JobStatus.OPEN]: [JobStatus.ASSIGNED, JobStatus.CANCELLED],
  [JobStatus.ASSIGNED]: [JobStatus.ENROUTE_PICKUP, JobStatus.CANCELLED],
  [JobStatus.ENROUTE_PICKUP]: [JobStatus.ARRIVED_PICKUP, JobStatus.CANCELLED],
  [JobStatus.ARRIVED_PICKUP]: [JobStatus.PICKED_UP, JobStatus.CANCELLED],
  [JobStatus.PICKED_UP]: [JobStatus.ENROUTE_DROPOFF, JobStatus.CANCELLED],
  [JobStatus.ENROUTE_DROPOFF]: [JobStatus.ARRIVED_DROPOFF, JobStatus.CANCELLED],
  [JobStatus.ARRIVED_DROPOFF]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
  [JobStatus.COMPLETED]: [JobStatus.DISPUTED], // Can dispute after completion
  [JobStatus.CANCELLED]: [],
  [JobStatus.DISPUTED]: [], // Terminal state - admin resolves
};

/**
 * Check if a transition from currentStatus to nextStatus is valid
 */
export function canTransition(
  currentStatus: JobStatus,
  nextStatus: JobStatus
): boolean {
  const allowed = allowedTransitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Get all statuses that can follow the current status
 */
export function getNextStatuses(currentStatus: JobStatus): JobStatus[] {
  return allowedTransitions[currentStatus] || [];
}

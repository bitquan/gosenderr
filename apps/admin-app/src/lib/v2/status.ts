import { JobStatus, Job, JobDoc } from './types';

/**
 * Ordered list of job statuses representing the delivery flow
 */
export const JOB_STATUS_ORDER: JobStatus[] = [
  'open',
  'assigned',
  'enroute_pickup',
  'arrived_pickup',
  'picked_up',
  'enroute_dropoff',
  'arrived_dropoff',
  'completed',
];

/**
 * Status flow map - defines which status comes next
 */
export const STATUS_FLOW: Record<JobStatus, JobStatus | null> = {
  open: null, // Only customer creates, courier claims to 'assigned'
  assigned: 'enroute_pickup',
  enroute_pickup: 'arrived_pickup',
  arrived_pickup: 'picked_up',
  picked_up: 'enroute_dropoff',
  enroute_dropoff: 'arrived_dropoff',
  arrived_dropoff: 'completed',
  completed: null,
  cancelled: null,
  disputed: null,
  expired: null,
  failed: null,
};

/**
 * Button labels for each advanceable status
 */
export const STATUS_BUTTON_LABELS: Record<JobStatus, string> = {
  open: '',
  assigned: 'Start to Pickup',
  enroute_pickup: 'Arrived at Pickup',
  arrived_pickup: 'Confirm Pickup',
  picked_up: 'Start to Dropoff',
  enroute_dropoff: 'Arrived at Dropoff',
  arrived_dropoff: 'Complete Delivery',
  completed: '',
  cancelled: '',
  disputed: '',
  expired: '',
  failed: '',
};

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<JobStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  enroute_pickup: 'En Route to Pickup',
  arrived_pickup: 'Arrived at Pickup',
  picked_up: 'Picked Up',
  enroute_dropoff: 'En Route to Dropoff',
  arrived_dropoff: 'Arrived at Dropoff',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  expired: 'Expired',
  failed: 'Failed',
};

/**
 * Status colors for UI
 */
export const STATUS_COLORS: Record<JobStatus, string> = {
  open: '#808080',
  assigned: '#2563eb',
  enroute_pickup: '#7c3aed',
  arrived_pickup: '#a855f7',
  picked_up: '#ea580c',
  enroute_dropoff: '#dc2626',
  arrived_dropoff: '#ef4444',
  completed: '#16a34a',
  cancelled: '#52525b',
  disputed: '#f97316',
  expired: '#9ca3af',
  failed: '#dc2626',
};

/**
 * Get the next status in the delivery flow
 */
export function getNextStatus(currentStatus: JobStatus): JobStatus | null {
  return STATUS_FLOW[currentStatus];
}

/**
 * Check if a courier can advance the job status
 * @param job - The job document
 * @param courierUid - The courier's UID attempting to advance
 * @returns true if the courier is allowed to advance this job
 */
export function canCourierAdvance(job: JobDoc | Job, courierUid: string): boolean {
  // Only assigned courier can advance
  if (job.courierUid !== courierUid) {
    return false;
  }

  // Can't advance if already completed, cancelled, or disputed
  if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'disputed') {
    return false;
  }

  // Can't advance if status is 'open' (should be 'assigned' after claiming)
  if (job.status === 'open') {
    return false;
  }

  // Check if there's a next status
  return getNextStatus(job.status) !== null;
}

/**
 * Check if a customer can view this job
 * @param job - The job document
 * @param customerUid - The customer's UID
 * @returns true if the customer created this job
 */
export function canCustomerView(job: JobDoc | Job, customerUid: string): boolean {
  return job.createdByUid === customerUid;
}

/**
 * Get the current step index in the status order
 */
export function getStatusIndex(status: JobStatus): number {
  return JOB_STATUS_ORDER.indexOf(status);
}

/**
 * Check if a status has been passed (for timeline visualization)
 */
export function isStatusCompleted(targetStatus: JobStatus, currentStatus: JobStatus): boolean {
  const targetIndex = getStatusIndex(targetStatus);
  const currentIndex = getStatusIndex(currentStatus);
  return currentIndex > targetIndex;
}

/**
 * Check if a status is the current one
 */
export function isStatusCurrent(targetStatus: JobStatus, currentStatus: JobStatus): boolean {
  return targetStatus === currentStatus;
}

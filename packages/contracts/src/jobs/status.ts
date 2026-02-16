export type JobStatus =
  | 'open'
  | 'assigned'
  | 'enroute_pickup'
  | 'arrived_pickup'
  | 'picked_up'
  | 'enroute_dropoff'
  | 'arrived_dropoff'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'expired'
  | 'failed';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
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

export const NON_TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  'open',
  'assigned',
  'enroute_pickup',
  'arrived_pickup',
  'picked_up',
  'enroute_dropoff',
  'arrived_dropoff',
] as const;

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  'completed',
  'cancelled',
  'disputed',
  'expired',
  'failed',
] as const;

export const isTerminalJobStatus = (status: JobStatus): boolean =>
  TERMINAL_JOB_STATUSES.includes(status);

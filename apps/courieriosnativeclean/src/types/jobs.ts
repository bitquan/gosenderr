export type JobStatus = 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';

export type Job = {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  notes?: string;
  etaMinutes: number;
  status: JobStatus;
  updatedAt: string;
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  pending: 'accepted',
  accepted: 'picked_up',
  picked_up: 'delivered',
};

import {JOB_STATUS_TRANSITIONS, type JobStatus} from '@gosenderr/contracts';

export type {
  Job,
  JobCourierSnapshot,
  JobLocation,
  JobPaymentStatus,
  JobPhoto,
  JobPricing,
  JobProof,
} from '@gosenderr/contracts';
export {JOB_STATUS_LABELS} from '@gosenderr/contracts';
export type {JobStatus} from '@gosenderr/contracts';

// Legacy helper used by existing UI flows that assume one default forward step.
// This is derived from the canonical transition graph.
export const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  open: JOB_STATUS_TRANSITIONS.open[0],
  assigned: JOB_STATUS_TRANSITIONS.assigned[0],
  enroute_pickup: JOB_STATUS_TRANSITIONS.enroute_pickup[0],
  arrived_pickup: JOB_STATUS_TRANSITIONS.arrived_pickup[0],
  picked_up: JOB_STATUS_TRANSITIONS.picked_up[0],
  enroute_dropoff: JOB_STATUS_TRANSITIONS.enroute_dropoff[0],
  arrived_dropoff: JOB_STATUS_TRANSITIONS.arrived_dropoff[0],
};

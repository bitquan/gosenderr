import type {Job, JobStatus} from '../types/jobs';
import type {JobsSyncState} from '../services/ports/jobsPort';
import type {LocationSnapshot} from '../services/ports/locationPort';

const ARRIVAL_RADIUS_METERS = 120;

export type MapShellState =
  | 'idle'
  | 'offer'
  | 'accepted'
  | 'enroute_pickup'
  | 'arrived_pickup'
  | 'picked_up'
  | 'enroute_dropoff'
  | 'arrived_dropoff'
  | 'proof_required'
  | 'completed'
  | 'offline_reconnect';

export type MapShellPrimaryAction =
  | 'refresh_jobs'
  | 'request_location_permission'
  | 'start_tracking'
  | 'open_job_detail'
  | 'update_status';

export type MapShellOverlayModel = {
  state: MapShellState;
  title: string;
  description: string;
  primaryLabel: string;
  primaryAction: MapShellPrimaryAction;
  nextStatus: JobStatus | null;
  tone: 'neutral' | 'warning' | 'error' | 'success';
};

type DeriveMapShellStateInput = {
  activeJob: Job | null;
  latestJob: Job | null;
  jobsSyncState: JobsSyncState;
  courierLocation: LocationSnapshot | null;
  tracking: boolean;
};

type BuildMapShellOverlayInput = DeriveMapShellStateInput & {
  hasPermission: boolean;
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const distanceMeters = (
  from: {latitude: number; longitude: number},
  to: {latitude: number; longitude: number},
): number => {
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const hasArrived = (
  courierLocation: LocationSnapshot | null,
  targetLocation: Job['pickupLocation'] | undefined,
): boolean => {
  if (!courierLocation || !targetLocation) {
    return false;
  }
  return distanceMeters(courierLocation, targetLocation) <= ARRIVAL_RADIUS_METERS;
};

const requiresProof = (job: Job): boolean => {
  if (!job.notes) {
    return false;
  }
  const notes = job.notes.toLowerCase();
  return notes.includes('proof') || notes.includes('photo') || notes.includes('signature');
};

const isSyncDegraded = (jobsSyncState: JobsSyncState): boolean =>
  jobsSyncState.status === 'reconnecting' ||
  jobsSyncState.status === 'stale' ||
  jobsSyncState.status === 'error';

export const deriveMapShellState = ({
  activeJob,
  latestJob,
  jobsSyncState,
  courierLocation,
  tracking,
}: DeriveMapShellStateInput): MapShellState => {
  if (isSyncDegraded(jobsSyncState)) {
    return 'offline_reconnect';
  }

  const job = activeJob ?? latestJob;
  if (!job || job.status === 'cancelled') {
    return 'idle';
  }

  if (job.status === 'delivered') {
    return 'completed';
  }

  if (job.status === 'pending') {
    return 'offer';
  }

  if (job.status === 'accepted') {
    if (hasArrived(courierLocation, job.pickupLocation)) {
      return 'arrived_pickup';
    }
    if (tracking && courierLocation) {
      return 'enroute_pickup';
    }
    return 'accepted';
  }

  if (job.status === 'picked_up') {
    if (hasArrived(courierLocation, job.dropoffLocation)) {
      if (requiresProof(job)) {
        return 'proof_required';
      }
      return 'arrived_dropoff';
    }
    if (tracking && courierLocation) {
      return 'enroute_dropoff';
    }
    return 'picked_up';
  }

  return 'idle';
};

export const buildMapShellOverlayModel = (
  input: BuildMapShellOverlayInput,
): MapShellOverlayModel => {
  const state = deriveMapShellState(input);

  switch (state) {
    case 'offline_reconnect':
      return {
        state,
        title: 'Connection lost',
        description: 'Live sync is degraded. Retry to recover updates.',
        primaryLabel: 'Retry Sync',
        primaryAction: 'refresh_jobs',
        nextStatus: null,
        tone: 'error',
      };
    case 'idle':
      return {
        state,
        title: 'No active job',
        description: 'You are ready for your next assignment.',
        primaryLabel: 'Refresh Jobs',
        primaryAction: 'refresh_jobs',
        nextStatus: null,
        tone: 'neutral',
      };
    case 'offer':
      return {
        state,
        title: 'New job offer',
        description: 'Accept this job to start pickup workflow.',
        primaryLabel: 'Accept Job',
        primaryAction: 'update_status',
        nextStatus: 'accepted',
        tone: 'warning',
      };
    case 'accepted':
      return {
        state,
        title: 'Job accepted',
        description: input.hasPermission
          ? 'Start live tracking before heading to pickup.'
          : 'Enable location permission to begin pickup route.',
        primaryLabel: input.hasPermission
          ? 'Start Tracking'
          : 'Enable Location',
        primaryAction: input.hasPermission
          ? 'start_tracking'
          : 'request_location_permission',
        nextStatus: null,
        tone: 'neutral',
      };
    case 'enroute_pickup':
      return {
        state,
        title: 'En route to pickup',
        description: 'Review pickup details while you are on the way.',
        primaryLabel: 'Open Pickup Details',
        primaryAction: 'open_job_detail',
        nextStatus: null,
        tone: 'neutral',
      };
    case 'arrived_pickup':
      return {
        state,
        title: 'Arrived at pickup',
        description: 'Confirm pickup to transition into dropoff flow.',
        primaryLabel: 'Confirm Pickup',
        primaryAction: 'update_status',
        nextStatus: 'picked_up',
        tone: 'success',
      };
    case 'picked_up':
      return {
        state,
        title: 'Package picked up',
        description: input.hasPermission
          ? 'Start tracking to unlock en-route dropoff states.'
          : 'Enable location permission to continue dropoff flow.',
        primaryLabel: input.hasPermission
          ? 'Start Tracking'
          : 'Enable Location',
        primaryAction: input.hasPermission
          ? 'start_tracking'
          : 'request_location_permission',
        nextStatus: null,
        tone: 'neutral',
      };
    case 'enroute_dropoff':
      return {
        state,
        title: 'En route to dropoff',
        description: 'Review dropoff details before delivery completion.',
        primaryLabel: 'Open Dropoff Details',
        primaryAction: 'open_job_detail',
        nextStatus: null,
        tone: 'neutral',
      };
    case 'arrived_dropoff':
      return {
        state,
        title: 'Arrived at dropoff',
        description: 'Complete delivery to close this job.',
        primaryLabel: 'Complete Delivery',
        primaryAction: 'update_status',
        nextStatus: 'delivered',
        tone: 'success',
      };
    case 'proof_required':
      return {
        state,
        title: 'Proof required',
        description: 'Capture required proof, then complete the delivery.',
        primaryLabel: 'Complete Delivery',
        primaryAction: 'update_status',
        nextStatus: 'delivered',
        tone: 'warning',
      };
    case 'completed':
      return {
        state,
        title: 'Delivery completed',
        description: 'This job is closed. Pull latest jobs for next work.',
        primaryLabel: 'Refresh Jobs',
        primaryAction: 'refresh_jobs',
        nextStatus: null,
        tone: 'success',
      };
    default:
      return {
        state: 'idle',
        title: 'No active job',
        description: 'You are ready for your next assignment.',
        primaryLabel: 'Refresh Jobs',
        primaryAction: 'refresh_jobs',
        nextStatus: null,
        tone: 'neutral',
      };
  }
};

export type JobStatus =
  | 'open'
  | 'pending'
  | 'assigned'
  | 'in_progress'
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

export interface JobDoc {
  createdByUid: string;
  courierUid: string | null;
  courierId?: string | null;
  agreedFee: number | null;
  status: JobStatus;
  statusDetail?: JobStatus;
  pickup: { lat: number; lng: number; label?: string; address?: string };
  dropoff: { lat: number; lng: number; label?: string; address?: string };
  package?: { size?: string; notes?: string };
  acceptedAt?: any;
  completedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface Job extends JobDoc {
  id: string;
}

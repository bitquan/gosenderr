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
  pickup: {
    lat: number;
    lng: number;
    label?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    label?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
  };
  customerName?: string;
  customerPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  senderName?: string;
  senderPhone?: string;
  package?: { size?: string; notes?: string };
  photos?: Array<{
    url?: string;
    thumbnailURL?: string;
  }>;
  acceptedAt?: any;
  completedAt?: any;
  deliveryProof?: {
    photoId?: string;
    photoUrl?: string;
    photoDataUrl?: string | null;
    url?: string | null;
    location?: { lat: number; lng: number } | null;
    accuracy?: number | null;
    timestamp?: any;
    notes?: string | null;
    createdAt?: any;
  };
  pickupProof?: {
    photoId?: string;
    photoUrl?: string;
    photoDataUrl?: string | null;
    url?: string | null;
    location?: { lat: number; lng: number } | null;
    accuracy?: number | null;
    timestamp?: any;
    notes?: string | null;
    createdAt?: any;
  };
  dropoffProof?: {
    photoId?: string;
    photoUrl?: string;
    photoDataUrl?: string | null;
    url?: string | null;
    location?: { lat: number; lng: number } | null;
    accuracy?: number | null;
    timestamp?: any;
    notes?: string | null;
    createdAt?: any;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface Job extends JobDoc {
  id: string;
}

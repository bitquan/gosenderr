import type {JobStatus} from './status';

export type JobPaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'paid';

export type JobLocation = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type JobProof = {
  url: string;
  location: {
    latitude: number;
    longitude: number;
  };
  accuracy: number;
  timestamp: string;
};

export type JobPhoto = {
  url: string;
  path?: string;
  uploadedAt?: string;
  uploadedBy?: string;
};

export type JobPricing = {
  courierRate: number;
  platformFee: number;
  totalAmount: number;
};

export type JobCourierSnapshot = {
  displayName?: string;
  transportMode?: string;
};

export type Job = {
  id: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLocation?: JobLocation;
  dropoffLocation?: JobLocation;
  notes?: string;
  etaMinutes: number;
  status: JobStatus;
  paymentStatus?: JobPaymentStatus;
  photos?: JobPhoto[];
  pickupProof?: JobProof;
  dropoffProof?: JobProof;
  pricing?: JobPricing;
  courierSnapshot?: JobCourierSnapshot;
  updatedAt: string;
};

import { Timestamp } from 'firebase/firestore';

// Re-export core types from lib/v2/types for convenience
export type { TransportMode, UserRole } from '@/lib/v2/types';

// Job statuses - full delivery loop
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

// Location data
export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

// Package sizes
export type PackageSize = 'small' | 'medium' | 'large' | 'xl';

// Package flags for handling requirements
export interface PackageFlags {
  needsSuvVan?: boolean;
  fragile?: boolean;
  heavyTwoPerson?: boolean;
  oversized?: boolean;
  stairs?: boolean;
}

// Package information
export interface JobPackage {
  size: PackageSize;
  flags?: PackageFlags;
  notes?: string;
}

// Job photo
export interface JobPhoto {
  url: string;
  path: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

export interface JobProofPhoto {
  url: string;
  location: { lat: number; lng: number };
  accuracy: number;
  timestamp: Timestamp;
}

// Courier snapshot in job
export interface CourierSnapshot {
  displayName?: string;
  transportMode?: string;
}

// Job document
export interface Job {
  id: string;
  createdByUid: string;
  courierUid: string | null;
  agreedFee: number | null;
  status: JobStatus;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package?: JobPackage;  // Optional for backward compatibility
  photos?: JobPhoto[];  // Optional for backward compatibility
  pickupProof?: JobProofPhoto;
  dropoffProof?: JobProofPhoto;
  pricing?: {
    courierRate: number;
    platformFee: number;
    totalAmount: number;
  };
  paymentStatus?: "pending" | "authorized" | "captured" | "refunded";
  paymentIntentId?: string | null;
  courierSnapshot?: CourierSnapshot;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Viewer context for privacy
export interface JobViewer {
  uid: string;
  role: 'customer' | 'courier';
}

// Visibility rules result
export interface JobVisibility {
  canSeeExactAddresses: boolean;
  canSeePhotos: boolean;
  canSeeCustomerInfo: boolean;
}

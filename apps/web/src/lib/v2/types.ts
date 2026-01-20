import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'customer' | 'courier';
export type TransportMode = 'walk' | 'scooter' | 'car';

// Courier-specific data
export interface RateCard {
  baseFee: number;          // required base fee per delivery
  perMile: number;          // required cost per job mile (pickup -> dropoff)
  minimumFee?: number;      // optional minimum charge
  pickupPerMile?: number;   // optional extra cost for courier -> pickup distance ("deadhead")
  perMinute?: number;       // optional time-based pricing
  maxPickupMiles?: number;  // optional radius rule (courier -> pickup distance limit)
  maxJobMiles?: number;     // optional job distance rule (pickup -> dropoff limit)
  maxRadiusMiles?: number;  // optional discovery radius (customer search radius)
  updatedAt?: Timestamp;    // timestamp of last rate card update
}

export interface CourierData {
  isOnline: boolean;
  transportMode: TransportMode;
  rateCard: RateCard;
}

export interface CourierLocation {
  lat: number;
  lng: number;
  heading?: number;
  geohash?: string; // for geo-queries (precision 6)
  updatedAt: Timestamp;
}

// User document
export interface UserDoc {
  role: UserRole;
  phone?: string;
  displayName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Courier-only fields
  courier?: CourierData;
  location?: CourierLocation;
}

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
  | 'expired'
  | 'failed';

// Location data
export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface CourierSnapshot {
  displayName?: string;
  transportMode?: TransportMode;
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
export interface PackageInfo {
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

// Job document
export interface JobDoc {
  createdByUid: string;
  courierUid: string | null;
  agreedFee: number | null;
  status: JobStatus;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package?: PackageInfo;  // Optional for backward compatibility
  photos?: JobPhoto[];  // Optional for backward compatibility
  courierSnapshot?: CourierSnapshot;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Client-side job with ID
export interface Job extends JobDoc {
  id: string;
}

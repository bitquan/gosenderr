import { Timestamp } from 'firebase/firestore';

export type UserRole = 'customer' | 'courier' | 'admin';
export type TransportMode = 'walk' | 'scooter' | 'car';

export interface RateCard {
  baseFee: number;
  perMile: number;
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
  updatedAt: Timestamp;
}

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

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface CourierSnapshot {
  displayName?: string;
  transportMode?: TransportMode;
}

export enum JobStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  ENROUTE_PICKUP = 'enroute_pickup',
  ARRIVED_PICKUP = 'arrived_pickup',
  PICKED_UP = 'picked_up',
  ENROUTE_DROPOFF = 'enroute_dropoff',
  ARRIVED_DROPOFF = 'arrived_dropoff',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface JobDoc {
  createdByUid: string;
  courierUid: string | null;
  agreedFee: number | null;
  status: JobStatus;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  courierSnapshot?: CourierSnapshot;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

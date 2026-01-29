import { Timestamp } from "firebase/firestore";
import { JobStatus as SharedJobStatus } from "@gosenderr/shared";

// Re-export types from shared package
export type {
  TransportMode,
  PackageRateCard,
  FoodRateCard,
  RateCard,
  EquipmentItem,
  CourierEquipment,
  CourierCapabilities,
  CourierStatus,
  VehicleType,
  VehicleDetails,
  WorkModes,
  CourierDocuments,
  CourierProfile,
  CourierData,
  CourierLocation,
  UserDoc,
  ItemCategory,
  ItemCondition,
  ItemStatus,
  FoodTemperature,
  ItemLocation,
  ItemDetails,
  FoodDetails,
  ItemDoc,
  GeoPoint,
  CourierSnapshot,
  JobType,
  PhotoMetadata,
  JobPhoto as SharedJobPhoto,
  CourierLocationUpdate,
  JobPricing,
  PaymentStatus,
  FoodDeliveryDetails,
  JobTimeline,
  CustomerConfirmation,
  JobStats,
  DeliveryJobDoc,
  RatingRole,
  RatingCategories,
  RatingDoc,
  DisputeStatus,
  DisputeDoc,
} from "@gosenderr/shared";

// User roles - backward compatible with 'customer' and forward compatible with 'buyer'
export type UserRole =
  | "customer"
  | "courier"
  | "admin"
  | "buyer"
  | "seller"
  | "runner"
  | "vendor";

// Re-export JobStatus enum values as string union type for backward compatibility
export type JobStatus =
  | "open"
  | "assigned"
  | "enroute_pickup"
  | "arrived_pickup"
  | "picked_up"
  | "enroute_dropoff"
  | "arrived_dropoff"
  | "completed"
  | "cancelled"
  | "disputed"
  | "expired"
  | "failed";

export { SharedJobStatus };

// Additional web-specific types
export type PackageSize = "small" | "medium" | "large" | "xl";

export interface PackageFlags {
  needsSuvVan?: boolean;
  fragile?: boolean;
  heavyTwoPerson?: boolean;
  oversized?: boolean;
  stairs?: boolean;
}

export interface PackageInfo {
  size: PackageSize;
  flags?: PackageFlags;
  notes?: string;
}

// Legacy job photo with path field
export interface JobPhoto {
  url: string;
  path: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

// Legacy job document for backward compatibility
export interface JobDoc {
  createdByUid: string;
  courierUid: string | null;
  agreedFee: number | null;
  status: JobStatus;
  pickup: { lat: number; lng: number; label?: string };
  dropoff: { lat: number; lng: number; label?: string };
  package?: PackageInfo;
  photos?: JobPhoto[];
  courierSnapshot?: { displayName?: string; transportMode?: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Client-side job with ID
export interface Job extends JobDoc {
  id: string;
}

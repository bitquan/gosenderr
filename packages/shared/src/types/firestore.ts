import { Timestamp } from 'firebase/firestore';

// ==================== USER ROLES ====================
export type UserRole = 'buyer' | 'seller' | 'courier' | 'admin';
export type TransportMode = 'walk' | 'scooter' | 'car';

// Legacy support
export type LegacyUserRole = 'customer' | 'courier' | 'admin';

// ==================== RATE CARDS ====================

// Package delivery rate card
export interface PackageRateCard {
  baseFare: number; // Min: $3.00
  perMile: number; // Min: $0.50
  perMinute: number; // Min: $0.10
  optionalFees: Array<{ name: string; amount: number }>;
}

// Food delivery rate card
export interface FoodRateCard {
  baseFare: number; // Min: $2.50
  perMile: number; // Min: $0.75
  restaurantWaitPay: number; // Min: $0.15/min
  peakHours?: Array<{
    days: string[]; // ["friday", "saturday"]
    startTime: string; // "18:00"
    endTime: string; // "21:00"
    multiplier: number; // 1.5 = 50% boost
  }>;
  optionalFees: Array<{ name: string; amount: number }>;
}

// Legacy rate card for backward compatibility
export interface RateCard {
  baseFee: number;
  perMile: number;
  perMinute?: number;
  pickupPerMile?: number;
  minimumFee?: number;
  maxPickupMiles?: number;
  maxJobMiles?: number;
  maxRadiusMiles?: number;
  updatedAt?: Timestamp;
}

// ==================== EQUIPMENT & BADGES ====================

export interface EquipmentItem {
  has: boolean;
  photoUrl?: string;
  approved: boolean;
  approvedAt?: Timestamp;
  rejectedReason?: string;
}

export interface CourierEquipment {
  // Food delivery equipment
  insulated_bag: EquipmentItem;
  cooler: EquipmentItem;
  hot_bag: EquipmentItem;
  drink_carrier: EquipmentItem;
  // Package delivery equipment
  dolly: EquipmentItem;
  straps: EquipmentItem;
  furniture_blankets: EquipmentItem;
}

export interface CourierCapabilities {
  canDeliverHot: boolean;
  canDeliverCold: boolean;
  canDeliverFrozen: boolean;
  canDeliverDrinks: boolean;
  canDeliverHeavy: boolean;
  canDeliverFurniture: boolean;
}

// ==================== COURIER PROFILE ====================

export type CourierStatus = 'pending_docs' | 'pending_review' | 'active' | 'suspended' | 'banned';
export type VehicleType = 'foot' | 'bike' | 'scooter' | 'motorcycle' | 'car' | 'van' | 'truck';

export interface VehicleDetails {
  make: string;
  model: string;
  color: string;
  licensePlate: string;
}

export interface WorkModes {
  packagesEnabled: boolean;
  foodEnabled: boolean;
}

export interface CourierDocuments {
  idPhotoUrl?: string;
  insurancePhotoUrl?: string;
  registrationPhotoUrl?: string;
  adminReviewStatus: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string; // admin uid
}

export interface CourierProfile {
  status: CourierStatus;
  vehicleType: VehicleType;
  vehicleDetails?: VehicleDetails;
  workModes: WorkModes;
  packageRateCard: PackageRateCard;
  foodRateCard: FoodRateCard;
  equipment: CourierEquipment;
  capabilities: CourierCapabilities;
  documents: CourierDocuments;
  serviceRadius: number; // miles
  currentLocation?: { lat: number; lng: number };
}

// Legacy courier data for backward compatibility
export interface CourierData {
  isOnline: boolean;
  transportMode: TransportMode;
  rateCard: RateCard;
}

export interface CourierLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number; // mph
  accuracy?: number; // meters
  updatedAt: Timestamp;
}

// ==================== USER DOCUMENT ====================

export interface UserDoc {
  role: UserRole;
  email?: string;
  phone?: string;
  displayName?: string;
  profilePhotoUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Ratings (as customer or courier)
  averageRating: number; // 0-5
  totalRatings: number;
  totalDeliveries: number;
  
  // Courier-specific (legacy)
  courier?: CourierData;
  location?: CourierLocation;
  
  // New courier profile
  courierProfile?: CourierProfile;
}

// ==================== MARKETPLACE ITEMS ====================

export type ItemCategory = 'electronics' | 'furniture' | 'clothing' | 'food' | 'other';
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ItemStatus = 'available' | 'pending' | 'sold';
export type FoodTemperature = 'hot' | 'cold' | 'frozen' | 'room_temp';

export interface ItemLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface ItemDetails {
  weight?: number; // lbs (pounds)
  dimensions?: {
    length: number; // inches
    width: number; // inches
    height: number; // inches
  };
  requiresHelp: boolean; // heavy/bulky items
}

export interface FoodDetails {
  temperature: FoodTemperature;
  pickupInstructions: string;
  pickupPhotoUrl?: string;
  requiresCooler?: boolean;
  requiresHotBag?: boolean;
  requiresDrinkCarrier?: boolean;
}

export interface ItemDoc {
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: ItemCategory;
  condition: ItemCondition;
  photos: string[]; // URLs
  pickupLocation: ItemLocation;
  itemDetails: ItemDetails;
  isFoodItem: boolean;
  foodDetails?: FoodDetails;
  status: ItemStatus;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// ==================== LOCATION DATA ====================

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface CourierSnapshot {
  displayName?: string;
  transportMode?: TransportMode;
}

// ==================== JOB STATUS ====================

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
  DISPUTED = 'disputed',
}

// ==================== DELIVERY JOBS ====================

export type JobType = 'package' | 'food';

export interface PhotoMetadata {
  gpsVerified: boolean;
  accuracy: number; // GPS accuracy in meters
  timestamp: Timestamp;
  location: { lat: number; lng: number };
}

export interface JobPhoto {
  url: string;
  metadata: PhotoMetadata;
}

export interface CourierLocationUpdate {
  lat: number;
  lng: number;
  heading: number; // 0-360
  speed: number; // mph
  accuracy: number; // meters
  updatedAt: Timestamp;
}

export interface JobPricing {
  baseFare: number;
  perMileCharge: number;
  timeCharge?: number; // For packages
  restaurantWaitCharge?: number; // For food
  peakMultiplier?: number; // For food (1.0 - 2.0)
  optionalFees: Array<{ name: string; amount: number }>;
  courierEarnings: number; // 100% to courier
  platformFee: number; // $2.50 for packages, $1.50 for food
  totalCustomerCharge: number;
}

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded';

export interface FoodDeliveryDetails {
  temperature: FoodTemperature;
  pickupInstructions: string;
  pickupPhotoUrl?: string;
  mustDeliverBy: Timestamp; // 60 min from order creation
  autoCancelAt: Timestamp;
  autoCancelled: boolean;
  restaurantWaitStarted?: Timestamp;
  restaurantWaitEnded?: Timestamp;
  actualWaitTime?: number; // minutes
  specialInstructions?: string;
}

export interface JobTimeline {
  orderPlaced: Timestamp;
  courierAssigned?: {
    timestamp: Timestamp;
    courierId: string;
    courierName: string;
  };
  courierEnRoute?: {
    timestamp: Timestamp;
    distanceToPickup: number;
  };
  pickedUp?: {
    timestamp: Timestamp;
    gpsLocation: { lat: number; lng: number };
    photoUrl: string;
    photoMetadata: PhotoMetadata;
  };
  inTransit?: {
    startTime: Timestamp;
    distanceToDropoff: number;
    estimatedArrival: Timestamp;
  };
  delivered?: {
    timestamp: Timestamp;
    gpsLocation: { lat: number; lng: number };
    photoUrl: string;
    photoMetadata: PhotoMetadata;
  };
}

export interface CustomerConfirmation {
  received: boolean;
  confirmedAt?: Timestamp;
  disputeReason?: string;
  deadline: Timestamp; // 72 hours from delivery
  autoConfirmed: boolean;
}

export interface JobStats {
  totalDuration: number; // minutes
  pickupDuration: number; // minutes
  transitDuration: number; // minutes
  distanceTraveled: number; // miles
}

export interface DeliveryJobDoc {
  itemId: string;
  customerId: string;
  sellerId: string;
  courierId?: string;
  jobType: JobType;
  priority: number; // Food = 100, Package = 50
  status: JobStatus;
  
  pickup: {
    lat: number;
    lng: number;
    address: string;
    contactPhone: string;
  };
  
  dropoff: {
    lat: number;
    lng: number;
    address: string;
    contactPhone: string;
  };
  
  estimatedDistance: number;
  estimatedDuration: number;
  
  courierLocation?: CourierLocationUpdate;
  pricing: JobPricing;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string;
  
  foodDeliveryDetails?: FoodDeliveryDetails;
  timeline: JobTimeline;
  customerConfirmation: CustomerConfirmation;
  stats?: JobStats;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  expiresAt?: Timestamp;
}

// Legacy job doc for backward compatibility
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

// ==================== RATINGS ====================

export type RatingRole = 'customer_to_courier' | 'courier_to_customer';

export interface RatingCategories {
  professionalism?: number; // 1-5
  timeliness?: number; // 1-5
  communication?: number; // 1-5
  care?: number; // 1-5
}

export interface RatingDoc {
  deliveryJobId: string;
  fromUserId: string;
  toUserId: string;
  role: RatingRole;
  stars: number; // 1-5
  review?: string;
  categories?: RatingCategories;
  createdAt: Timestamp;
}

// ==================== DISPUTES ====================

export type DisputeStatus = 'open' | 'investigating' | 'resolved';

export interface DisputeDoc {
  deliveryJobId: string;
  reportedBy: string;
  reportedAgainst: string;
  reason: string;
  evidence: string[]; // photo URLs
  status: DisputeStatus;
  
  // Admin review
  adminNotes?: string;
  resolution?: string;
  resolvedBy?: string; // admin uid
  resolvedAt?: Timestamp;
  
  // Outcome
  refundIssued: boolean;
  refundAmount?: number;
  userWarned?: string; // uid
  userBanned?: string; // uid
  
  createdAt: Timestamp;
}

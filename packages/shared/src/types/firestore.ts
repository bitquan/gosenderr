import { Timestamp } from "firebase/firestore";

// ==================== USER ROLES ====================
export type UserRole =
  | "buyer"
  | "seller"
  | "courier"
  | "package_runner"
  | "admin"
  | "customer" // Legacy: alias for buyer
  | "vendor"; // Legacy: alias for seller
export type TransportMode = "walk" | "bike" | "scooter" | "car";

// Legacy support
export type LegacyUserRole = "customer" | "courier" | "admin";

// ==================== RATE CARDS ====================

// Package delivery rate card
export interface PackageRateCard {
  baseFare: number; // Min: $3.00
  perMile: number; // Min: $0.50
  perMinute: number; // Min: $0.10
  maxPickupDistanceMiles?: number;
  maxDeliveryDistanceMiles?: number;
  optionalFees: Array<{ name: string; amount: number }>;
}

// Food delivery rate card
export interface FoodRateCard {
  baseFare: number; // Min: $2.50
  perMile: number; // Min: $0.75
  restaurantWaitPay: number; // Min: $0.15/min
  maxPickupDistanceMiles?: number;
  maxDeliveryDistanceMiles?: number;
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

export type CourierStatus =
  | "pending_docs"
  | "pending_review"
  | "active"
  | "suspended"
  | "banned";
export type VehicleType =
  | "foot"
  | "bike"
  | "scooter"
  | "motorcycle"
  | "car"
  | "van"
  | "truck";

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
  adminReviewStatus: "pending" | "approved" | "rejected";
  adminNotes?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string; // admin uid
}

export interface CourierProfile {
  status: CourierStatus;
  isOnline?: boolean;
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
  stripeConnectAccountId?: string;
  // Runtime stats (optional)
  todayJobs?: number;
  completedJobs?: number;
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

  // Package runner profile
  packageRunnerProfile?: PackageRunnerProfile;
}

// ==================== MARKETPLACE ITEMS ====================

export type ItemCategory =
  | "electronics"
  | "furniture"
  | "clothing"
  | "food"
  | "other";
export type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor";
export type ItemStatus = "available" | "pending" | "sold";
export type FoodTemperature = "hot" | "cold" | "frozen" | "room_temp";

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
  deliveryMethods?: Array<"delivery" | "pickup">; // Delivery options (can select both)
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
  OPEN = "open",
  ASSIGNED = "assigned",
  ENROUTE_PICKUP = "enroute_pickup",
  ARRIVED_PICKUP = "arrived_pickup",
  PICKED_UP = "picked_up",
  ENROUTE_DROPOFF = "enroute_dropoff",
  ARRIVED_DROPOFF = "arrived_dropoff",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DISPUTED = "disputed",
}

// ==================== DELIVERY JOBS ====================

export type JobType = "package" | "food";

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

export type PaymentStatus = "pending" | "authorized" | "captured" | "refunded";

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

  // Route support
  deliveryType: DeliveryType;
  routeId?: string;
  routePosition?: number;
  scheduledDate?: Timestamp;
  routePricing?: {
    customerPaid: number;
    courierEarnsIfSolo: number;
    routeDiscount: number;
  };

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

export type RatingRole = "customer_to_courier" | "courier_to_customer";

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

export type DisputeStatus = "open" | "investigating" | "resolved";

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

// ==================== FEATURE FLAGS ====================

export interface SenderrplaceFeatureFlags {
  marketplace_v2: boolean;
  seller_portal_v2: boolean;
  listing_create_v1: boolean;
  checkout_v2: boolean;
  messaging_v1: boolean;
}

export interface FeatureFlags {
  marketplace: {
    enabled: boolean;
    itemListings: boolean;
    combinedPayments: boolean;
    courierOffers: boolean;
  };

  delivery: {
    onDemand: boolean;
    routes: boolean;
    longRoutes: boolean;
    longHaul: boolean;
  };

  courier: {
    rateCards: boolean;
    equipmentBadges: boolean;
    workModes: boolean;
  };

  seller: {
    stripeConnect: boolean;
    multiplePhotos: boolean;
    foodListings: boolean;
  };

  customer: {
    liveTracking: boolean;
    proofPhotos: boolean;
    routeDelivery: boolean;
    packageShipping: boolean;
  };

  packageRunner: {
    enabled: boolean;
    hubNetwork: boolean;
    packageTracking: boolean;
  };

  admin: {
    courierApproval: boolean;
    equipmentReview: boolean;
    disputeManagement: boolean;
    analytics: boolean;
    featureFlagsControl: boolean;
    webPortalEnabled: boolean;
    systemLogs: boolean;
    firebaseExplorer: boolean;
  };

  advanced: {
    pushNotifications: boolean;
    ratingEnforcement: boolean;
    autoCancel: boolean;
    refunds: boolean;
  };

  ui: {
    modernStyling: boolean;
    darkMode: boolean;
    animations: boolean;
  };

  senderrplace?: SenderrplaceFeatureFlags;
}

// ==================== ROUTES (LOCAL BATCHED DELIVERIES) ====================

export type RouteStatus =
  | "building"
  | "available"
  | "claimed"
  | "in_progress"
  | "completed"
  | "cancelled";
export type DeliveryType = "on_demand" | "route" | "long_route";

export interface RouteStop {
  jobId: string;
  sequence: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  estimatedArrival: Timestamp;
  jobType: JobType;
  specialRequirements?: string[];
  completed: boolean;
  completedAt?: Timestamp;
}

export interface RouteDoc {
  routeId: string;
  type: "local";
  status: RouteStatus;

  scheduledDate: Timestamp;
  createdAt: Timestamp;

  area: {
    name: string;
    centerLat: number;
    centerLng: number;
    radiusMiles: number;
  };

  jobIds: string[];
  totalJobs: number;

  optimizedStops: RouteStop[];

  totalDistance: number;
  estimatedDuration: number;

  pricing: {
    courierEarnings: number;
    platformFees: number;
    totalCustomerPaid: number;
  };

  courierId?: string;
  courierName?: string;
  vehicleType?: string;
  claimedAt?: Timestamp;

  completedJobs: number;
  currentStopIndex: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  requiredEquipment: string[];
  vehicleType_required: "any" | "car" | "van" | "truck";
}

// ==================== LONG ROUTES (REGIONAL 50-200 MILES) ====================

export interface LongRouteDoc {
  routeId: string;
  type: "long";
  status: RouteStatus;

  scheduledDate: Timestamp;
  createdAt: Timestamp;

  originCity: {
    name: string;
    state: string;
    location: { lat: number; lng: number };
  };

  destinationCity: {
    name: string;
    state: string;
    location: { lat: number; lng: number };
  };

  distance: number;
  estimatedDuration: number;

  jobIds: string[];
  totalJobs: number;

  pricing: {
    courierEarnings: number;
    platformFees: number;
    totalCustomerPaid: number;
  };

  courierId?: string;
  courierName?: string;
  claimedAt?: Timestamp;

  startedAt?: Timestamp;
  completedAt?: Timestamp;

  requiredEquipment: string[];
  vehicleType: string;
}

// ==================== PACKAGE RUNNER PROFILE ====================

export type PackageRunnerStatus =
  | "pending_docs"
  | "pending_review"
  | "active"
  | "suspended";
export type RunnerVehicleType = "cargo_van" | "sprinter" | "box_truck";

export interface CommercialInsurance {
  photoUrl: string;
  policyNumber: string;
  carrier: string;
  coverageAmount: number;
  approved: boolean;
  expiresAt: Timestamp;
}

export interface PreferredRoute {
  fromHubId: string;
  toHubId: string;
  frequency: "daily" | "weekly" | "on_demand";
  daysAvailable: string[];
}

export interface PackageRunnerProfile {
  status: PackageRunnerStatus;

  vehicleType: RunnerVehicleType;
  vehicleCapacity: number;
  maxWeight: number;
  vehicleDetails: {
    year: string;
    make: string;
    model: string;
    licensePlate: string;
    vin: string;
  };

  commercialInsurance: CommercialInsurance;

  dotNumber?: string;
  mcNumber?: string;

  preferredRoutes: PreferredRoute[];

  homeHub: {
    hubId: string;
    name: string;
    location: { lat: number; lng: number };
  };

  totalRuns: number;
  totalPackages: number;
  totalMiles: number;
  totalEarnings: number;
  averageRating: number;
  onTimePercentage: number;

  currentRouteId?: string;
  availableForRuns: boolean;

  stripeConnectAccountId: string;
}

// ==================== HUBS ====================

export type HubType = "major" | "regional";

export interface HubDoc {
  hubId: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  city: string;
  state: string;
  timezone: string;

  type: HubType;

  operatingHours: "24/7" | { open: string; close: string };
  amenities: string[];
  parkingInstructions: string;
  transferAreaDescription: string;

  hasLockers: boolean;
  lockerProvider?: string;
  lockerAccessInfo?: string;

  outboundRoutes: string[];
  inboundRoutes: string[];

  dailyPackageVolume: number;
  activeRunners: number;

  emergencyContact?: string;

  createdAt: Timestamp;
  isActive: boolean;
}

// ==================== LONG HAUL ROUTES (INTERSTATE) ====================

export type LongHaulStatus =
  | "building"
  | "available"
  | "claimed"
  | "in_transit"
  | "completed";
export type RouteFrequency = "daily" | "weekly" | "on_demand";

export interface LongHaulRouteDoc {
  routeId: string;
  type: "long_haul";
  status: LongHaulStatus;

  originHub: {
    hubId: string;
    name: string;
    location: { lat: number; lng: number; address: string };
    timezone: string;
  };

  destinationHub: {
    hubId: string;
    name: string;
    location: { lat: number; lng: number; address: string };
    timezone: string;
  };

  distance: number;
  estimatedDuration: number;

  frequency: RouteFrequency;
  scheduledDeparture: Timestamp;
  scheduledArrival: Timestamp;

  runnerId?: string;
  runnerName?: string;
  runnerVehicleType?: RunnerVehicleType;
  claimedAt?: Timestamp;

  packageIds: string[];
  packageCount: number;
  totalWeight: number;
  totalVolume: number;

  pricing: {
    runnerEarnings: number;
    platformFees: number;
    totalCustomerPaid: number;
  };

  currentLocation?: { lat: number; lng: number; updatedAt: Timestamp };
  departedAt?: Timestamp;
  arrivedAt?: Timestamp;

  nextRouteId?: string;
  previousRouteId?: string;

  createdAt: Timestamp;
}

// ==================== PACKAGES (INTERSTATE SHIPMENTS) ====================

export type ServiceLevel = "standard" | "express" | "priority";
export type PackageStatus =
  | "pickup_pending"
  | "at_origin_hub"
  | "in_transit"
  | "at_destination_hub"
  | "out_for_delivery"
  | "delivered";
export type LegType =
  | "local_pickup"
  | "long_haul"
  | "hub_transfer"
  | "local_delivery";
export type LegStatus = "pending" | "in_progress" | "completed";
export type ScanType =
  | "picked_up"
  | "hub_arrival"
  | "hub_departure"
  | "hub_transfer"
  | "delivered";

export interface PackageJourneyLeg {
  legNumber: number;
  type: LegType;

  jobId?: string;
  courierId?: string;

  routeId?: string;
  runnerId?: string;
  fromHub?: string;
  toHub?: string;

  hubId?: string;
  transferredAt?: Timestamp;

  status: LegStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface PackageScan {
  type: ScanType;
  location: string;
  hubId?: string;
  timestamp: Timestamp;
  scannedBy: string;
  photoUrl?: string;
}

export interface PackageDoc {
  packageId: string;
  trackingNumber: string;

  senderId: string;
  recipientId: string;

  origin: {
    address: string;
    location: { lat: number; lng: number };
    hubId: string;
    hubDistance: number;
  };

  destination: {
    address: string;
    location: { lat: number; lng: number };
    hubId: string;
    hubDistance: number;
  };

  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  volume: number;
  declaredValue: number;
  fragile: boolean;

  serviceLevel: ServiceLevel;
  estimatedDelivery: Timestamp;

  journey: PackageJourneyLeg[];

  pricing: {
    customerPaid: number;
    breakdown: {
      localPickup: number;
      longHaulLegs: number[];
      localDelivery: number;
      platformFee: number;
    };
  };

  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string;

  currentStatus: PackageStatus;
  currentLocation?: { lat: number; lng: number; updatedAt: Timestamp };
  currentLeg: number;

  scans: PackageScan[];

  createdAt: Timestamp;
  deliveredAt?: Timestamp;
}

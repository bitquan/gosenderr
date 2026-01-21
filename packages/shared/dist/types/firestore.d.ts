import { Timestamp } from 'firebase/firestore';
export type UserRole = 'buyer' | 'seller' | 'courier' | 'admin';
export type TransportMode = 'walk' | 'bike' | 'scooter' | 'car';
export type LegacyUserRole = 'customer' | 'courier' | 'admin';
export interface PackageRateCard {
    baseFare: number;
    perMile: number;
    perMinute: number;
    optionalFees: Array<{
        name: string;
        amount: number;
    }>;
}
export interface FoodRateCard {
    baseFare: number;
    perMile: number;
    restaurantWaitPay: number;
    peakHours?: Array<{
        days: string[];
        startTime: string;
        endTime: string;
        multiplier: number;
    }>;
    optionalFees: Array<{
        name: string;
        amount: number;
    }>;
}
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
export interface EquipmentItem {
    has: boolean;
    photoUrl?: string;
    approved: boolean;
    approvedAt?: Timestamp;
    rejectedReason?: string;
}
export interface CourierEquipment {
    insulated_bag: EquipmentItem;
    cooler: EquipmentItem;
    hot_bag: EquipmentItem;
    drink_carrier: EquipmentItem;
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
    reviewedBy?: string;
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
    serviceRadius: number;
    currentLocation?: {
        lat: number;
        lng: number;
    };
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
    speed?: number;
    accuracy?: number;
    updatedAt: Timestamp;
}
export interface UserDoc {
    role: UserRole;
    email?: string;
    phone?: string;
    displayName?: string;
    profilePhotoUrl?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    averageRating: number;
    totalRatings: number;
    totalDeliveries: number;
    courier?: CourierData;
    location?: CourierLocation;
    courierProfile?: CourierProfile;
    stripeConnectAccountId?: string;
    stripeConnectStatus?: 'pending' | 'active' | 'restricted';
    stripeConnectOnboardingComplete?: boolean;
}
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
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    requiresHelp: boolean;
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
    photos: string[];
    pickupLocation: ItemLocation;
    itemDetails: ItemDetails;
    isFoodItem: boolean;
    foodDetails?: FoodDetails;
    status: ItemStatus;
    createdAt: Timestamp;
    expiresAt?: Timestamp;
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
export declare enum JobStatus {
    OPEN = "open",
    ASSIGNED = "assigned",
    ENROUTE_PICKUP = "enroute_pickup",
    ARRIVED_PICKUP = "arrived_pickup",
    PICKED_UP = "picked_up",
    ENROUTE_DROPOFF = "enroute_dropoff",
    ARRIVED_DROPOFF = "arrived_dropoff",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DISPUTED = "disputed"
}
export type JobType = 'package' | 'food';
export interface PhotoMetadata {
    gpsVerified: boolean;
    accuracy: number;
    timestamp: Timestamp;
    location: {
        lat: number;
        lng: number;
    };
}
export interface JobPhoto {
    url: string;
    metadata: PhotoMetadata;
}
export interface CourierLocationUpdate {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    accuracy: number;
    updatedAt: Timestamp;
}
export interface JobPricing {
    baseFare: number;
    perMileCharge: number;
    timeCharge?: number;
    restaurantWaitCharge?: number;
    peakMultiplier?: number;
    optionalFees: Array<{
        name: string;
        amount: number;
    }>;
    courierEarnings: number;
    platformFee: number;
    totalCustomerCharge: number;
    itemPrice?: number;
    deliveryFee?: number;
    sellerPayout?: number;
    platformApplicationFee?: number;
}
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded';
export interface FoodDeliveryDetails {
    temperature: FoodTemperature;
    pickupInstructions: string;
    pickupPhotoUrl?: string;
    mustDeliverBy: Timestamp;
    autoCancelAt: Timestamp;
    autoCancelled: boolean;
    restaurantWaitStarted?: Timestamp;
    restaurantWaitEnded?: Timestamp;
    actualWaitTime?: number;
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
        gpsLocation: {
            lat: number;
            lng: number;
        };
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
        gpsLocation: {
            lat: number;
            lng: number;
        };
        photoUrl: string;
        photoMetadata: PhotoMetadata;
    };
}
export interface CustomerConfirmation {
    received: boolean;
    confirmedAt?: Timestamp;
    disputeReason?: string;
    deadline: Timestamp;
    autoConfirmed: boolean;
}
export interface JobStats {
    totalDuration: number;
    pickupDuration: number;
    transitDuration: number;
    distanceTraveled: number;
}
export interface DeliveryJobDoc {
    itemId: string;
    customerId: string;
    sellerId: string;
    courierId?: string;
    jobType: JobType;
    priority: number;
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
    stripeTransferId?: string;
    isMarketplaceOrder?: boolean;
    sellerReadyForPickup?: boolean;
    sellerReadyAt?: Timestamp;
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
export type RatingRole = 'customer_to_courier' | 'courier_to_customer';
export interface RatingCategories {
    professionalism?: number;
    timeliness?: number;
    communication?: number;
    care?: number;
}
export interface RatingDoc {
    deliveryJobId: string;
    fromUserId: string;
    toUserId: string;
    role: RatingRole;
    stars: number;
    review?: string;
    categories?: RatingCategories;
    createdAt: Timestamp;
}
export type DisputeStatus = 'open' | 'investigating' | 'resolved';
export interface DisputeDoc {
    deliveryJobId: string;
    reportedBy: string;
    reportedAgainst: string;
    reason: string;
    evidence: string[];
    status: DisputeStatus;
    adminNotes?: string;
    resolution?: string;
    resolvedBy?: string;
    resolvedAt?: Timestamp;
    refundIssued: boolean;
    refundAmount?: number;
    userWarned?: string;
    userBanned?: string;
    createdAt: Timestamp;
}

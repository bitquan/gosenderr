/**
 * Marketplace Type Definitions
 * Phase 2: Unified Buyer/Seller Model
 */

import { Timestamp, GeoPoint } from 'firebase/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export enum ItemCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  HOME = 'home',
  BOOKS = 'books',
  TOYS = 'toys',
  SPORTS = 'sports',
  AUTOMOTIVE = 'automotive',
  OTHER = 'other'
}

export enum ItemCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export enum DeliveryOption {
  COURIER = 'courier',
  PICKUP = 'pickup',
  SHIPPING = 'shipping',
  BOTH = 'both'
}

export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD = 'sold',
  REMOVED = 'removed',
  EXPIRED = 'expired'
}

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  COURIER_ASSIGNED = 'courier_assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed'
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  COURIER = 'courier',
  ADMIN = 'admin'
}

export enum VerificationLevel {
  NONE = 0,
  PHONE = 1,
  EMAIL = 2,
  IDENTITY = 3
}

export enum SellerBadge {
  BUYER_PROTECTION = 'buyer_protection',
  TOP_RATED = 'top_rated',
  VERIFIED = 'verified',
  FAST_SHIPPER = 'fast_shipper',
  QUICK_RESPONDER = 'quick_responder',
  RETURNS_ACCEPTED = 'returns_accepted'
}

export enum MessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  SYSTEM = 'system'
}

// ============================================================================
// MARKETPLACE ITEM
// ============================================================================

export interface MarketplaceItem {
  id: string;
  
  // Seller info
  sellerId: string;
  sellerName: string;
  sellerPhotoURL?: string;
  
  // Item details
  title: string;
  description: string;
  category: ItemCategory;
  condition: ItemCondition;
  
  // Pricing
  price: number;
  quantity: number;
  
  // Media
  photos: string[]; // Storage URLs
  
  // Delivery
  deliveryOptions: DeliveryOption[];
  pickupLocation?: {
    address: string;
    city: string;
    state: string;
    postalCode?: string;
    location: GeoPoint;
  };
  
  // Status
  status: ListingStatus;
  isActive: boolean;
  
  // Metrics
  views: number;
  favorites: number;
  soldCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  soldAt?: Timestamp;
}

// ============================================================================
// ORDER
// ============================================================================

export interface Order {
  id: string;
  
  // Participants
  buyerId: string;
  buyerName: string;
  buyerPhotoURL?: string;
  
  sellerId: string;
  sellerName: string;
  sellerPhotoURL?: string;
  
  courierId?: string;
  courierName?: string;
  
  // Item snapshot (preserve at time of order)
  itemId: string;
  itemSnapshot: {
    title: string;
    description: string;
    photos: string[];
    price: number;
  };
  
  quantity: number;
  
  // Delivery
  deliveryAddress: Address;
  deliveryOption: DeliveryOption;
  deliveryInstructions?: string;
  
  // Pricing breakdown
  pricing: {
    itemPrice: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;
  };
  
  // Payment
  paymentIntentId?: string;
  paymentStatus: PaymentStatus;
  
  // Job (if courier delivery)
  jobId?: string;
  
  // Status
  status: OrderStatus;
  
  // Timeline
  placedAt: Timestamp;
  acceptedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  cancelledAt?: Timestamp;
  
  cancellationReason?: string;
  disputeId?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// USER (UNIFIED MODEL)
// ============================================================================

export interface User {
  id: string;
  
  // Basic info
  email: string;
  phoneNumber: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  
  // Location
  city?: string;
  state?: string;
  location?: GeoPoint;
  
  // Roles (a user can have multiple)
  roles: UserRole[];
  
  // Seller profile (auto-created on first listing)
  sellerProfile?: SellerProfile;
  
  // Buyer profile
  buyerProfile?: BuyerProfile;
  
  // Trust & Safety
  isVerified: boolean;
  isPhoneVerified: boolean;
  verificationLevel: VerificationLevel;
  
  // Payment
  stripeCustomerId?: string;
  stripeConnectAccountId?: string; // for sellers receiving payments
  savedPaymentMethods: PaymentMethod[];
  savedAddresses: Address[];
  
  // Settings
  notificationPreferences: NotificationPrefs;
  privacySettings: PrivacySettings;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
}

export interface SellerProfile {
  isActive: boolean;
  businessName?: string;
  activeListings: number;
  totalSales: number;
  totalRevenue: number;
  rating: number;
  ratingCount: number;
  responseTimeAvg: number; // minutes
  completionRate: number; // percentage
  joinedAsSellerAt: Timestamp;
  
  // Trust & Protection Settings
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
  buyerProtectionEnabled: boolean;      // 3-day fund hold
  instantPayoutEnabled: boolean;        // 30-min payout (+1% fee)
  returnsAccepted: boolean;             // Free returns
  returnWindowDays: 7 | 14 | 30;        // Return period
  shippingGuarantee?: '24h' | '48h' | '3-5days';
  
  // Seller Score & Badges
  sellerScore: number;                  // Calculated score
  badges: SellerBadge[];                // Earned badges
  disputeCount: number;
  strikeCount: number;
  lastStrikeAt?: Timestamp;
  suspendedUntil?: Timestamp;
}

export interface BuyerProfile {
  totalOrders: number;
  rating: number;
  ratingCount: number;
  favoriteItems: string[]; // item IDs
}

export interface Address {
  id: string;
  label: string; // "Home", "Work", etc.
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  location?: GeoPoint;
  instructions?: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  brand?: string; // "visa", "mastercard"
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface NotificationPrefs {
  email: {
    orderUpdates: boolean;
    newMessages: boolean;
    promotions: boolean;
  };
  push: {
    orderUpdates: boolean;
    newMessages: boolean;
    promotions: boolean;
  };
  sms: {
    orderUpdates: boolean;
  };
}

export interface PrivacySettings {
  showPhoneNumber: boolean;
  showEmail: boolean;
  showLocation: boolean;
}

// ============================================================================
// MESSAGING
// ============================================================================

export interface Conversation {
  id: string;
  
  participants: string[]; // user IDs [2]
  participantDetails: {
    [userId: string]: {
      displayName: string;
      photoURL?: string;
    };
  };
  
  // Context
  orderId?: string;
  itemId?: string;
  
  // Last message
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastMessageSenderId: string;
  
  // Unread counts per user
  unreadCount: {
    [userId: string]: number;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  conversationId: string;
  
  senderId: string;
  recipientId: string;
  
  // Content
  text?: string;
  photoURL?: string;
  type: MessageType;
  
  // Context
  orderId?: string;
  itemId?: string;
  
  // Status
  isRead: boolean;
  readAt?: Timestamp;
  
  // Timestamp
  createdAt: Timestamp;
}

// ============================================================================
// RATINGS & REVIEWS
// ============================================================================

export interface Rating {
  id: string;
  
  orderId: string;
  itemId: string;
  
  // Rater and ratee
  reviewerId: string;
  revieweeId: string;
  reviewerRole: 'buyer' | 'seller';
  
  // Rating
  score: number; // 1-5
  review?: string;
  
  // Response
  response?: string;
  respondedAt?: Timestamp;
  
  // Status
  isVisible: boolean;
  isFlagged: boolean;
  
  // Timestamps
  createdAt: Timestamp;
}

// ============================================================================
// API INPUT TYPES
// ============================================================================

export interface CreateListingInput {
  title: string;
  description: string;
  category: ItemCategory;
  condition: ItemCondition;
  price: number;
  quantity: number;
  photos: string[];
  deliveryOptions: DeliveryOption[];
  pickupLocation?: {
    address: string;
    city: string;
    state: string;
    postalCode?: string;
    location: GeoPoint;
  };
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  category?: ItemCategory;
  condition?: ItemCondition;
  price?: number;
  quantity?: number;
  photos?: string[];
  deliveryOptions?: DeliveryOption[];
  pickupLocation?: {
    address: string;
    city: string;
    state: string;
    postalCode?: string;
    location: GeoPoint;
  };
}

export interface CreateOrderInput {
  itemId: string;
  quantity: number;
  deliveryAddress: Address;
  deliveryOption: DeliveryOption;
  deliveryInstructions?: string;
  paymentMethodId: string;
}

export interface ItemFilters {
  category?: ItemCategory;
  condition?: ItemCondition;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'popular';
  limit?: number;
  nearLocation?: GeoPoint;
  radiusMiles?: number;
}

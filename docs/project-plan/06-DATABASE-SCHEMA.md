# Database Schema

**Last Updated:** January 2026  
**Database:** Cloud Firestore  
**Version:** 2.0

---

## 📋 Overview

This document defines the complete Firestore database schema for GoSenderr v2, including all collections, document structures, TypeScript interfaces, indexes, and security rules.

---

## 🗂️ Collections Overview

```
Firestore Root
├── users/                      # User accounts (all roles)
├── marketplaceItems/           # Items listed for sale
├── orders/                     # Marketplace orders
├── jobs/                       # Delivery jobs
├── jobPhotos/                  # Delivery proof photos
├── conversations/              # Message threads
│   └── messages/               # Messages subcollection
├── ratings/                    # User ratings and reviews
├── disputes/                   # Dispute cases
├── payouts/                    # Courier payouts
├── transactions/               # Payment transactions
├── notifications/              # Push notifications
└── systemConfig/               # Platform configuration
```

---

## 👤 users/

**Purpose:** Store all user accounts with role-based profiles (buyers, sellers, couriers, admins)

### Document Structure

```typescript
interface User {
  // Document ID = Firebase Auth UID
  id: string;
  
  // Authentication
  email: string;
  phoneNumber: string;
  authProvider: 'phone' | 'email' | 'google' | 'apple';
  
  // Basic Profile
  displayName: string;
  photoURL?: string;
  bio?: string;
  
  // Location
  city?: string;
  state?: string;
  country: string;
  location?: GeoPoint; // Current/home location
  
  // Roles (user can have multiple)
  roles: UserRole[];
  
  // Buyer Profile (always present)
  buyerProfile: {
    totalOrders: number;
    rating: number;
    ratingCount: number;
    favoriteItems: string[]; // itemIds
    defaultPaymentMethodId?: string;
    defaultAddressId?: string;
  };
  
  // Seller Profile (created on first listing)
  sellerProfile?: {
    isActive: boolean;
    businessName?: string;
    description?: string;
    activeListings: number;
    totalSales: number;
    totalRevenue: number; // in cents
    rating: number;
    ratingCount: number;
    responseTimeAvg: number; // minutes
    completionRate: number; // 0-100
    joinedAsSellerAt: Timestamp;
    stripeConnectAccountId?: string;
  };
  
  // Courier Profile (for delivery drivers)
  courierProfile?: {
    isActive: boolean;
    isOnline: boolean;
    status: CourierStatus;
    activeJobId?: string;
    
    // Location tracking
    currentLocation?: GeoPoint;
    lastLocationUpdate?: Timestamp;
    heading?: number; // 0-360 degrees
    speed?: number; // meters per second
    
    // Stats
    totalDeliveries: number;
    rating: number;
    ratingCount: number;
    acceptanceRate: number; // 0-100
    onTimeRate: number; // 0-100
    
    // Earnings
    totalEarnings: number; // in cents
    pendingEarnings: number;
    availableForPayout: number;
    
    // Vehicle
    vehicleType: VehicleType;
    vehicleDetails?: {
      make?: string;
      model?: string;
      color?: string;
      licensePlate?: string;
    };
    
    // Background Check
    backgroundCheckStatus: BackgroundCheckStatus;
    backgroundCheckCompletedAt?: Timestamp;
    
    // Joined
    joinedAsCourierAt: Timestamp;
  };
  
  // Admin Profile
  adminProfile?: {
    level: AdminLevel;
    permissions: AdminPermission[];
    lastAdminActionAt?: Timestamp;
  };
  
  // Payment
  stripeCustomerId?: string;
  savedPaymentMethods: PaymentMethod[];
  savedAddresses: Address[];
  
  // Trust & Safety
  isVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isIdentityVerified: boolean;
  verificationLevel: VerificationLevel;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Timestamp;
  
  // Settings
  notificationPreferences: {
    email: {
      orderUpdates: boolean;
      newMessages: boolean;
      promotions: boolean;
      newsletter: boolean;
    };
    push: {
      orderUpdates: boolean;
      newMessages: boolean;
      jobAlerts: boolean;
      promotions: boolean;
    };
    sms: {
      orderUpdates: boolean;
      deliveryAlerts: boolean;
    };
  };
  
  privacySettings: {
    showLocation: boolean;
    showOnlineStatus: boolean;
    allowMessages: 'everyone' | 'buyers_sellers' | 'none';
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
  lastLoginAt: Timestamp;
}

enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  COURIER = 'courier',
  ADMIN = 'admin'
}

enum CourierStatus {
  OFFLINE = 'offline',
  AVAILABLE = 'available',
  BUSY = 'busy',
  ON_BREAK = 'on_break'
}

enum VehicleType {
  BICYCLE = 'bicycle',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
  TRUCK = 'truck'
}

enum BackgroundCheckStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

enum AdminLevel {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support'
}

enum AdminPermission {
  MANAGE_USERS = 'manage_users',
  MANAGE_ORDERS = 'manage_orders',
  MANAGE_JOBS = 'manage_jobs',
  MANAGE_DISPUTES = 'manage_disputes',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_CONFIG = 'manage_config',
  MANAGE_PAYOUTS = 'manage_payouts'
}

enum VerificationLevel {
  NONE = 0,
  PHONE = 1,
  EMAIL = 2,
  IDENTITY = 3
}

interface Address {
  id: string;
  label: string; // "Home", "Work", etc.
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  location: GeoPoint;
  instructions?: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string; // "visa", "mastercard"
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId: string;
  createdAt: Timestamp;
}
```

### Example Document

```json
{
  "id": "user_abc123",
  "email": "john@example.com",
  "phoneNumber": "+15551234567",
  "authProvider": "phone",
  "displayName": "John Doe",
  "photoURL": "https://storage.googleapis.com/...",
  "bio": "Love buying and selling locally!",
  "city": "San Francisco",
  "state": "CA",
  "country": "US",
  "location": {
    "_latitude": 37.7749,
    "_longitude": -122.4194
  },
  "roles": ["buyer", "seller"],
  "buyerProfile": {
    "totalOrders": 12,
    "rating": 4.8,
    "ratingCount": 10,
    "favoriteItems": ["item_1", "item_2"],
    "defaultAddressId": "addr_1"
  },
  "sellerProfile": {
    "isActive": true,
    "activeListings": 5,
    "totalSales": 24,
    "totalRevenue": 450000,
    "rating": 4.9,
    "ratingCount": 22,
    "responseTimeAvg": 15,
    "completionRate": 98,
    "joinedAsSellerAt": "2025-01-15T10:00:00Z",
    "stripeConnectAccountId": "acct_xxx"
  },
  "stripeCustomerId": "cus_xxx",
  "savedPaymentMethods": [],
  "savedAddresses": [],
  "isVerified": true,
  "isPhoneVerified": true,
  "isEmailVerified": true,
  "isIdentityVerified": false,
  "verificationLevel": 2,
  "isBanned": false,
  "notificationPreferences": {
    "email": {
      "orderUpdates": true,
      "newMessages": true,
      "promotions": false,
      "newsletter": false
    },
    "push": {
      "orderUpdates": true,
      "newMessages": true,
      "jobAlerts": false,
      "promotions": false
    },
    "sms": {
      "orderUpdates": true,
      "deliveryAlerts": false
    }
  },
  "privacySettings": {
    "showLocation": true,
    "showOnlineStatus": true,
    "allowMessages": "buyers_sellers"
  },
  "createdAt": "2025-01-10T10:00:00Z",
  "updatedAt": "2026-01-30T14:30:00Z",
  "lastActiveAt": "2026-01-30T14:30:00Z",
  "lastLoginAt": "2026-01-30T08:00:00Z"
}
```

### Indexes

```typescript
// Composite indexes required
users.roles + users.createdAt (DESC)
users.courierProfile.isOnline + users.courierProfile.currentLocation (GEO)
users.city + users.sellerProfile.rating (DESC)
```

---

## 📦 marketplaceItems/

**Purpose:** Items listed for sale in the marketplace

### Document Structure

```typescript
interface MarketplaceItem {
  id: string;
  
  // Seller
  sellerId: string;
  sellerName: string;
  sellerPhotoURL?: string;
  sellerRating: number;
  
  // Item Details
  title: string; // max 100 chars
  description: string; // max 500 chars
  category: ItemCategory;
  condition: ItemCondition;
  price: number; // in cents
  quantity: number;
  
  // Media
  photos: string[]; // Storage URLs (max 8)
  primaryPhotoIndex: number;
  thumbnailURL: string; // Compressed version
  
  // Delivery
  deliveryOptions: DeliveryOption[];
  pickupLocation?: GeoPoint;
  pickupAddress?: string;
  pickupCity?: string;
  pickupState?: string;
  
  // Status
  status: ListingStatus;
  isActive: boolean;
  isFeatured: boolean;
  isSoldOut: boolean;
  
  // Metrics
  views: number;
  favorites: number;
  soldCount: number;
  availableQuantity: number;
  
  // SEO & Search
  tags: string[];
  searchKeywords: string[]; // lowercase for searching
  
  // Moderation
  isFlagged: boolean;
  flagReason?: string;
  moderationStatus: ModerationStatus;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  soldOutAt?: Timestamp;
  expiresAt?: Timestamp;
}

enum ItemCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  HOME_GARDEN = 'home_garden',
  SPORTS = 'sports',
  BOOKS = 'books',
  TOYS = 'toys',
  FURNITURE = 'furniture',
  BEAUTY = 'beauty',
  AUTOMOTIVE = 'automotive',
  OTHER = 'other'
}

enum ItemCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair'
}

enum DeliveryOption {
  STANDARD = 'standard',
  EXPRESS = 'express',
  PICKUP = 'pickup'
}

enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD = 'sold',
  REMOVED = 'removed',
  EXPIRED = 'expired'
}

enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged'
}
```

### Indexes

```typescript
marketplaceItems.isActive + marketplaceItems.category + marketplaceItems.publishedAt (DESC)
marketplaceItems.isActive + marketplaceItems.price (ASC)
marketplaceItems.isActive + marketplaceItems.price (DESC)
marketplaceItems.sellerId + marketplaceItems.status + marketplaceItems.createdAt (DESC)
marketplaceItems.pickupLocation (GEO) + marketplaceItems.isActive
```

---

## 🛒 orders/

**Purpose:** Marketplace purchase orders

### Document Structure

```typescript
interface Order {
  id: string;
  orderNumber: string; // Human-readable (e.g., "ORD-2026-001234")
  
  // Parties
  buyerId: string;
  buyerName: string;
  buyerPhotoURL?: string;
  
  sellerId: string;
  sellerName: string;
  sellerPhotoURL?: string;
  
  courierId?: string;
  courierName?: string;
  courierPhotoURL?: string;
  
  // Item Reference
  itemId: string;
  itemSnapshot: {
    title: string;
    price: number;
    photos: string[];
    condition: ItemCondition;
    category: ItemCategory;
  };
  quantity: number;
  
  // Delivery
  deliveryAddress: Address;
  deliveryOption: DeliveryOption;
  deliveryInstructions?: string;
  pickupAddress: Address;
  pickupInstructions?: string;
  
  // Pricing (all in cents)
  itemPrice: number; // total for quantity
  deliveryFee: number;
  serviceFee: number;
  platformFee: number;
  taxAmount: number;
  totalAmount: number;
  
  // Seller Payout
  sellerPayout: number; // after fees
  platformEarnings: number;
  courierPay?: number;
  
  // Payment
  paymentIntentId: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string; // last4
  
  // Job Reference (when courier claims)
  jobId?: string;
  
  // Status & Timeline
  status: OrderStatus;
  
  placedAt: Timestamp;
  acceptedAt?: Timestamp;
  readyForPickupAt?: Timestamp;
  claimedAt?: Timestamp; // Courier claimed
  pickedUpAt?: Timestamp; // Courier picked up
  inTransitAt?: Timestamp;
  deliveredAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  refundedAt?: Timestamp;
  
  // ETA
  estimatedDeliveryAt?: Timestamp;
  actualDeliveryAt?: Timestamp;
  
  // Cancellation
  cancellationReason?: string;
  cancelledBy?: string; // userId
  
  // Dispute
  disputeId?: string;
  
  // Ratings
  buyerRatingId?: string;
  sellerRatingId?: string;
  courierRatingId?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

enum OrderStatus {
  PENDING = 'pending',                    // Order placed, awaiting seller
  ACCEPTED = 'accepted',                  // Seller accepted
  READY_FOR_PICKUP = 'ready_for_pickup',  // Ready for courier
  CLAIMED = 'claimed',                    // Courier claimed
  PICKED_UP = 'picked_up',                // Courier picked up item
  IN_TRANSIT = 'in_transit',              // On the way
  DELIVERED = 'delivered',                // Delivered to buyer
  COMPLETED = 'completed',                // Rated and closed
  CANCELLED = 'cancelled',                // Cancelled
  REFUNDED = 'refunded',                  // Refunded
  DISPUTED = 'disputed'                   // In dispute
}

enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed'
}
```

### Indexes

```typescript
orders.buyerId + orders.createdAt (DESC)
orders.sellerId + orders.createdAt (DESC)
orders.courierId + orders.createdAt (DESC)
orders.status + orders.createdAt (DESC)
orders.paymentStatus + orders.createdAt (DESC)
```

---

## 🚚 jobs/

**Purpose:** Delivery jobs for couriers

### Document Structure

```typescript
interface Job {
  id: string;
  jobNumber: string; // Human-readable (e.g., "JOB-2026-001234")
  
  // Related Order
  orderId: string;
  
  // Parties
  senderId: string; // seller
  senderName: string;
  senderPhone: string;
  
  recipientId: string; // buyer
  recipientName: string;
  recipientPhone: string;
  
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  
  // Pickup
  pickupAddress: Address;
  pickupLocation: GeoPoint;
  pickupInstructions?: string;
  pickupContactPhone: string;
  
  // Dropoff
  dropoffAddress: Address;
  dropoffLocation: GeoPoint;
  dropoffInstructions?: string;
  dropoffContactPhone: string;
  
  // Package Details
  packageDescription: string;
  packageSize: PackageSize;
  packageWeight?: number; // in lbs
  requiresSignature: boolean;
  
  // Route
  distanceMeters: number;
  durationSeconds: number;
  routePolyline?: string; // Encoded polyline
  
  // Pricing
  courierPay: number; // in cents
  platformFee: number;
  
  // Status & Timeline
  status: JobStatus;
  
  postedAt: Timestamp;
  claimedAt?: Timestamp;
  arrivedAtPickupAt?: Timestamp;
  pickedUpAt?: Timestamp;
  inTransitAt?: Timestamp;
  arrivedAtDropoffAt?: Timestamp;
  deliveredAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  
  // Photos
  pickupPhotoId?: string;
  deliveryPhotoId?: string;
  
  // Tracking
  courierLocation?: GeoPoint;
  lastLocationUpdate?: Timestamp;
  estimatedArrivalAt?: Timestamp;
  
  // Attempts
  deliveryAttempts: number;
  maxAttempts: number;
  
  // Cancellation
  cancellationReason?: string;
  cancelledBy?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // Auto-cancel if not claimed
}

enum JobStatus {
  AVAILABLE = 'available',               // Posted, waiting for courier
  CLAIMED = 'claimed',                   // Courier claimed
  ARRIVED_AT_PICKUP = 'arrived_at_pickup',
  PICKED_UP = 'picked_up',               // Package picked up
  IN_TRANSIT = 'in_transit',             // On the way
  ARRIVED_AT_DROPOFF = 'arrived_at_dropoff',
  DELIVERED = 'delivered',               // Delivered
  COMPLETED = 'completed',               // Payment processed
  CANCELLED = 'cancelled',               // Cancelled
  EXPIRED = 'expired'                    // No courier claimed in time
}

enum PackageSize {
  SMALL = 'small',      // Fits in pocket
  MEDIUM = 'medium',    // Shoebox size
  LARGE = 'large',      // Moving box size
  EXTRA_LARGE = 'extra_large' // Furniture
}
```

### Indexes

```typescript
jobs.status + jobs.pickupLocation (GEO)
jobs.courierId + jobs.status + jobs.createdAt (DESC)
jobs.status + jobs.createdAt (DESC)
jobs.orderId
```

---

## 📸 jobPhotos/

**Purpose:** Proof of delivery photos

### Document Structure

```typescript
interface JobPhoto {
  id: string;
  
  jobId: string;
  orderId: string;
  courierId: string;
  
  photoType: PhotoType;
  photoURL: string;
  thumbnailURL: string;
  
  // Metadata
  location?: GeoPoint;
  timestamp: Timestamp;
  deviceInfo?: string;
  
  // Verification
  isVerified: boolean;
  verifiedBy?: string; // admin userId
  verifiedAt?: Timestamp;
  
  createdAt: Timestamp;
}

enum PhotoType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  ISSUE = 'issue'
}
```

### Indexes

```typescript
jobPhotos.jobId + jobPhotos.photoType
jobPhotos.orderId + jobPhotos.createdAt (DESC)
jobPhotos.courierId + jobPhotos.createdAt (DESC)
```

---

## 💬 conversations/

**Purpose:** Message threads between users

### Document Structure

```typescript
interface Conversation {
  id: string; // Composite: `${userId1}_${userId2}` (sorted alphabetically)
  
  // Participants (always 2)
  participants: string[]; // [userId1, userId2]
  participantDetails: {
    [userId: string]: {
      displayName: string;
      photoURL?: string;
      role: UserRole;
    };
  };
  
  // Context
  orderId?: string;
  itemId?: string;
  jobId?: string;
  
  // Last Message
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastMessageSenderId: string;
  lastMessageType: MessageType;
  
  // Unread Counts (per user)
  unreadCount: {
    [userId: string]: number;
  };
  
  // Status
  isArchived: {
    [userId: string]: boolean;
  };
  
  isMuted: {
    [userId: string]: boolean;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Subcollection: messages/

```typescript
interface Message {
  id: string;
  
  conversationId: string;
  
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  
  recipientId: string;
  
  // Content
  text?: string;
  photoURL?: string;
  type: MessageType;
  
  // Status
  isRead: boolean;
  readAt?: Timestamp;
  isDelivered: boolean;
  deliveredAt?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

enum MessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  SYSTEM = 'system'
}
```

### Indexes

```typescript
conversations.participants + conversations.lastMessageAt (DESC)
conversations.participants + conversations.updatedAt (DESC)
messages.conversationId + messages.createdAt (ASC)
messages.senderId + messages.createdAt (DESC)
```

---

## ⭐ ratings/

**Purpose:** User ratings and reviews

### Document Structure

```typescript
interface Rating {
  id: string;
  
  // Context
  orderId: string;
  itemId?: string;
  jobId?: string;
  
  // Rater and Ratee
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  
  revieweeId: string;
  revieweeName: string;
  revieweeRole: UserRole;
  
  // Rating
  score: number; // 1-5
  review?: string; // max 300 chars
  
  // Response
  response?: string;
  respondedAt?: Timestamp;
  
  // Categories (optional detailed ratings)
  categories?: {
    communication?: number; // 1-5
    accuracy?: number;      // 1-5
    timeliness?: number;    // 1-5
    professionalism?: number; // 1-5
  };
  
  // Status
  isVisible: boolean;
  isFlagged: boolean;
  flagReason?: string;
  isVerified: boolean; // Verified purchase/delivery
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Indexes

```typescript
ratings.revieweeId + ratings.createdAt (DESC)
ratings.revieweeId + ratings.isVisible + ratings.score (DESC)
ratings.orderId
ratings.reviewerId + ratings.createdAt (DESC)
```

---

## 🚨 disputes/

**Purpose:** Order disputes and resolutions

### Document Structure

```typescript
interface Dispute {
  id: string;
  disputeNumber: string;
  
  // Related Order/Job
  orderId: string;
  jobId?: string;
  
  // Parties
  initiatorId: string;
  initiatorRole: UserRole;
  
  respondentId: string;
  respondentRole: UserRole;
  
  // Dispute Details
  reason: DisputeReason;
  description: string;
  evidencePhotos: string[];
  
  // Status
  status: DisputeStatus;
  priority: DisputePriority;
  
  // Resolution
  resolvedBy?: string; // admin userId
  resolution?: string;
  resolutionNotes?: string;
  refundAmount?: number; // in cents
  
  // Timeline
  createdAt: Timestamp;
  updatedAt: Timestamp;
  respondedAt?: Timestamp;
  resolvedAt?: Timestamp;
  escalatedAt?: Timestamp;
  
  // Metadata
  adminNotes?: string;
}

enum DisputeReason {
  ITEM_NOT_AS_DESCRIBED = 'item_not_as_described',
  ITEM_NOT_RECEIVED = 'item_not_received',
  ITEM_DAMAGED = 'item_damaged',
  WRONG_ITEM = 'wrong_item',
  LATE_DELIVERY = 'late_delivery',
  PAYMENT_ISSUE = 'payment_issue',
  OTHER = 'other'
}

enum DisputeStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  AWAITING_RESPONSE = 'awaiting_response',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated'
}

enum DisputePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

### Indexes

```typescript
disputes.status + disputes.createdAt (DESC)
disputes.status + disputes.priority + disputes.createdAt (DESC)
disputes.orderId
disputes.initiatorId + disputes.createdAt (DESC)
```

---

## 💸 payouts/

**Purpose:** Courier/seller payout records

### Document Structure

```typescript
interface Payout {
  id: string;
  payoutNumber: string;
  
  // Recipient
  userId: string;
  userRole: UserRole; // COURIER or SELLER
  
  // Amount
  amount: number; // in cents
  currency: string; // "USD"
  
  // Jobs/Orders Included
  jobIds?: string[];
  orderIds?: string[];
  
  // Stripe
  stripePayoutId: string;
  stripeAccountId: string;
  
  // Status
  status: PayoutStatus;
  
  // Timeline
  createdAt: Timestamp;
  updatedAt: Timestamp;
  scheduledAt: Timestamp;
  paidAt?: Timestamp;
  failedAt?: Timestamp;
  
  // Failure
  failureReason?: string;
  
  // Metadata
  description: string;
}

enum PayoutStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

### Indexes

```typescript
payouts.userId + payouts.createdAt (DESC)
payouts.status + payouts.scheduledAt (ASC)
payouts.stripePayoutId
```

---

## 🔐 Security Rules Summary

### Key Principles

1. **Authentication Required:** Most reads/writes require authenticated user
2. **Role-Based Access:** Users can only access data relevant to their roles
3. **Data Validation:** Server-side validation in Cloud Functions
4. **Rate Limiting:** Implemented via Cloud Functions

### Example Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid))
               .data.roles.hasAny([role]);
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || hasRole('admin');
      allow delete: if hasRole('admin');
    }
    
    // Marketplace items
    match /marketplaceItems/{itemId} {
      allow read: if true; // Public browsing
      allow create: if isSignedIn();
      allow update: if isSignedIn() && 
                       (resource.data.sellerId == request.auth.uid || 
                        hasRole('admin'));
      allow delete: if hasRole('admin');
    }
    
    // Orders
    match /orders/{orderId} {
      allow read: if isSignedIn() && (
        resource.data.buyerId == request.auth.uid ||
        resource.data.sellerId == request.auth.uid ||
        resource.data.courierId == request.auth.uid ||
        hasRole('admin')
      );
      allow create: if isSignedIn();
      allow update: if hasRole('admin'); // Use Cloud Functions for updates
      allow delete: if hasRole('admin');
    }
    
    // Jobs
    match /jobs/{jobId} {
      allow read: if isSignedIn() && (
        hasRole('courier') ||
        resource.data.courierId == request.auth.uid ||
        hasRole('admin')
      );
      allow create: if hasRole('admin'); // Created by Cloud Function
      allow update: if isSignedIn() && (
        resource.data.courierId == request.auth.uid ||
        hasRole('admin')
      );
      allow delete: if hasRole('admin');
    }
    
    // Messages
    match /conversations/{conversationId} {
      allow read: if isSignedIn() && 
                     request.auth.uid in resource.data.participants;
      allow create, update: if isSignedIn() && 
                               request.auth.uid in request.resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if isSignedIn() && 
                       request.auth.uid in 
                         get(/databases/$(database)/documents/conversations/$(conversationId))
                           .data.participants;
        allow create: if isSignedIn();
      }
    }
    
    // Ratings
    match /ratings/{ratingId} {
      allow read: if resource.data.isVisible;
      allow create: if isSignedIn() && 
                       request.resource.data.reviewerId == request.auth.uid;
      allow update: if isOwner(resource.data.revieweeId) && 
                       !resource.data.response; // Can only respond once
      allow delete: if hasRole('admin');
    }
    
    // Disputes
    match /disputes/{disputeId} {
      allow read: if isSignedIn() && (
        resource.data.initiatorId == request.auth.uid ||
        resource.data.respondentId == request.auth.uid ||
        hasRole('admin')
      );
      allow create: if isSignedIn();
      allow update: if hasRole('admin');
    }
  }
}
```

---

## 📈 Data Retention & Archival

### Archive Strategy

**Orders & Jobs:**
- Active: Keep in main collection
- Completed (>90 days): Move to `orders_archive` collection
- Access via Cloud Functions when needed

**Messages:**
- Keep last 30 days in main collection
- Archive older messages to Cloud Storage
- Load on-demand when viewing conversation history

**Photos:**
- Keep originals for 1 year
- Delete after 1 year (keep thumbnails)
- Proof of delivery photos: Keep forever

**Payouts:**
- Keep all records forever (tax compliance)

---

## 🔧 Database Maintenance

### Scheduled Tasks

```typescript
// Cloud Scheduler jobs

// 1. Clean up expired listings (daily at 2 AM)
exports.cleanupExpiredListings = functions.pubsub
  .schedule('0 2 * * *')
  .onRun(async () => {
    const expired = await db.collection('marketplaceItems')
      .where('expiresAt', '<=', Timestamp.now())
      .where('status', '==', 'active')
      .get();
    
    const batch = db.batch();
    expired.docs.forEach(doc => {
      batch.update(doc.ref, { 
        status: 'expired', 
        isActive: false 
      });
    });
    await batch.commit();
  });

// 2. Archive old orders (daily at 3 AM)
exports.archiveOldOrders = functions.pubsub
  .schedule('0 3 * * *')
  .onRun(async () => {
    const cutoff = Timestamp.fromMillis(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    );
    
    const old = await db.collection('orders')
      .where('completedAt', '<=', cutoff)
      .where('status', '==', 'completed')
      .limit(500)
      .get();
    
    const batch = db.batch();
    old.docs.forEach(doc => {
      const archiveRef = db.collection('orders_archive').doc(doc.id);
      batch.set(archiveRef, doc.data());
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

// 3. Calculate daily stats (daily at 4 AM)
exports.calculateDailyStats = functions.pubsub
  .schedule('0 4 * * *')
  .onRun(async () => {
    // Aggregate stats and store in analytics collection
  });
```

---

## ✅ Schema Validation Checklist

- [ ] All collections have proper indexes
- [ ] Security rules implemented
- [ ] TypeScript interfaces defined
- [ ] Composite indexes created in Firebase Console
- [ ] GeoPoint queries optimized
- [ ] Data retention policy implemented
- [ ] Scheduled cleanup tasks configured
- [ ] Archive strategy in place

---

*This schema supports all GoSenderr v2 features across marketplace, delivery, and admin apps.*

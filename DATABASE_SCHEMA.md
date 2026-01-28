# 🗄️ GOSENDERR - FIRESTORE DATABASE SCHEMA

## Overview

This document defines the complete Firestore database structure for GoSenderR, including all collections, documents, and data models.

---

## Collections Structure

```
firestore/
├── users/{userId}
├── marketplaceItems/{itemId}
├── orders/{orderId}
├── deliveries/{deliveryId}
├── vendorApplications/{userId}
├── categories/{categoryId}
├── reviews/{reviewId}
├── notifications/{notificationId}
└── systemSettings/{settingId}
```

---

## Collection: `users/{userId}`

**Purpose:** Store all user data including role information

### Document Structure

```typescript
interface User {
  // Core Identity
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  displayName: string;            // Display name
  photoURL?: string;              // Profile photo URL
  phoneNumber?: string;           // Phone number
  
  // Role Management
  roles: UserRole[];              // Array of roles user has
  primaryRole: UserRole;          // Current active role
  
  // Customer Data
  deliveryAddresses?: Address[];  // Saved delivery addresses
  paymentMethods?: string[];      // Stripe payment method IDs
  favoriteItems?: string[];       // Favorited item IDs
  
  // Vendor Data (if isVendor = true)
  isVendor?: boolean;
  vendorProfile?: {
    businessName: string;
    businessDescription: string;
    businessType: string;
    logo?: string;
    banner?: string;
    stripeConnectId?: string;
    
    // Stats
    rating?: number;
    totalSales?: number;
    totalOrders?: number;
    joinedDate?: Timestamp;
    
    // Contact
    contactEmail?: string;
    contactPhone?: string;
    businessAddress?: Address;
    
    // Settings
    isActive?: boolean;
    categories?: string[];
  };
  
  // Courier Data (if isCourier = true)
  isCourier?: boolean;
  courierProfile?: {
    vehicleType: 'car' | 'bike' | 'motorcycle' | 'van' | 'truck';
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleColor?: string;
    licensePlate?: string;
    
    // Stats
    rating?: number;
    totalDeliveries?: number;
    completionRate?: number;
    
    // Availability
    isAvailable?: boolean;
    isOnline?: boolean;
    currentLocation?: GeoPoint;
    lastLocationUpdate?: Timestamp;
    
    // Verification
    isVerified?: boolean;
    backgroundCheckDate?: Timestamp;
    licenseVerified?: boolean;
    insuranceVerified?: boolean;
  };
  
  // Admin Data (if isAdmin = true)
  isAdmin?: boolean;
  adminPermissions?: string[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

// Supporting Types
interface Address {
  id?: string;
  label?: string;              // "Home", "Work", etc.
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: GeoPoint;
  instructions?: string;       // Delivery instructions
  isDefault?: boolean;
}

enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  COURIER = 'courier',
  ADMIN = 'admin'
}
```

### Security Rules

```javascript
match /users/{userId} {
  // Users can read their own data
  allow read: if request.auth.uid == userId;
  
  // Users can update their own data (except roles and admin fields)
  allow update: if request.auth.uid == userId 
    && !request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['roles', 'isAdmin', 'adminPermissions']);
  
  // Only admins can read any user
  allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

### Indexes

```
users:
  - email (ASC)
  - roles (ARRAY)
  - isVendor (ASC), vendorProfile.isActive (ASC)
  - isCourier (ASC), courierProfile.isOnline (ASC)
```

---

## Collection: `marketplaceItems/{itemId}`

**Purpose:** Store all items listed in the marketplace

### Document Structure

```typescript
interface MarketplaceItem {
  // Core Identity
  id: string;                     // Document ID
  
  // Vendor Info
  vendorId: string;               // Vendor user ID
  vendorName: string;             // Display name
  vendorLogo?: string;            // Vendor logo URL
  
  // Item Details
  title: string;
  description: string;
  shortDescription?: string;
  
  // Classification
  category: string;               // e.g., "Electronics"
  subcategory?: string;           // e.g., "Smartphones"
  tags?: string[];                // Searchable tags
  
  // Pricing & Inventory
  price: number;                  // Price in cents
  compareAtPrice?: number;        // Original price (for sales)
  currency: string;               // Default: "USD"
  quantity: number;               // Available quantity
  sku?: string;                   // Stock keeping unit
  
  // Item Condition
  condition: 'new' | 'used' | 'refurbished';
  
  // Media
  images: string[];               // Array of image URLs
  thumbnail?: string;             // Main thumbnail
  video?: string;                 // Product video URL
  
  // Shipping
  weight?: number;                // Weight in oz
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'in' | 'cm';
  };
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  
  // Status
  status: 'draft' | 'active' | 'inactive' | 'sold' | 'archived';
  isPromoted?: boolean;
  isFeatured?: boolean;
  
  // Stats
  views?: number;
  favorites?: number;
  sold?: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}
```

### Security Rules

```javascript
match /marketplaceItems/{itemId} {
  // Anyone can read active items
  allow read: if resource.data.status == 'active';
  
  // Vendors can create items
  allow create: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isVendor == true
    && request.resource.data.vendorId == request.auth.uid;
  
  // Vendors can update/delete their own items
  allow update, delete: if request.auth.uid == resource.data.vendorId;
  
  // Admins can do anything
  allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

### Indexes

```
marketplaceItems:
  - status (ASC), createdAt (DESC)
  - category (ASC), status (ASC), createdAt (DESC)
  - vendorId (ASC), status (ASC)
  - status (ASC), price (ASC)
  - tags (ARRAY), status (ASC)
```

---

## Collection: `orders/{orderId}`

**Purpose:** Store all orders (marketplace & delivery)

### Document Structure

```typescript
interface Order {
  // Core Identity
  id: string;
  orderNumber: string;            // e.g., "ORD-2024-001234"
  orderType: 'marketplace' | 'delivery' | 'both';
  
  // Customer Info
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  
  // Vendor Info (for marketplace orders)
  vendorId?: string;
  vendorName?: string;
  
  // Order Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;               // Items total (cents)
  tax: number;                    // Tax amount (cents)
  shippingFee?: number;           // Shipping fee (cents)
  serviceFee?: number;            // Platform fee (cents)
  discount?: number;              // Discount amount (cents)
  total: number;                  // Final total (cents)
  currency: string;               // Default: "USD"
  
  // Payment
  paymentIntentId: string;        // Stripe payment intent ID
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | 'cancelled';
  paidAt?: Timestamp;
  refundedAt?: Timestamp;
  refundAmount?: number;
  
  // Fulfillment
  fulfillmentMethod: 'pickup' | 'shipping' | 'courier_delivery';
  
  // Delivery Address
  deliveryAddress?: Address;
  
  // Pickup Info (if applicable)
  pickupLocation?: {
    vendorId: string;
    address: Address;
    instructions?: string;
  };
  
  // Delivery Info (if using courier)
  deliveryId?: string;            // Reference to delivery document
  
  // Order Status
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  
  // Notes
  customerNotes?: string;
  vendorNotes?: string;
  internalNotes?: string;
  
  // Tracking
  statusHistory?: Array<{
    status: string;
    timestamp: Timestamp;
    note?: string;
  }>;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

interface OrderItem {
  itemId: string;
  title: string;
  thumbnail?: string;
  price: number;                  // Price at time of order
  quantity: number;
  sku?: string;
  vendorId?: string;
}
```

### Security Rules

```javascript
match /orders/{orderId} {
  // Customers can read their own orders
  allow read: if request.auth.uid == resource.data.customerId;
  
  // Vendors can read orders for their items
  allow read: if request.auth.uid == resource.data.vendorId;
  
  // Customers can create orders
  allow create: if request.auth.uid == request.resource.data.customerId;
  
  // Vendors can update order status
  allow update: if request.auth.uid == resource.data.vendorId;
  
  // Admins can do anything
  allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

### Indexes

```
orders:
  - customerId (ASC), createdAt (DESC)
  - vendorId (ASC), status (ASC), createdAt (DESC)
  - status (ASC), createdAt (DESC)
  - paymentStatus (ASC), createdAt (DESC)
```

---

## Collection: `deliveries/{deliveryId}`

**Purpose:** Store all courier delivery jobs

### Document Structure

```typescript
interface Delivery {
  // Core Identity
  id: string;
  jobNumber: string;              // e.g., "DEL-2024-001234"
  
  // Customer Info
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  
  // Courier Info
  courierId?: string;             // Assigned courier (null if unassigned)
  courierName?: string;
  courierPhone?: string;
  courierPhoto?: string;
  
  // Pickup Details
  pickupLocation: {
    address: Address;
    coordinates: GeoPoint;
    contactName?: string;
    contactPhone?: string;
    instructions?: string;
  };
  
  // Dropoff Details
  dropoffLocation: {
    address: Address;
    coordinates: GeoPoint;
    contactName?: string;
    contactPhone?: string;
    instructions?: string;
  };
  
  // Package Details
  packageDescription: string;
  packageSize: 'small' | 'medium' | 'large' | 'extra_large';
  packageWeight?: number;         // Weight in lbs
  packageValue?: number;          // Value in cents
  packagePhoto?: string;
  
  // Pricing
  distance: number;               // Distance in miles
  basePrice: number;              // Base delivery fee (cents)
  distanceFee: number;            // Distance-based fee (cents)
  serviceFee: number;             // Platform fee (cents)
  tip?: number;                   // Tip amount (cents)
  total: number;                  // Total cost (cents)
  courierEarnings?: number;       // Courier's earnings (cents)
  
  // Payment
  paymentIntentId?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  
  // Status & Tracking
  status: 'pending' | 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'arrived' | 'delivered' | 'cancelled';
  
  currentLocation?: GeoPoint;
  estimatedDistance?: number;
  estimatedDuration?: number;     // Minutes
  estimatedArrival?: Timestamp;
  
  // Event Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedAt?: Timestamp;
  acceptedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  cancelledAt?: Timestamp;
  
  // Proof of Delivery
  proofOfDelivery?: {
    photo?: string;
    signature?: string;
    notes?: string;
    timestamp: Timestamp;
  };
  
  // Tracking History
  trackingHistory?: Array<{
    status: string;
    location?: GeoPoint;
    timestamp: Timestamp;
    note?: string;
  }>;
  
  // Notes
  customerNotes?: string;
  courierNotes?: string;
  cancellationReason?: string;
}
```

### Security Rules

```javascript
match /deliveries/{deliveryId} {
  // Customers can read their own deliveries
  allow read: if request.auth.uid == resource.data.customerId;
  
  // Couriers can read assigned deliveries
  allow read: if request.auth.uid == resource.data.courierId;
  
  // Customers can create deliveries
  allow create: if request.auth.uid == request.resource.data.customerId;
  
  // Couriers can update status
  allow update: if request.auth.uid == resource.data.courierId;
  
  // Admins can do anything
  allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

### Indexes

```
deliveries:
  - status (ASC), createdAt (DESC)
  - customerId (ASC), createdAt (DESC)
  - courierId (ASC), status (ASC), createdAt (DESC)
  - status (ASC), pickupLocation.coordinates (GEO)
```

---

## Collection: `vendorApplications/{userId}`

**Purpose:** Store vendor application requests

### Document Structure

```typescript
interface VendorApplication {
  // Applicant
  userId: string;
  email: string;
  displayName: string;
  
  // Business Info
  businessName: string;
  businessDescription: string;
  businessType: 'individual' | 'llc' | 'corporation' | 'partnership';
  
  // Contact
  contactEmail: string;
  contactPhone: string;
  
  // Address
  businessAddress: Address;
  
  // Tax Info
  taxId?: string;                 // EIN or SSN (encrypted)
  
  // Categories
  categories: string[];           // What they plan to sell
  
  // Documents
  documents?: Array<{
    type: 'business_license' | 'tax_id' | 'insurance' | 'other';
    url: string;
    uploadedAt: Timestamp;
  }>;
  
  // Status
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  
  // Review
  reviewedBy?: string;            // Admin user ID
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  adminNotes?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Security Rules

```javascript
match /vendorApplications/{userId} {
  // Users can read their own application
  allow read: if request.auth.uid == userId;
  
  // Users can create one application
  allow create: if request.auth.uid == userId;
  
  // Admins can read and update all applications
  allow read, update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

---

## Collection: `reviews/{reviewId}`

**Purpose:** Store reviews for items, vendors, couriers

### Document Structure

```typescript
interface Review {
  id: string;
  
  // Review Subject
  reviewType: 'item' | 'vendor' | 'courier';
  subjectId: string;              // Item/vendor/courier ID
  
  // Reviewer
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  
  // Related Order/Delivery
  orderId?: string;
  deliveryId?: string;
  
  // Review Content
  rating: number;                 // 1-5
  title?: string;
  comment: string;
  
  // Media
  photos?: string[];
  
  // Response (from vendor/courier)
  response?: {
    text: string;
    respondedAt: Timestamp;
  };
  
  // Moderation
  isVerifiedPurchase?: boolean;
  isHidden?: boolean;
  reportCount?: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Best Practices

### 1. Data Denormalization
- Store frequently accessed data together
- Duplicate data when reads > writes
- Use Cloud Functions to maintain consistency

### 2. Pagination
- Use cursor-based pagination for large lists
- Limit queries to 25-50 documents
- Use `startAfter()` for "load more"

### 3. Real-time Listeners
- Only subscribe to data you need
- Unsubscribe when component unmounts
- Use snapshot listeners sparingly

### 4. Security
- Never trust client-side data
- Validate all writes with security rules
- Use server-side validation in Cloud Functions

### 5. Performance
- Create composite indexes for complex queries
- Avoid deep nesting (max 2-3 levels)
- Use batch writes for multiple updates

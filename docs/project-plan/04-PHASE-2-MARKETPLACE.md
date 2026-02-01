# Phase 2: Marketplace App

**Duration:** 5-7 days  
**Status:** Planning  
**Priority:** High

---

## 📋 Overview

Build on the existing `apps/marketplace-app` (Vite + React) as the unified marketplace application where users can both buy AND sell items. Implement a single user model with role-based permissions, then wrap with Capacitor for native iOS deployment.

**Core Principle:** One account, multiple capabilities. Every user can browse, buy, and sell.

**Feature Flag Requirement:** All new Phase 2 features must ship behind feature flags for safe rollout and instant rollback.

**Recommended Flags (create in admin UI):**
- `marketplace_v2` (master switch)
- `seller_portal_v2` (seller dashboard + listings)
- `listing_create_v1`
- `checkout_v2`
- `messaging_v1`
- `ratings_v1`
- `profile_v2`

---

## 🎯 Scope

### Unified User Model

**Before (Current):**
```
Separate Apps:
- Customer App (buyers only)
- Seller App (sellers only)
- Two different accounts
```

**After (v2):**
```
Single Marketplace App:
- One user account
- Can buy items (always)
- Can sell items (always)
- Seller profile auto-created on first listing
```

---

### Features to Implement

#### 1. Browse & Search (Public)
✅ **Marketplace Home**
- Grid view of all available items
- Category filters (Electronics, Clothing, Home, etc.)
- Search by keyword
- Sort by: Price, Date listed, Distance, Popularity
- Featured items carousel
- "Near me" location-based filtering

✅ **Item Details**
- High-quality photos (swipeable gallery)
- Item title and description
- Price (with delivery fee estimate)
- Seller profile card (name, rating, location)
- Condition (New, Like New, Good, Fair)
- Available quantity
- Delivery options (Standard, Express, Pickup)
- Similar items suggestions

#### 2. Buy Flow
✅ **Purchase Process**
- Add to cart (optional - can buy directly)
- Quantity selector
- Delivery address entry
- Delivery time slot selection
- Payment method (saved cards, new card)
- Order summary with fees breakdown
- Place order confirmation

✅ **Order Tracking**
- Order status timeline
- Real-time courier location (when assigned)
- Estimated delivery time
- Delivery photo (proof of delivery)
- Order history

✅ **Buyer Actions**
- Cancel order (before courier claims)
- Contact seller (in-app messaging)
- Rate seller after delivery
- Request refund/dispute

#### 3. Sell Flow
✅ **Listing Creation**
- Take/upload photos (min 1, max 8)
- Item title (required, max 100 chars)
- Description (required, max 500 chars)
- Category selection
- Condition selector
- Price entry (min $1, max $10,000)
- Quantity (default 1)
- Delivery options checkboxes
- Pickup location (if pickup enabled)
- Publish button

✅ **Seller Dashboard**
- Active listings grid
- Sold items history
- Pending orders (awaiting courier)
- In-transit orders
- Completed orders
- Total revenue (minus fees)
- Performance metrics (views, favorites, conversions)

✅ **Listing Management**
- Edit listing (price, description, photos)
- Mark as sold (external sale)
- Delete listing
- Duplicate listing
- Share listing (link)

✅ **Order Management**
- View incoming orders
- Accept/decline orders (optional setting)
- Cancel order (with reason)
- Contact buyer
- Track delivery status
- Confirm delivery completion

#### 4. Messaging System
✅ **Chat Interface**
- List of conversations
- Real-time message updates
- Message with buyers/sellers
- Order context in chat header
- Photo sharing
- Quick replies (preset messages)
- Read receipts
- Push notifications for new messages

#### 5. Ratings & Reviews
✅ **Rating System**
- 5-star rating scale
- Written review (optional, max 300 chars)
- Rate as buyer (rate seller)
- Rate as seller (rate buyer)
- View received ratings
- Average rating display
- Rating count display

✅ **Profile Trust Indicators**
- Verified phone number badge
- Identity verified badge
- Response time average
- Completion rate percentage
- Member since date

#### 6. User Profile
✅ **Profile Sections**
- Profile photo
- Display name
- Bio (max 200 chars)
- Location (city, state)
- Member since
- Rating as buyer
- Rating as seller
- Active listings count
- Completed transactions count

✅ **Settings**
- Edit profile
- Notification preferences
- Payment methods
- Saved addresses
- Privacy settings
- Account deletion

---

## 🏗️ Technical Architecture

### Project Structure

```
apps/marketplace-app/
├── src/
│   ├── components/
│   │   ├── browse/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemGrid.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── CategoryFilter.tsx
│   │   │   └── SortDropdown.tsx
│   │   ├── buy/
│   │   │   ├── ItemDetails.tsx
│   │   │   ├── PurchaseForm.tsx
│   │   │   ├── OrderSummary.tsx
│   │   │   ├── OrderTracking.tsx
│   │   │   └── DeliveryMap.tsx
│   │   ├── sell/
│   │   │   ├── ListingForm.tsx
│   │   │   ├── PhotoUploader.tsx
│   │   │   ├── SellerDashboard.tsx
│   │   │   ├── ListingCard.tsx
│   │   │   └── SalesAnalytics.tsx
│   │   ├── messaging/
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── ratings/
│   │   │   ├── RatingForm.tsx
│   │   │   ├── RatingDisplay.tsx
│   │   │   └── ReviewCard.tsx
│   │   └── shared/
│   │       ├── UserAvatar.tsx
│   │       ├── PriceDisplay.tsx
│   │       ├── StatusBadge.tsx
│   │       └── TrustBadges.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── ItemDetails.tsx
│   │   ├── Checkout.tsx
│   │   ├── MyOrders.tsx
│   │   ├── MySales.tsx
│   │   ├── CreateListing.tsx
│   │   ├── EditListing.tsx
│   │   ├── Messages.tsx
│   │   ├── Profile.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useMarketplace.ts
│   │   ├── useOrders.ts
│   │   ├── useListings.ts
│   │   ├── useMessages.ts
│   │   └── useRatings.ts
│   ├── services/
│   │   ├── marketplace.service.ts
│   │   ├── orders.service.ts
│   │   ├── listings.service.ts
│   │   ├── messaging.service.ts
│   │   └── ratings.service.ts
│   ├── types/
│   │   ├── marketplace.types.ts
│   │   ├── order.types.ts
│   │   ├── listing.types.ts
│   │   ├── message.types.ts
│   │   └── rating.types.ts
│   └── utils/
│       ├── formatPrice.ts
│       ├── calculateFees.ts
│       └── imageCompression.ts
├── capacitor.config.ts
├── ios/
│   └── App/ (generated by Capacitor)
├── public/
│   └── assets/
└── package.json
```

### Routing & Navigation

**Public routes:**
- `/` → Marketplace home
- `/marketplace` and `/marketplace/:itemId`

**Seller routes (protected):**
- `/seller/apply`
- `/seller/dashboard`
- `/seller/items/new`
- `/seller/items/:itemId/edit`
- `/seller/orders`

**Profile routes (protected):**
- `/profile/listings`
- `/profile/seller-settings`
- `/profile/stripe-onboarding`

---

## 📊 Data Models

### MarketplaceItem

```typescript
interface MarketplaceItem {
  id: string;
  sellerId: string;
  
  // Item details
  title: string;
  description: string;
  category: ItemCategory;
  condition: ItemCondition;
  price: number; // in cents
  quantity: number;
  
  // Media
  photos: string[]; // Storage URLs (max 8)
  primaryPhotoIndex: number;
  
  // Delivery
  deliveryOptions: DeliveryOption[];
  pickupLocation?: GeoPoint;
  pickupAddress?: string;
  
  // Status
  status: ListingStatus;
  isActive: boolean;
  isFeatured: boolean;
  
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

enum ItemCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  HOME_GARDEN = 'home_garden',
  SPORTS = 'sports',
  BOOKS = 'books',
  TOYS = 'toys',
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
  REMOVED = 'removed'
}
```

---

### Order

```typescript
interface Order {
  id: string;
  
  // Parties
  buyerId: string;
  sellerId: string;
  courierId?: string;
  
  // Item reference
  itemId: string;
  itemSnapshot: {
    title: string;
    price: number;
    photos: string[];
    condition: ItemCondition;
  };
  quantity: number;
  
  // Delivery
  deliveryAddress: Address;
  deliveryOption: DeliveryOption;
  deliveryInstructions?: string;
  pickupLocation?: GeoPoint;
  
  // Pricing
  itemPrice: number; // total for quantity
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;
  
  // Payment
  paymentIntentId: string;
  paymentStatus: PaymentStatus;
  
  // Job reference (when courier claims)
  jobId?: string;
  
  // Status
  status: OrderStatus;
  
  // Timeline
  placedAt: Timestamp;
  acceptedAt?: Timestamp;
  claimedAt?: Timestamp;
  deliveredAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  
  // Metadata
  cancellationReason?: string;
  disputeId?: string;
}

enum OrderStatus {
  PENDING = 'pending',           // Order placed, awaiting seller
  ACCEPTED = 'accepted',         // Seller accepted
  AWAITING_COURIER = 'awaiting_courier', // Ready for pickup
  CLAIMED = 'claimed',           // Courier claimed job
  IN_TRANSIT = 'in_transit',     // Courier picked up item
  DELIVERED = 'delivered',       // Delivery complete
  COMPLETED = 'completed',       // Rated and closed
  CANCELLED = 'cancelled',       // Cancelled by buyer/seller
  DISPUTED = 'disputed'          // In dispute resolution
}

enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}
```

---

### User (Enhanced)

```typescript
interface User {
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
  sellerProfile?: {
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
  };
  
  // Buyer profile
  buyerProfile?: {
    totalOrders: number;
    rating: number;
    ratingCount: number;
    favoriteItems: string[]; // item IDs
  };
  
  // Trust & Safety
  isVerified: boolean;
  isPhoneVerified: boolean;
  verificationLevel: VerificationLevel;
  
  // Payment
  stripeCustomerId?: string;
  stripeConnectAccountId?: string; // for sellers
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

enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  COURIER = 'courier',
  ADMIN = 'admin'
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
  city: string;
  state: string;
  zipCode: string;
  country: string;
  location: GeoPoint;
  instructions?: string;
  isDefault: boolean;
}

interface NotificationPrefs {
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
```

---

### Message

```typescript
interface Message {
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

interface Conversation {
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
  
  // Unread counts
  unreadCount: {
    [userId: string]: number;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

enum MessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  SYSTEM = 'system'
}
```

---

### Rating

```typescript
interface Rating {
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
```

---

## 🔥 Firebase Collections

```
users/
  {userId}/

marketplaceItems/
  {itemId}/

orders/
  {orderId}/

conversations/
  {conversationId}/
    messages/
      {messageId}/

ratings/
  {ratingId}/

favorites/
  {userId}/
    items/
      {itemId}/ # auto-ID

transactions/
  {transactionId}/
```

---

## 🔧 Core Services

### marketplace.service.ts

```typescript
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  GeoPoint,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class MarketplaceService {
  
  // Browse items
  async getItems(filters: ItemFilters): Promise<MarketplaceItem[]> {
    let q = query(
      collection(db, 'marketplaceItems'),
      where('isActive', '==', true),
      where('status', '==', 'active')
    );
    
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    
    if (filters.maxPrice) {
      q = query(q, where('price', '<=', filters.maxPrice));
    }
    
    // Sort
    if (filters.sortBy === 'price_asc') {
      q = query(q, orderBy('price', 'asc'));
    } else if (filters.sortBy === 'price_desc') {
      q = query(q, orderBy('price', 'desc'));
    } else {
      q = query(q, orderBy('publishedAt', 'desc'));
    }
    
    q = query(q, limit(filters.limit || 20));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketplaceItem));
  }
  
  // Search items
  async searchItems(searchTerm: string): Promise<MarketplaceItem[]> {
    // Note: This is a simple implementation
    // For production, use Algolia or similar
    const q = query(
      collection(db, 'marketplaceItems'),
      where('isActive', '==', true),
      orderBy('title')
    );
    
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketplaceItem));
    
    // Client-side filtering (not ideal for large datasets)
    return items.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Get item details
  async getItem(itemId: string): Promise<MarketplaceItem | null> {
    const docRef = doc(db, 'marketplaceItems', itemId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    // Increment view count
    await updateDoc(docRef, {
      views: docSnap.data().views + 1
    });
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as MarketplaceItem;
  }
  
  // Create listing
  async createListing(listing: Omit<MarketplaceItem, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'marketplaceItems'), {
      ...listing,
      views: 0,
      favorites: 0,
      soldCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Update user seller profile
    await this.activateSellerProfile(listing.sellerId);
    
    return docRef.id;
  }
  
  // Update listing
  async updateListing(itemId: string, updates: Partial<MarketplaceItem>): Promise<void> {
    const docRef = doc(db, 'marketplaceItems', itemId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }
  
  // Delete listing
  async deleteListing(itemId: string): Promise<void> {
    const docRef = doc(db, 'marketplaceItems', itemId);
    await updateDoc(docRef, {
      status: ListingStatus.REMOVED,
      isActive: false,
      updatedAt: Timestamp.now()
    });
  }
  
  // Activate seller profile
  private async activateSellerProfile(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    
    // Check if seller profile already exists
    if (!userData.sellerProfile) {
      await updateDoc(userRef, {
        'sellerProfile': {
          isActive: true,
          activeListings: 1,
          totalSales: 0,
          totalRevenue: 0,
          rating: 0,
          ratingCount: 0,
          responseTimeAvg: 0,
          completionRate: 0,
          joinedAsSellerAt: Timestamp.now()
        },
        'roles': [...(userData.roles || []), UserRole.SELLER]
      });
    } else {
      // Increment active listings
      await updateDoc(userRef, {
        'sellerProfile.activeListings': userData.sellerProfile.activeListings + 1
      });
    }
  }
}

interface ItemFilters {
  category?: ItemCategory;
  condition?: ItemCondition;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'popular';
  limit?: number;
  nearLocation?: GeoPoint;
  radiusMiles?: number;
}
```

---

### orders.service.ts

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export class OrdersService {
  
  // Create order (calls Cloud Function)
  async createOrder(orderData: CreateOrderInput): Promise<Order> {
    const createOrderFn = httpsCallable(functions, 'createOrder');
    const result = await createOrderFn(orderData);
    return result.data as Order;
  }
  
  // Get order details
  async getOrder(orderId: string): Promise<Order> {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Order not found');
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Order;
  }
  
  // Get buyer orders
  async getBuyerOrders(buyerId: string): Promise<Order[]> {
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', buyerId),
      orderBy('placedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  }
  
  // Get seller orders
  async getSellerOrders(sellerId: string): Promise<Order[]> {
    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', sellerId),
      orderBy('placedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  }
  
  // Cancel order
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const cancelOrderFn = httpsCallable(functions, 'cancelOrder');
    await cancelOrderFn({ orderId, reason });
  }
  
  // Track order (real-time)
  subscribeToOrder(orderId: string, callback: (order: Order) => void): Unsubscribe {
    const docRef = doc(db, 'orders', orderId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...snapshot.data()
        } as Order);
      }
    });
  }
}

interface CreateOrderInput {
  itemId: string;
  quantity: number;
  deliveryAddress: Address;
  deliveryOption: DeliveryOption;
  deliveryInstructions?: string;
  paymentMethodId: string;
}
```

---

## 📱 Capacitor iOS Setup

### capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosenderr.marketplace',
  appName: 'GoSenderr',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      quality: 90,
      allowEditing: true,
      resultType: 'uri'
    }
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
```

### Install Capacitor

```bash
# Install Capacitor
pnpm add @capacitor/core @capacitor/cli @capacitor/ios

# Install plugins
pnpm add @capacitor/camera @capacitor/push-notifications @capacitor/geolocation @capacitor/share

# Initialize Capacitor
npx cap init

# Add iOS platform
npx cap add ios

# Build web app
pnpm build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### iOS-Specific Features

```typescript
// hooks/useCamera.ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export function useCamera() {
  const takePicture = async () => {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });
    
    return image.webPath;
  };
  
  const pickImage = async () => {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos
    });
    
    return image.webPath;
  };
  
  return { takePicture, pickImage };
}
```

```typescript
// hooks/usePushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications';

export function usePushNotifications() {
  const registerPush = async () => {
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive !== 'granted') {
      throw new Error('Push permission denied');
    }
    
    await PushNotifications.register();
  };
  
  const addListeners = () => {
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Send token to backend
    });
    
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });
    
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });
    
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });
  };
  
  return { registerPush, addListeners };
}
```

---

## 📝 Implementation Steps

### Day 1: Database Schema & User Model

**Morning (4 hours):**
1. Design complete Firestore collections schema
2. Create TypeScript interfaces for all models
3. Set up Firestore indexes
4. Write security rules for marketplace collections

**Afternoon (4 hours):**
5. Create feature flags in Firestore and admin UI
6. Implement user profile enhancement (seller profile auto-create)
7. Create migration script for existing users (sellerId + sellerProfile)
8. Test user model + flags with Firebase Auth and seed data

**Deliverable:** Database schema complete, user model working

---

### Day 2: Browse & Item Details

**Morning (4 hours):**
1. Build marketplace home page
2. Implement item grid component
3. Add category filters
4. Build search functionality
5. Implement sorting options

**Afternoon (4 hours):**
6. Build item details page
7. Add photo gallery (swipeable)
8. Display seller profile card
9. Add "Contact Seller" button
10. Implement similar items section

**Deliverable:** Browse and view items working

---

### Day 3: Sell Flow

**Morning (4 hours):**
1. Build listing creation form
2. Implement photo uploader (with compression)
3. Add category and condition selectors
4. Implement price validation
5. Build listing preview

**Afternoon (4 hours):**
6. Build seller dashboard
7. Display active listings
8. Implement edit listing
9. Add delete listing
10. Build sales analytics view

**Deliverable:** Users can create and manage listings

---

### Day 4: Buy Flow & Orders

**Morning (4 hours):**
1. Build checkout page
2. Implement address entry/selection
3. Add payment method selection
4. Build order summary
5. Create order placement flow

**Afternoon (4 hours):**
6. Build order tracking page
7. Implement real-time status updates
8. Add delivery map view
9. Build order history
10. Implement cancel order

**Deliverable:** Complete purchase and order tracking working

---

### Day 5: Messaging & Ratings

**Morning (4 hours):**
1. Design conversation schema
2. Build chat list page
3. Implement chat window
4. Add real-time message updates
5. Build message input with photo sharing

**Afternoon (4 hours):**
6. Build rating form
7. Implement rating submission
8. Display ratings on profiles
9. Build reviews section
10. Add rating calculations

**Deliverable:** Messaging and ratings functional

---

### Day 6: Capacitor iOS Setup

**Morning (4 hours):**
1. Install Capacitor and iOS platform
2. Configure capacitor.config.ts
3. Add iOS-specific plugins (Camera, Push, etc.)
4. Build and sync web app
5. Test in Xcode simulator

**Afternoon (4 hours):**
6. Implement camera integration
7. Set up push notifications
8. Test geolocation
9. Add share functionality
10. Polish iOS-specific UI

**Deliverable:** iOS app runs in simulator

---

### Day 7: Testing & Deployment

**Morning (4 hours):**
1. Test complete user flows (buy, sell, message, rate)
2. Fix bugs and UI issues
3. Test on physical iOS device
4. Optimize performance
5. Compress and lazy-load images

**Afternoon (4 hours):**
6. Deploy web app to Firebase Hosting
7. Create iOS app screenshots
8. Write App Store description
9. Submit iOS app for TestFlight
10. Document deployment process

**Deliverable:** Web app deployed, iOS app submitted

---

## 🎨 UI/UX Guidelines

### Mobile-First Design
- Touch targets: min 44x44pt
- Bottom navigation bar (Home, Search, Sell, Messages, Profile)
- Pull-to-refresh for lists
- Infinite scroll for item grid
- Swipe gestures for photo gallery

### Color Scheme
```css
:root {
  --primary: #2563eb; /* Blue for actions */
  --success: #16a34a; /* Green for sold/delivered */
  --warning: #eab308; /* Yellow for pending */
  --danger: #dc2626; /* Red for cancelled */
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --border: #e5e7eb;
}
```

### Typography
- Headings: Inter Bold
- Body: Inter Regular
- Price: Inter SemiBold (large, prominent)

---

## 🚨 Common Issues & Solutions

### Issue: Photo uploads too slow
**Solution:** Compress images client-side before upload. Target: < 1MB per photo

```typescript
import imageCompression from 'browser-image-compression';

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  
  return await imageCompression(file, options);
}
```

---

### Issue: Search not finding items
**Solution:** Implement full-text search with Algolia or Typesense

```typescript
// algolia.service.ts
import algoliasearch from 'algoliasearch';

const client = algoliasearch('APP_ID', 'SEARCH_API_KEY');
const index = client.initIndex('marketplace_items');

export async function searchItems(query: string) {
  const { hits } = await index.search(query);
  return hits;
}
```

---

### Issue: Real-time updates causing too many reads
**Solution:** Use local caching and debounce updates

```typescript
import { onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { debounce } from 'lodash';

const debouncedUpdate = debounce((data) => {
  setState(data);
}, 500);

onSnapshot(query, (snapshot) => {
  debouncedUpdate(snapshot.docs);
});
```

---

### Issue: iOS app rejected for missing privacy descriptions
**Solution:** Add required keys to Info.plist

```xml
<!-- ios/App/App/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos of items you're selling.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select photos of items you're selling.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to show nearby items and calculate delivery fees.</string>
```

---

## 📊 User Flows

### Buyer Journey

```
1. Open app (browse as guest)
   ↓
2. Browse items or search
   ↓
3. View item details
   ↓
4. Sign up / Login (required to buy)
   ↓
5. Add delivery address
   ↓
6. Enter payment method
   ↓
7. Place order
   ↓
8. Track order (real-time)
   ↓
9. Receive item + photo proof
   ↓
10. Rate seller
```

### Seller Journey

```
1. Sign up / Login
   ↓
2. Tap "Sell" button
   ↓
3. Take/upload photos (seller profile auto-created)
   ↓
4. Fill item details (title, price, category)
   ↓
5. Publish listing
   ↓
6. Wait for order
   ↓
7. Receive order notification
   ↓
8. Accept order (optional)
   ↓
9. Wait for courier to claim
   ↓
10. Courier picks up item
   ↓
11. Track delivery
   ↓
12. Order completed
   ↓
13. Rate buyer
   ↓
14. Receive payout
```

---

## 🚦 Feature Flags & Rollout Plan

1. **Deploy code with flags off** (`marketplace_v2=false`)
2. **Create flags in admin UI** with clear descriptions
3. **Enable for internal admins only** (test cohort)
4. **Gradual rollout** (10% → 25% → 50% → 100%)
5. **Monitor logs and support tickets** during rollout
6. **Rollback instantly** by toggling flags off if issues arise

**Minimum kill switches:**
- `marketplace_v2`
- `seller_portal_v2`
- `checkout_v2`

---

## ✅ Testing Checklist

### Functional Testing
- [ ] Browse items without login
- [ ] Search items by keyword
- [ ] Filter by category
- [ ] Sort by price/date
- [ ] View item details
- [ ] Create listing (with photos)
- [ ] Edit listing
- [ ] Delete listing
- [ ] Purchase item
- [ ] Track order
- [ ] Cancel order
- [ ] Message seller/buyer
- [ ] Rate user
- [ ] View profile
- [ ] Update profile

### iOS-Specific Testing
- [ ] Camera capture works
- [ ] Photo library selection works
- [ ] Push notifications received
- [ ] Location permission requested
- [ ] Share functionality works
- [ ] Deep links work
- [ ] App badge updates
- [ ] Background notifications

### Performance Testing
- [ ] App launch < 2 seconds
- [ ] Item grid scrolls smoothly
- [ ] Photo upload < 5 seconds
- [ ] Search results < 1 second
- [ ] Real-time updates < 500ms

---

## 📈 Success Criteria

- [ ] Users can browse items without login
- [ ] Users can create listings
- [ ] Users can purchase items
- [ ] Messaging works between buyers/sellers
- [ ] Ratings system functional
- [ ] Web app deployed to Firebase
- [ ] iOS app submitted to App Store
- [ ] At least 10 test users can complete full flow
- [ ] Zero critical bugs
- [ ] Performance metrics met

---

## 🔄 Phase 2 Exit Criteria

**Ready to proceed to Phase 3 when:**
1. ✅ Unified user model implemented
2. ✅ Browse and search working
3. ✅ Listing creation functional
4. ✅ Purchase flow complete
5. ✅ Order tracking working
6. ✅ Messaging system operational
7. ✅ Ratings implemented
8. ✅ Web app deployed
9. ✅ iOS app submitted to TestFlight
10. ✅ All critical tests passing

---

*This phase transforms the customer app into a full marketplace with unified buyer/seller capabilities.*

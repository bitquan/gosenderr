# 🔌 GOSENDERR - API DOCUMENTATION

## Overview

GoSenderR uses a combination of:
- **Firebase Client SDK** for direct Firestore access
- **Cloud Functions** for server-side operations
- **REST API** for external integrations

---

## Authentication

All API requests require authentication using Firebase Auth tokens.

### Getting an Auth Token

```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
const token = await user.getIdToken();

// Include in API requests
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## Cloud Functions API

Base URL: `https://us-central1-gosenderr-6773f.cloudfunctions.net`

### Marketplace Functions

#### `POST /createMarketplaceItem`

Create a new marketplace item.

**Request:**
```typescript
{
  title: string;
  description: string;
  category: string;
  price: number;          // In cents
  quantity: number;
  images: string[];       // Firebase Storage URLs
  condition: 'new' | 'used' | 'refurbished';
}
```

**Response:**
```typescript
{
  success: true;
  itemId: string;
  item: MarketplaceItem;
}
```

---

#### `PUT /updateMarketplaceItem`

Update an existing marketplace item.

**Request:**
```typescript
{
  itemId: string;
  updates: Partial<MarketplaceItem>;
}
```

**Response:**
```typescript
{
  success: true;
  item: MarketplaceItem;
}
```

---

#### `DELETE /deleteMarketplaceItem`

Delete a marketplace item (soft delete).

**Request:**
```typescript
{
  itemId: string;
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
}
```

---

#### `GET /searchMarketplace`

Search marketplace items.

**Query Parameters:**
- `q` - Search query
- `category` - Filter by category
- `minPrice` - Minimum price (cents)
- `maxPrice` - Maximum price (cents)
- `condition` - Item condition
- `sortBy` - Sort field (price, date, popularity)
- `sortOrder` - asc | desc
- `limit` - Results per page (default: 20)
- `cursor` - Pagination cursor

**Response:**
```typescript
{
  items: MarketplaceItem[];
  hasMore: boolean;
  nextCursor?: string;
  total: number;
}
```

---

### Order Functions

#### `POST /createOrder`

Create a new order.

**Request:**
```typescript
{
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
  deliveryAddress: Address;
  paymentMethodId: string;      // Stripe payment method
  fulfillmentMethod: 'pickup' | 'shipping' | 'courier_delivery';
}
```

**Response:**
```typescript
{
  success: true;
  orderId: string;
  paymentIntentId: string;
  clientSecret: string;          // For Stripe confirmation
  total: number;
}
```

---

#### `POST /confirmOrder`

Confirm order after payment.

**Request:**
```typescript
{
  orderId: string;
  paymentIntentId: string;
}
```

**Response:**
```typescript
{
  success: true;
  order: Order;
}
```

---

#### `PUT /updateOrderStatus`

Update order status (vendor only).

**Request:**
```typescript
{
  orderId: string;
  status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery';
  notes?: string;
}
```

**Response:**
```typescript
{
  success: true;
  order: Order;
}
```

---

#### `POST /cancelOrder`

Cancel an order.

**Request:**
```typescript
{
  orderId: string;
  reason: string;
  refundAmount?: number;         // Optional partial refund
}
```

**Response:**
```typescript
{
  success: true;
  refundId: string;
}
```

---

### Delivery Functions

#### `POST /createDelivery`

Create a new delivery request.

**Request:**
```typescript
{
  pickupLocation: {
    address: Address;
    coordinates: GeoPoint;
    instructions?: string;
  };
  dropoffLocation: {
    address: Address;
    coordinates: GeoPoint;
    instructions?: string;
  };
  packageDescription: string;
  packageSize: 'small' | 'medium' | 'large';
  scheduledPickupTime?: Timestamp;
}
```

**Response:**
```typescript
{
  success: true;
  deliveryId: string;
  estimatedPrice: number;
  estimatedDistance: number;
  estimatedDuration: number;
}
```

---

#### `POST /assignDelivery`

Assign delivery to courier (courier-initiated).

**Request:**
```typescript
{
  deliveryId: string;
}
```

**Response:**
```typescript
{
  success: true;
  delivery: Delivery;
}
```

---

#### `PUT /updateDeliveryStatus`

Update delivery status.

**Request:**
```typescript
{
  deliveryId: string;
  status: 'picked_up' | 'in_transit' | 'arrived' | 'delivered';
  currentLocation?: GeoPoint;
  proofOfDelivery?: {
    photo?: string;
    signature?: string;
    notes?: string;
  };
}
```

**Response:**
```typescript
{
  success: true;
  delivery: Delivery;
}
```

---

#### `POST /calculateDeliveryPrice`

Calculate delivery price before creating.

**Request:**
```typescript
{
  pickupCoordinates: GeoPoint;
  dropoffCoordinates: GeoPoint;
  packageSize: 'small' | 'medium' | 'large';
}
```

**Response:**
```typescript
{
  distance: number;              // Miles
  basePrice: number;             // Cents
  distanceFee: number;           // Cents
  serviceFee: number;            // Cents
  total: number;                 // Cents
  estimatedDuration: number;     // Minutes
}
```

---

### Vendor Functions

#### `POST /applyForVendor`

Submit vendor application.

**Request:**
```typescript
{
  businessName: string;
  businessDescription: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: Address;
  categories: string[];
  taxId?: string;
}
```

**Response:**
```typescript
{
  success: true;
  applicationId: string;
}
```

---

#### `POST /approveVendorApplication`

Approve vendor application (admin only).

**Request:**
```typescript
{
  userId: string;
  stripeConnectAccountId?: string;
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
}
```

---

#### `POST /rejectVendorApplication`

Reject vendor application (admin only).

**Request:**
```typescript
{
  userId: string;
  reason: string;
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
}
```

---

### Payment Functions

#### `POST /createPaymentIntent`

Create Stripe payment intent.

**Request:**
```typescript
{
  amount: number;                // In cents
  currency: string;              // Default: "USD"
  orderId?: string;
  deliveryId?: string;
  customerId: string;
}
```

**Response:**
```typescript
{
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
}
```

---

#### `POST /createStripeConnectAccount`

Create Stripe Connect account for vendor.

**Request:**
```typescript
{
  email: string;
  businessName: string;
  businessType: string;
}
```

**Response:**
```typescript
{
  accountId: string;
  onboardingUrl: string;         // Complete onboarding here
}
```

---

#### `POST /processVendorPayout`

Process payout to vendor (runs automatically).

**Request:**
```typescript
{
  vendorId: string;
  orderId: string;
  amount: number;
}
```

**Response:**
```typescript
{
  success: true;
  transferId: string;
}
```

---

### User Functions

#### `PUT /updateUserProfile`

Update user profile.

**Request:**
```typescript
{
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  deliveryAddresses?: Address[];
}
```

**Response:**
```typescript
{
  success: true;
  user: User;
}
```

---

#### `POST /switchRole`

Switch user's active role.

**Request:**
```typescript
{
  newRole: 'customer' | 'vendor' | 'courier' | 'admin';
}
```

**Response:**
```typescript
{
  success: true;
  primaryRole: string;
}
```

---

#### `POST /addRole`

Request to add a new role.

**Request:**
```typescript
{
  role: 'vendor' | 'courier';
  applicationData?: any;         // If application required
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
  requiresApproval: boolean;
}
```

---

### Notification Functions

#### `POST /sendNotification`

Send notification to user.

**Request:**
```typescript
{
  userId: string;
  title: string;
  body: string;
  type: 'order' | 'delivery' | 'vendor' | 'system';
  actionUrl?: string;
  data?: any;
}
```

**Response:**
```typescript
{
  success: true;
  notificationId: string;
}
```

---

### Admin Functions

#### `GET /getSystemStats`

Get system-wide statistics (admin only).

**Response:**
```typescript
{
  totalUsers: number;
  totalVendors: number;
  totalCouriers: number;
  totalOrders: number;
  totalDeliveries: number;
  totalRevenue: number;
  activeOrders: number;
  activeDeliveries: number;
  pendingApplications: number;
}
```

---

#### `GET /getUserList`

Get paginated user list (admin only).

**Query Parameters:**
- `role` - Filter by role
- `limit` - Results per page
- `cursor` - Pagination cursor

**Response:**
```typescript
{
  users: User[];
  hasMore: boolean;
  nextCursor?: string;
}
```

---

## Webhook Endpoints

### Stripe Webhooks

**Endpoint:** `/stripeWebhook`

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `checkout.session.completed`
- `account.updated` (Stripe Connect)
- `transfer.created`

---

## Client SDK Usage

### Marketplace API

```typescript
// src/lib/api/marketplace.ts

export async function getMarketplaceItems(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  const q = query(
    collection(db, 'marketplaceItems'),
    where('status', '==', 'active'),
    ...(filters?.category ? [where('category', '==', filters.category)] : []),
    orderBy('createdAt', 'desc'),
    limit(filters?.limit || 20)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MarketplaceItem[];
}

export async function getMarketplaceItem(itemId: string) {
  const docRef = doc(db, 'marketplaceItems', itemId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Item not found');
  }
  
  return { id: docSnap.id, ...docSnap.data() } as MarketplaceItem;
}

export async function createMarketplaceItem(data: CreateItemData) {
  const createItem = httpsCallable(functions, 'createMarketplaceItem');
  const result = await createItem(data);
  return result.data;
}
```

---

### Order API

```typescript
// src/lib/api/orders.ts

export async function createOrder(orderData: CreateOrderData) {
  const createOrderFn = httpsCallable(functions, 'createOrder');
  const result = await createOrderFn(orderData);
  return result.data;
}

export async function getCustomerOrders(customerId: string) {
  const q = query(
    collection(db, 'orders'),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
}

export async function trackOrder(orderId: string) {
  const docRef = doc(db, 'orders', orderId);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Order;
    }
  });
}
```

---

### Delivery API

```typescript
// src/lib/api/deliveries.ts

export async function createDelivery(deliveryData: CreateDeliveryData) {
  const createDeliveryFn = httpsCallable(functions, 'createDelivery');
  const result = await createDeliveryFn(deliveryData);
  return result.data;
}

export async function trackDelivery(deliveryId: string) {
  const docRef = doc(db, 'deliveries', deliveryId);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Delivery;
    }
  });
}

export async function updateDeliveryLocation(
  deliveryId: string,
  location: GeoPoint
) {
  const updateFn = httpsCallable(functions, 'updateDeliveryStatus');
  await updateFn({
    deliveryId,
    status: 'in_transit',
    currentLocation: location
  });
}
```

---

## Error Handling

All API responses follow this error format:

```typescript
{
  success: false;
  error: {
    code: string;           // Error code
    message: string;        // Human-readable message
    details?: any;          // Additional error details
  }
}
```

### Common Error Codes

- `auth/unauthorized` - User not authenticated
- `auth/insufficient-permissions` - User lacks required role
- `not-found` - Resource not found
- `invalid-argument` - Invalid request data
- `already-exists` - Resource already exists
- `failed-precondition` - Operation not allowed in current state
- `internal` - Server error

---

## Rate Limiting

- **Anonymous users:** 100 requests/hour
- **Authenticated users:** 1000 requests/hour
- **Vendors:** 5000 requests/hour
- **Admins:** Unlimited

---

## Testing

### Development Environment

Use Firebase Emulators for local testing:

```bash
firebase emulators:start
```

**Emulator URLs:**
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Auth: http://localhost:9099

### Example Test

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

---

## Versioning

API version is included in function names:

- Current: `v1_createOrder`
- Future: `v2_createOrder`

Always use the latest version unless specified otherwise.

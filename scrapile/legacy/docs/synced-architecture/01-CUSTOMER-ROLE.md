# Customer Role - Synced Architecture Documentation

## Role Identity
- **Icon:** 👤
- **Display Name:** Customer / Order Up
- **Color:** Purple (#6B4EFF)
- **Tagline:** "Request. Track. Receive."
- **Purpose:** Order marketplace items, request deliveries, track shipments
- **Role in System:** Primary end-user, initiates all delivery requests and marketplace purchases

---

## User Document Structure (Firestore: `users/{uid}`)

```typescript
interface CustomerUser {
  uid: string
  email: string
  displayName?: string
  role: 'customer'  // Explicit role field
  
  // Saved information
  savedAddresses?: Array<{
    label: string
    address: string
    lat: number
    lng: number
  }>
  defaultPaymentMethod?: string  // Stripe payment method ID
  phoneNumber?: string
  
  // Stats (auto-updated by Cloud Functions)
  totalDeliveries: number
  completedDeliveries: number
  totalSpent: number
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Core Collections & Data Relationships

### 1. Jobs Collection (`jobs/{jobId}`)
**Created by:** Customer  
**Claimed by:** Courier  
**Managed by:** Admin

```typescript
interface Job {
  jobId: string
  createdByUid: string  // Customer UID
  courierUid: string | null
  
  status: 'open' | 'assigned' | 'enroute_pickup' | 'arrived_pickup' | 'picked_up' | 
          'enroute_dropoff' | 'arrived_dropoff' | 'completed' | 'cancelled'
  
  pickup: {
    lat: number
    lng: number
    address: string
  }
  dropoff: {
    lat: number
    lng: number
    address: string
  }
  
  itemId?: string  // If from marketplace
  pricing: {
    courierEarnings: number
    platformFee: number
    totalCharge: number
  }
  
  paymentStatus: 'authorized' | 'captured' | 'refunded' | 'refund_failed'
  stripePaymentIntentId: string
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Customer Interactions:**
- **CREATE:** When requesting delivery via `/customer/request-delivery`
- **READ:** Via `/customer/jobs` and `/customer/jobs/[jobId]`
- **UPDATE:** Can cancel if status is 'open' or 'assigned'
- **Triggers Cloud Function:** `onCreateJob` → sends courier notification

---

### 2. Marketplace Orders Collection (`marketplaceOrders/{orderId}`)
**Created by:** Customer (buyer)  
**Fulfilled by:** Vendor (seller)  
**Delivered by:** Courier

```typescript
interface MarketplaceOrder {
  orderId: string
  buyerId: string  // Customer UID
  sellerId: string  // Vendor UID
  itemId: string
  
  status: 'payment_pending' | 'paid' | 'preparing' | 'ready_for_pickup' | 
          'in_transit' | 'delivered' | 'cancelled' | 'refunded'
  
  item: {
    title: string
    price: number
    photoUrl: string
  }
  
  deliveryMethod: 'delivery' | 'pickup'
  deliveryAddress?: {
    address: string
    lat: number
    lng: number
  }
  
  pricing: {
    itemPrice: number
    deliveryFee: number  // 0 if pickup
    totalCharge: number
  }
  
  paymentStatus: 'authorized' | 'captured' | 'refunded'
  stripePaymentIntentId: string
  
  jobId?: string  // Created when vendor marks ready + delivery method
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Customer Interactions:**
- **CREATE:** Via marketplace checkout `/marketplace/checkout`
- **READ:** Via `/customer/orders` and `/customer/orders/[orderId]`
- **UPDATE:** Can cancel before `in_transit`
- **Triggers Cloud Function:** `capturePayment` when status → 'delivered'

---

### 3. Packages Collection (`packages/{packageId}`)
**Created by:** Customer (sender)  
**Transported by:** Runner  
**Delivered by:** Last-mile Courier

```typescript
interface Package {
  packageId: string
  senderId: string  // Customer UID
  recipientId?: string
  
  currentStatus: 'payment_pending' | 'pickup_pending' | 'at_origin_hub' | 
                 'in_transit' | 'at_destination_hub' | 'out_for_delivery' | 
                 'delivered' | 'failed'
  
  origin: {
    address: string
    lat: number
    lng: number
    hubId: string
  }
  destination: {
    address: string
    lat: number
    lng: number
    hubId: string
  }
  
  packageDetails: {
    weight: number  // lbs
    dimensions: { length: number, width: number, height: number }
    volume: number  // calculated
    description: string
  }
  
  serviceLevel: 'standard' | 'express' | 'overnight'
  trackingNumber: string
  
  journey: Array<{
    type: 'pickup' | 'hub_transfer' | 'long_haul' | 'last_mile'
    status: 'pending' | 'in_progress' | 'completed'
    fromHub?: string
    toHub?: string
    routeId?: string
    timestamp?: Timestamp
  }>
  
  pricing: {
    shippingFee: number
    breakdown: {
      baseFee: number
      weightFee: number
      distanceFee: number
      serviceLevelMultiplier: number
      platformFee: number
    }
    totalCustomerPaid: number
  }
  
  paymentStatus: 'authorized' | 'captured' | 'refunded'
  stripePaymentIntentId: string
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Customer Interactions:**
- **CREATE:** Via `/ship` page
- **READ:** Via `/customer/packages` and `/track/package/[trackingNumber]`
- **UPDATE:** Cannot modify after creation (admin only)
- **Triggers Cloud Function:** `buildLongHaulRoutes` (nightly) assigns package to runner route

---

### 4. Ratings Collection (`ratings/{ratingId}`)
**Created by:** Customer (rating Courier) OR Courier (rating Customer)  
**Enforced by:** Cloud Function `enforceRatings`

```typescript
interface Rating {
  ratingId: string
  deliveryJobId: string
  fromUserId: string  // Customer UID
  toUserId: string  // Courier UID
  role: 'customer' | 'courier'
  
  stars: number  // 1-5
  review?: string
  categories?: {
    professionalism?: number
    timeliness?: number
    communication?: number
    care?: number
  }
  
  createdAt: Timestamp
}
```

**Customer Interactions:**
- **CREATE:** After job completion via rating modal
- **READ:** Own ratings only
- **Triggers Cloud Function:** `enforceRatings` → updates courier's averageRating, auto-suspends if < 3.5 with 5+ ratings

---

## Firestore Security Rules

```javascript
// ==========================================
// CUSTOMER ROLE SECURITY RULES
// ==========================================

// Jobs: Customer can read/write their own jobs
match /jobs/{jobId} {
  // Customer can read jobs they created
  allow read: if request.auth.uid == resource.data.createdByUid;
  
  // Courier can read jobs they claimed
  allow read: if request.auth.uid == resource.data.courierUid;
  
  // Admin can read all jobs
  allow read: if isAdmin();
  
  // Customer can create jobs
  allow create: if request.auth.uid == request.resource.data.createdByUid
                && request.resource.data.status == 'open';
  
  // Customer can cancel their own jobs
  allow update: if request.auth.uid == resource.data.createdByUid
                && resource.data.status in ['open', 'assigned']
                && request.resource.data.status == 'cancelled';
  
  // Courier can update job status (claim, progress)
  allow update: if request.auth.uid == resource.data.courierUid
                && isValidJobStatusTransition(resource, request.resource);
}

// Marketplace Orders: Buyer and seller can read
match /marketplaceOrders/{orderId} {
  allow read: if request.auth.uid == resource.data.buyerId
              || request.auth.uid == resource.data.sellerId
              || isAdmin();
  
  // Customer can create orders
  allow create: if request.auth.uid == request.resource.data.buyerId
                && request.resource.data.status == 'payment_pending';
  
  // Customer can cancel orders (before pickup)
  allow update: if request.auth.uid == resource.data.buyerId
                && resource.data.status in ['payment_pending', 'paid', 'preparing']
                && request.resource.data.status == 'cancelled';
  
  // Vendor can update order status (mark ready)
  allow update: if request.auth.uid == resource.data.sellerId
                && isValidOrderStatusTransition(resource, request.resource);
}

// Packages: Sender and recipient can read
match /packages/{packageId} {
  allow read: if request.auth.uid == resource.data.senderId
              || request.auth.uid == resource.data.recipientId
              || isAdmin();
  
  // Customer can create packages
  allow create: if request.auth.uid == request.resource.data.senderId
                && request.resource.data.currentStatus == 'payment_pending';
  
  // Customer can track packages (read-only after creation)
  // Only admin/runners can update package status
}

// Ratings: Can create, read own ratings
match /ratings/{ratingId} {
  allow read: if request.auth.uid == resource.data.fromUserId
              || request.auth.uid == resource.data.toUserId
              || isAdmin();
  
  // Can create rating for completed delivery
  allow create: if request.auth.uid == request.resource.data.fromUserId
                && deliveryJobIsCompleted(request.resource.data.deliveryJobId)
                && !hasRatedDelivery(request.resource.data.fromUserId, request.resource.data.deliveryJobId);
}

// Helper Functions
function isAdmin() {
  return request.auth.token.role == 'admin';
}

function isValidJobStatusTransition(before, after) {
  // Implement status machine logic
  return true;  // Simplified
}

function deliveryJobIsCompleted(jobId) {
  return get(/databases/$(database)/documents/jobs/$(jobId)).data.status == 'completed';
}

function hasRatedDelivery(userId, jobId) {
  return !exists(/databases/$(database)/documents/ratings/$(userId)_$(jobId));
}
```

---

## Cloud Functions Integration

### 1. `onCreateJob` (Firestore Trigger)
**Trigger:** When customer creates job document  
**Purpose:** Notify available couriers in range

```typescript
exports.onCreateJob = functions.firestore
  .document('jobs/{jobId}')
  .onCreate(async (snapshot, context) => {
    const job = snapshot.data()
    
    // Find couriers within range
    const couriers = await findCouriersInRange(job.pickup, job.serviceRadius)
    
    // Send push notifications
    await sendNotifications(couriers, {
      title: 'New Job Available',
      body: `New delivery: $${job.pricing.courierEarnings / 100}`,
      data: { jobId: snapshot.id }
    })
  })
```

**Customer Impact:** Faster courier response, increased job claim rate

---

### 2. `capturePayment` (Firestore Trigger)
**Trigger:** When job/order status → 'delivered' or 'completed'  
**Purpose:** Capture pre-authorized Stripe payment

```typescript
exports.capturePayment = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    if (before.status !== 'completed' && after.status === 'completed') {
      // Capture payment from hold
      await stripe.paymentIntents.capture(after.stripePaymentIntentId)
      
      // Update payment status
      await change.after.ref.update({
        paymentStatus: 'captured',
        capturedAt: admin.firestore.Timestamp.now()
      })
    }
  })
```

**Customer Impact:** Payment only charged after successful delivery

---

### 3. `refundPayment` (Firestore Trigger)
**Trigger:** When job/order status → 'cancelled'  
**Purpose:** Automatically refund customer

```typescript
exports.refundPayment = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    if (before.status !== 'cancelled' && after.status === 'cancelled') {
      try {
        // Refund Stripe payment intent
        await stripe.refunds.create({
          payment_intent: after.stripePaymentIntentId
        })
        
        await change.after.ref.update({
          paymentStatus: 'refunded',
          refundedAt: admin.firestore.Timestamp.now()
        })
      } catch (error) {
        // Flag for admin review
        await change.after.ref.update({
          paymentStatus: 'refund_failed',
          refundError: error.message
        })
      }
    }
  })
```

**Customer Impact:** Immediate refund on cancellation

---

### 4. `autoCancel` (Scheduled Function)
**Schedule:** Every 15 minutes  
**Purpose:** Cancel jobs that haven't been claimed within timeout period

```typescript
exports.autoCancel = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const timeout = 30 * 60 * 1000  // 30 minutes
    const cutoff = Date.now() - timeout
    
    const staleJobs = await db.collection('jobs')
      .where('status', '==', 'open')
      .where('createdAt', '<', cutoff)
      .get()
    
    const batch = db.batch()
    staleJobs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancellationReason: 'auto_cancelled_no_courier',
        cancelledAt: admin.firestore.Timestamp.now()
      })
    })
    
    await batch.commit()
    // Triggers refundPayment function
  })
```

**Customer Impact:** Don't wait indefinitely, auto-refund if no courier

---

### 5. `sendNotifications` (Firestore Trigger)
**Trigger:** Job status changes, order updates  
**Purpose:** Keep customer informed

```typescript
exports.sendNotifications = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data()
    const customer = await db.collection('users').doc(after.createdByUid).get()
    
    const notificationMap = {
      'assigned': 'Courier accepted your delivery!',
      'enroute_pickup': 'Courier heading to pickup',
      'picked_up': 'Package picked up',
      'enroute_dropoff': 'Courier on the way to you!',
      'arrived_dropoff': 'Courier has arrived',
      'completed': 'Delivery completed!'
    }
    
    if (notificationMap[after.status]) {
      await sendPushNotification(customer.data().fcmToken, {
        title: 'Delivery Update',
        body: notificationMap[after.status],
        data: { jobId: context.params.jobId }
      })
    }
  })
```

**Customer Impact:** Real-time delivery status updates

---

## Inter-Role Data Flows

### Flow 1: Customer → Courier (Direct Delivery)
```
1. Customer creates job → jobs/{jobId}
   - status: 'open'
   - createdByUid: customer.uid
   - courierUid: null

2. onCreateJob trigger → Notifies couriers

3. Courier claims job → Transaction update
   - courierUid: courier.uid
   - status: 'assigned'
   - agreedFee: courier.rateCard.estimate

4. Courier updates status → Customer sees real-time
   - enroute_pickup → picked_up → enroute_dropoff → completed

5. capturePayment trigger → Charge customer

6. Customer rates courier → enforceRatings trigger
```

---

### Flow 2: Customer → Vendor → Courier (Marketplace Order)
```
1. Customer orders item → marketplaceOrders/{orderId}
   - status: 'paid'
   - buyerId: customer.uid
   - sellerId: vendor.uid

2. Vendor marks ready → order.status: 'ready_for_pickup'

3. System creates job → jobs/{jobId}
   - createdByUid: 'system'
   - itemId: order.itemId
   - pickup: vendor.location
   - dropoff: customer.deliveryAddress

4. Courier claims → Same as Flow 1

5. Delivery completed → capturePayment for both:
   - Vendor receives item price (minus fees)
   - Courier receives delivery fee

6. Customer can rate both vendor and courier
```

---

### Flow 3: Customer → Runner (Package Shipping)
```
1. Customer ships package → packages/{packageId}
   - currentStatus: 'pickup_pending'
   - senderId: customer.uid
   - journey: [{ type: 'pickup', status: 'pending' }]

2. Local courier picks up → Delivers to origin hub
   - journey[0].status: 'completed'
   - journey[1]: { type: 'hub_transfer', status: 'pending' }

3. buildLongHaulRoutes (nightly) → Assigns package to route
   - journey[1].routeId: longHaulRoute.id
   - journey[1].status: 'in_progress'

4. Runner claims route → Transport to destination hub
   - currentStatus: 'in_transit'

5. Runner delivers to destination hub
   - journey[1].status: 'completed'
   - currentStatus: 'at_destination_hub'

6. Last-mile courier → Delivers to customer
   - currentStatus: 'delivered'

7. capturePayment → Charge customer shipping fee
```

---

## Navigation & Pages

### Bottom Navigation
```typescript
[
  { icon: "🏠", label: "Home", href: "/customer/dashboard" },
  { icon: "🚚", label: "Jobs", href: "/customer/jobs" },
  { icon: "🛒", label: "Market", href: "/marketplace" },
  { icon: "👤", label: "Profile", href: "/customer/profile" }
]
```

### Floating Action Button
- Icon: ➕
- Label: "Request Delivery"
- Href: `/customer/request-delivery`

---

## Permissions Summary

### ✅ Customer CAN:
- Create delivery jobs (local < 50 mi)
- Order marketplace items
- Ship packages (long-distance)
- Track all deliveries in real-time
- Cancel jobs before pickup
- Rate couriers after delivery
- Save addresses for quick reuse
- View order history
- Add payment methods

### ❌ Customer CANNOT:
- Accept delivery jobs (courier role)
- See other customers' orders
- View courier earnings
- Access admin features
- Modify courier rate cards
- Approve package runners
- Cancel jobs after pickup started
- Edit completed delivery history
- View platform analytics

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Cross-References:**
- [Courier Role Documentation](./02-COURIER-ROLE.md)
- [Vendor Role Documentation](./04-VENDOR-ROLE.md)
- [Runner Role Documentation](./03-RUNNER-ROLE.md)
- [Admin Role Documentation](./05-ADMIN-ROLE.md)

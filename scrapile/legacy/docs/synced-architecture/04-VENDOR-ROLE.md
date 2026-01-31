# Vendor Role (Marketplace Seller) - Synced Architecture Documentation

## Role Identity
- **Icon:** 🏪
- **Display Name:** Vendor / Market Senderr / Seller
- **Color:** Blue (#3B82F6)
- **Tagline:** "List. Sell. Earn."
- **Purpose:** Sell items on marketplace with integrated delivery
- **Role in System:** Marketplace seller, creates inventory, fulfills orders, coordinates with couriers

---

## User Document Structure (Firestore: `users/{uid}`)

```typescript
interface VendorUser {
  uid: string
  email: string
  displayName?: string
  role: 'vendor'
  
  vendorProfile: {
    // Stripe Connect
    stripeConnectAccountId: string
    stripeAccountVerified: boolean
    payoutsEnabled: boolean
    onboardingComplete: boolean
    
    // Business Information
    businessName?: string
    businessType: 'individual' | 'company'
    businessAddress?: {
      street: string
      city: string
      state: string
      zip: string
      country: string
    }
    
    // Statistics (auto-updated by Cloud Functions)
    totalListings: number
    activeListings: number
    soldListings: number
    totalRevenue: number  // cents
    averageRating: number  // 0-5
    totalRatings: number
    
    // Settings
    autoAcceptOrders: boolean  // Auto-mark orders as preparing
    prepTimeMinutes: number  // Avg time to mark order ready (default 15)
    notificationsEnabled: boolean
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Core Collections & Vendor Interactions

### 1. Items Collection (`items/{itemId}`)
**Created by:** Vendor  
**Purchased by:** Customer  
**Delivered by:** Courier

```typescript
interface Item {
  itemId: string
  sellerId: string  // Vendor UID
  
  // Listing Details
  title: string
  description: string
  price: number  // cents
  category: 'electronics' | 'furniture' | 'clothing' | 'food' | 'other'
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  
  // Photos
  photos: string[]  // URLs (max 5)
  mainPhotoUrl: string  // First photo
  
  // Delivery Options
  deliveryMethods: Array<'delivery' | 'pickup'>
  pickupLocation: {
    address: string
    lat: number
    lng: number
  }
  
  // Food-Specific Fields
  isFoodItem: boolean
  foodDetails?: {
    temperature: 'hot' | 'cold' | 'frozen' | 'room_temp'
    equipmentRequired: string[]  // ['cooler', 'hot_bag']
    pickupInstructions: string
    referencePhotoUrl?: string  // Photo of packaged item
  }
  
  // Status
  status: 'available' | 'sold' | 'unavailable' | 'removed'
  
  // Stats
  views: number
  favorites: number
  
  createdAt: Timestamp
  updatedAt: Timestamp
  soldAt?: Timestamp
}
```

**Vendor Operations:**
- **CREATE:** Via `/marketplace/create`
- **READ:** Own items at `/vendor/items`
- **UPDATE:** Edit listing at `/vendor/items/[itemId]/edit`
- **DELETE:** Soft delete (status: 'removed')

---

### 2. Marketplace Orders Collection (`marketplaceOrders/{orderId}`)
**Created by:** Customer checkout  
**Fulfilled by:** Vendor  
**Delivered by:** Courier (if delivery selected)

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
    description: string
  }
  
  deliveryMethod: 'delivery' | 'pickup'
  
  // If delivery
  deliveryAddress?: {
    address: string
    lat: number
    lng: number
  }
  
  // If pickup
  pickupTime?: Timestamp
  pickupLocation?: {
    address: string
    lat: number
    lng: number
  }
  
  pricing: {
    itemPrice: number
    deliveryFee: number  // 0 if pickup
    platformFee: number  // 15% of item price (0 for pickup)
    stripeFee: number  // 2.9% + $0.30 (0 for pickup)
    vendorReceives: number  // itemPrice - platformFee - stripeFee
    totalCharge: number  // What customer pays
  }
  
  paymentStatus: 'authorized' | 'captured' | 'refunded' | 'refund_failed'
  stripePaymentIntentId?: string  // null if pickup + cash
  
  // Created when vendor marks ready + delivery method
  jobId?: string  // Links to jobs collection
  
  // Tracking
  vendorMarkedReadyAt?: Timestamp
  courierPickedUpAt?: Timestamp
  deliveredAt?: Timestamp
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Vendor Status Flow:**
```
payment_pending → paid → [VENDOR] preparing → [VENDOR] ready_for_pickup
→ [COURIER] in_transit → [COURIER] delivered
```

**Vendor Actions:**
1. **Mark as Preparing:** Auto (if autoAcceptOrders) or manual
2. **Mark Ready for Pickup:** Updates status, creates job if delivery method
3. **Cancel Order:** Before courier pickup, triggers refund

---

## Firestore Security Rules

```javascript
// ==========================================
// VENDOR ROLE SECURITY RULES
// ==========================================

// Items: Vendor can create/edit their own listings
match /items/{itemId} {
  // Anyone can read available items
  allow read: if true;
  
  // Vendor can create items
  allow create: if request.auth.uid == request.resource.data.sellerId
                && request.resource.data.status == 'available'
                && validateItemData(request.resource.data);
  
  // Vendor can update/delete own items
  allow update, delete: if request.auth.uid == resource.data.sellerId;
  
  // Admin can moderate any item
  allow update, delete: if isAdmin();
}

// Marketplace Orders: Vendor can read and update their orders
match /marketplaceOrders/{orderId} {
  // Buyer and seller can read
  allow read: if request.auth.uid == resource.data.buyerId
              || request.auth.uid == resource.data.sellerId
              || isAdmin();
  
  // Customer can create orders
  allow create: if request.auth.uid == request.resource.data.buyerId
                && request.resource.data.status == 'payment_pending';
  
  // Vendor can update order status (mark ready)
  allow update: if request.auth.uid == resource.data.sellerId
                && isValidVendorOrderUpdate(resource, request.resource);
  
  // Customer can cancel order (before pickup)
  allow update: if request.auth.uid == resource.data.buyerId
                && resource.data.status in ['payment_pending', 'paid', 'preparing']
                && request.resource.data.status == 'cancelled';
  
  // Courier can update order (pickup, delivery)
  allow update: if request.auth.uid == courierAssignedToOrder(orderId)
                && isValidCourierOrderUpdate(resource, request.resource);
}

// Helper Functions
function validateItemData(data) {
  return data.title.size() > 0 && data.title.size() <= 100
      && data.description.size() > 0 && data.description.size() <= 500
      && data.price > 0
      && data.photos.size() > 0 && data.photos.size() <= 5
      && data.pickupLocation.address != null;
}

function isValidVendorOrderUpdate(before, after) {
  // Vendor can transition: paid → preparing → ready_for_pickup
  return (before.data.status == 'paid' && after.data.status == 'preparing')
      || (before.data.status == 'preparing' && after.data.status == 'ready_for_pickup');
}

function courierAssignedToOrder(orderId) {
  let order = get(/databases/$(database)/documents/marketplaceOrders/$(orderId)).data;
  if (order.jobId == null) return null;
  
  let job = get(/databases/$(database)/documents/jobs/$(order.jobId)).data;
  return job.courierUid;
}
```

---

## Cloud Functions Integration

### 1. `onVendorMarkReady` (Firestore Trigger)
**Trigger:** Order status → 'ready_for_pickup'  
**Purpose:** Create delivery job if delivery method selected

```typescript
exports.onVendorMarkReady = functions.firestore
  .document('marketplaceOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    // Only trigger when status changes to ready_for_pickup
    if (before.status !== 'ready_for_pickup' && after.status === 'ready_for_pickup') {
      
      // If pickup method, just notify customer
      if (after.deliveryMethod === 'pickup') {
        await sendNotification(after.buyerId, {
          title: 'Order Ready for Pickup',
          body: `${after.item.title} is ready at ${after.pickupLocation.address}`,
          data: { orderId: context.params.orderId }
        })
        return null
      }
      
      // If delivery method, create job for couriers
      if (after.deliveryMethod === 'delivery') {
        const jobId = db.collection('jobs').doc().id
        
        // Get vendor's pickup location
        const itemSnap = await db.collection('items').doc(after.itemId).get()
        const item = itemSnap.data()
        
        // Create job document
        await db.collection('jobs').doc(jobId).set({
          jobId,
          createdByUid: 'system',  // System-generated job
          courierUid: null,
          
          status: 'open',
          jobType: item.isFoodItem ? 'food' : 'package',
          
          pickup: {
            lat: item.pickupLocation.lat,
            lng: item.pickupLocation.lng,
            address: item.pickupLocation.address
          },
          dropoff: {
            lat: after.deliveryAddress.lat,
            lng: after.deliveryAddress.lng,
            address: after.deliveryAddress.address
          },
          
          itemId: after.itemId,
          orderId: context.params.orderId,
          
          // Food-specific requirements
          specialRequirements: item.isFoodItem ? item.foodDetails.equipmentRequired : [],
          
          pricing: {
            courierEarnings: after.pricing.deliveryFee - (after.pricing.deliveryFee * 0.15),  // 85% to courier
            platformFee: after.pricing.deliveryFee * 0.15,
            totalCharge: after.pricing.deliveryFee
          },
          
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        })
        
        // Link job to order
        await change.after.ref.update({
          jobId,
          jobCreatedAt: admin.firestore.Timestamp.now()
        })
        
        // Notify couriers (via onCreateJob trigger)
        console.log(`Created job ${jobId} for marketplace order ${context.params.orderId}`)
      }
    }
    
    return null
  })
```

**Vendor Impact:**
- Marking order ready automatically creates courier job
- No manual courier coordination needed
- Order linked to job for tracking

---

### 2. `captureMarketplacePayment` (Firestore Trigger)
**Trigger:** Order status → 'delivered'  
**Purpose:** Capture payment, distribute funds to vendor

```typescript
exports.captureMarketplacePayment = functions.firestore
  .document('marketplaceOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    if (before.status !== 'delivered' && after.status === 'delivered') {
      try {
        // Capture Stripe payment (if online payment)
        if (after.stripePaymentIntentId) {
          await stripe.paymentIntents.capture(after.stripePaymentIntentId)
          
          await change.after.ref.update({
            paymentStatus: 'captured',
            capturedAt: admin.firestore.Timestamp.now()
          })
        }
        
        // Update vendor stats
        await db.collection('users').doc(after.sellerId).update({
          'vendorProfile.totalRevenue': admin.firestore.FieldValue.increment(after.pricing.vendorReceives),
          'vendorProfile.soldListings': admin.firestore.FieldValue.increment(1)
        })
        
        // Mark item as sold
        await db.collection('items').doc(after.itemId).update({
          status: 'sold',
          soldAt: admin.firestore.Timestamp.now()
        })
        
        // Transfer funds to vendor's Stripe Connect account
        await stripe.transfers.create({
          amount: after.pricing.vendorReceives,
          currency: 'usd',
          destination: await getVendorStripeAccountId(after.sellerId),
          transfer_group: context.params.orderId
        })
        
        console.log(`Marketplace order ${context.params.orderId} completed. Vendor receives $${(after.pricing.vendorReceives / 100).toFixed(2)}`)
      } catch (error) {
        console.error('Error capturing marketplace payment:', error)
        await change.after.ref.update({
          paymentStatus: 'refund_failed',
          paymentError: error.message
        })
      }
    }
    
    return null
  })
```

**Vendor Impact:**
- Payment automatically captured after delivery
- Funds transferred to vendor's Stripe Connect account
- Payout schedule: Rolling daily (Stripe default)
- Stats auto-updated

---

### 3. `refundMarketplaceOrder` (Firestore Trigger)
**Trigger:** Order status → 'cancelled'  
**Purpose:** Refund customer, notify vendor

```typescript
exports.refundMarketplaceOrder = functions.firestore
  .document('marketplaceOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    if (before.status !== 'cancelled' && after.status === 'cancelled') {
      try {
        // Only refund if payment was made
        if (after.stripePaymentIntentId && after.paymentStatus === 'authorized') {
          await stripe.refunds.create({
            payment_intent: after.stripePaymentIntentId
          })
          
          await change.after.ref.update({
            paymentStatus: 'refunded',
            refundedAt: admin.firestore.Timestamp.now()
          })
        }
        
        // Mark item available again
        await db.collection('items').doc(after.itemId).update({
          status: 'available'
        })
        
        // Notify vendor
        await sendNotification(after.sellerId, {
          title: 'Order Cancelled',
          body: `Order for ${after.item.title} was cancelled`,
          data: { orderId: context.params.orderId }
        })
        
        // Notify customer
        await sendNotification(after.buyerId, {
          title: 'Refund Processed',
          body: `Your refund for ${after.item.title} has been initiated`,
          data: { orderId: context.params.orderId }
        })
        
        console.log(`Refunded marketplace order ${context.params.orderId}`)
      } catch (error) {
        console.error('Error refunding marketplace order:', error)
        await change.after.ref.update({
          paymentStatus: 'refund_failed',
          refundError: error.message
        })
      }
    }
    
    return null
  })
```

**Vendor Impact:**
- Automatic refunds on cancellation
- Item re-listed automatically
- Notifications keep vendor informed

---

## Inter-Role Data Flows

### Flow 1: Vendor → Customer (Marketplace Listing)
```
1. Vendor creates listing at /marketplace/create
   - items/{itemId} created
   - status: 'available'
   - photos uploaded to Firebase Storage
   - pickupLocation set

2. Customer browses /marketplace
   - Sees listing with price, photo
   - Clicks to view detail

3. Customer clicks "Order & Deliver"
   - Enters delivery address OR selects pickup
   - Proceeds to checkout

4. Customer completes payment
   - marketplaceOrders/{orderId} created
   - status: 'paid'
   - Stripe pre-authorizes payment

5. Vendor sees order in /vendor/orders
   - Notification: "New order!"
   - Order shows: Item, Buyer, Amount
```

---

### Flow 2: Vendor → Courier (Order Fulfillment)
```
1. Vendor receives order
   - status: 'paid'

2. Vendor prepares item
   - Packs, labels

3. Vendor marks ready at /vendor/orders/[orderId]
   - Clicks "Mark Order Ready"
   - status: 'paid' → 'ready_for_pickup'

4. onVendorMarkReady trigger fires
   - Creates job document
   - pickup: vendor's location
   - dropoff: customer's address
   - jobType: 'food' or 'package'
   - specialRequirements: equipment needed

5. Courier sees job in available jobs
   - "New marketplace delivery: $8.50"

6. Courier claims job
   - Navigates to vendor's location

7. Courier arrives, picks up item
   - Vendor hands over packaged item
   - Courier marks "Picked Up"
   - order.status: 'in_transit'

8. Courier delivers to customer
   - order.status: 'delivered'

9. captureMarketplacePayment trigger
   - Captures Stripe payment
   - Transfers funds to vendor
   - Updates vendor stats
```

---

### Flow 3: Vendor ↔ Customer (Pickup Method)
```
1. Customer orders with pickup method
   - marketplaceOrders/{orderId}
   - deliveryMethod: 'pickup'
   - pricing.deliveryFee: 0
   - pricing.platformFee: 0 (no fees!)

2. Vendor marks ready
   - status: 'ready_for_pickup'
   - NO job created (no courier needed)

3. onVendorMarkReady trigger
   - Sends notification to customer
   - "Order ready at [address]"

4. Customer arrives at vendor location
   - Vendor hands over item

5. Vendor manually marks delivered (future feature)
   - OR customer confirms pickup in app
   - status: 'delivered'

6. Payment captured (if online payment)
   - Vendor receives 100% of item price
   - NO platform fees
   - NO Stripe fees (if cash payment)
```

---

### Flow 4: Vendor ↔ Admin (Moderation)
```
1. Vendor creates listing
   - items/{itemId}
   - status: 'available'

2. Admin monitors marketplace (future)
   - /admin/marketplace
   - Views all listings

3. Admin flags inappropriate item
   - Offensive description
   - Prohibited item

4. Admin removes listing
   - Sets status: 'removed'
   - Adds removal reason

5. Vendor receives notification
   - "Your listing was removed: [reason]"
   - Can appeal or edit and re-list

6. Vendor sees in /vendor/items
   - "Removed" badge
   - Cannot be viewed by customers
```

---

## Stripe Connect Integration

### Vendor Onboarding Flow
```
1. New vendor signs up
   - role: 'vendor' set

2. First listing attempt at /marketplace/create
   - Checks vendorProfile.stripeConnectAccountId
   - If null → Redirect to onboarding

3. Stripe Connect hosted onboarding
   - Collects business info
   - Bank account details
   - Tax information (W-9/W-8)
   - Identity verification

4. Stripe verifies (1-2 days)
   - vendorProfile.stripeAccountVerified: true
   - vendorProfile.payoutsEnabled: true

5. Vendor can now create listings
```

### Payout Schedule
- **Method:** Stripe Connect transfers
- **Frequency:** Rolling daily (Stripe default)
- **Processing:** 2 business days from delivery
- **Minimum:** $1 (no minimum)
- **Destination:** Bank account on file

### Fee Structure

**Delivery Orders:**
```
Item Price: $100
Platform Fee (15%): -$15
Stripe Fee (2.9% + $0.30): -$3.20
Vendor Receives: $81.80
```

**Pickup Orders:**
```
Item Price: $100
Platform Fee: $0 (waived for pickup)
Stripe Fee: $0 (if cash)
Vendor Receives: $100
```

---

## Permissions Summary

### ✅ Vendor CAN:
- Create unlimited marketplace listings
- Set own item prices
- Upload up to 5 photos per item
- Edit/delete own listings
- Mark orders as ready for pickup
- View all orders for their items
- Receive Stripe Connect payouts (minus fees)
- Offer pickup option (0% fees)
- Offer delivery option (platform coordinates)
- View sales analytics
- Export sales data
- Contact buyers via order page
- Cancel orders before courier pickup
- Rate couriers who delivered their items (future)
- **Also:** Has all customer permissions (can buy from other vendors)

### ❌ Vendor CANNOT:
- Edit other vendors' listings
- View other vendors' sales data
- Access admin features
- Accept delivery jobs (unless also courier)
- Modify delivery fees (set by courier)
- Cancel orders after courier picked up
- Change payout schedule (Stripe controls)
- Bypass Stripe fees for delivered orders
- See customer payment methods
- Access platform analytics
- Moderate other listings
- Set prices below $0.01
- Upload more than 5 photos per listing

---

## Analytics Dashboard

### Vendor Analytics Page (`/vendor/analytics`)

**Overview Cards:**
- Total Revenue (all-time)
- This Month Revenue
- Last Month Revenue
- Growth % (month over month)

**Charts:**
1. **Sales Over Time:** Line chart
   - Daily sales for last 30 days
   - Monthly sales for last 12 months

2. **Top Categories:** Pie chart
   - Revenue by category
   - Which categories sell best

3. **Revenue by Day of Week:** Bar chart
   - Which days are most profitable

4. **Top Products Table:**
   - Name, Units Sold, Revenue, Avg Price
   - "List more like this" suggestion

**Export:**
- Download CSV of sales data
- Date range selector
- For accounting/taxes

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Cross-References:**
- [Customer Role Documentation](./01-CUSTOMER-ROLE.md)
- [Courier Role Documentation](./02-COURIER-ROLE.md)
- [Runner Role Documentation](./03-RUNNER-ROLE.md)
- [Admin Role Documentation](./05-ADMIN-ROLE.md)

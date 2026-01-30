# GoSenderr v2 - User Roles and Flows

**Last Updated:** January 2026  
**Document Status:** Planning Phase

---

## 🎭 User Role Model

### Core Principle: Single Account, Multiple Roles

GoSenderr v2 uses a **unified user model** where one account can have multiple roles simultaneously. Users are not locked into a single role - they can be buyers, sellers, and couriers all at once.

```
┌─────────────────────────────────────┐
│        Single User Account          │
│         (Firebase Auth UID)         │
├─────────────────────────────────────┤
│                                     │
│  Roles Array: ['buyer', 'seller']  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Buyer Profile               │  │
│  │  • Shipping addresses        │  │
│  │  • Payment methods           │  │
│  │  • Order history             │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Seller Profile (optional)   │  │
│  │  • Store name                │  │
│  │  • Seller rating             │  │
│  │  • Listed items              │  │
│  │  • Payout details            │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 👥 Role Definitions

### 1. Buyer (Marketplace Customer)
**Default Role:** Every user is a buyer by default

**Permissions:**
- ✅ Browse marketplace items
- ✅ Search and filter listings
- ✅ Purchase items
- ✅ Track orders
- ✅ Message sellers
- ✅ Leave ratings/reviews
- ❌ List items (until seller role activated)

**Firestore Document:**
```typescript
{
  uid: "user_123",
  roles: ["buyer"],
  displayName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  buyer: {
    addresses: [
      { street: "123 Main St", city: "SF", state: "CA", zip: "94102", isDefault: true }
    ],
    paymentMethods: ["pm_stripe_123"],
    orderCount: 5,
    createdAt: Timestamp
  }
}
```

---

### 2. Seller (Marketplace Vendor)
**Activation:** Becomes seller when listing first item

**Permissions:**
- ✅ All buyer permissions
- ✅ List items for sale
- ✅ Manage inventory
- ✅ View order requests
- ✅ Message buyers
- ✅ Ship items
- ✅ Receive payouts
- ✅ View sales analytics

**Firestore Document (additional fields):**
```typescript
{
  uid: "user_123",
  roles: ["buyer", "seller"],  // Seller role added
  // ... buyer fields ...
  seller: {
    storeName: "John's Shop",
    rating: 4.8,
    totalSales: 42,
    activeListings: 8,
    stripeAccountId: "acct_stripe_456",
    isVerified: true,
    createdAt: Timestamp
  }
}
```

---

### 3. Courier
**Special Role:** Separate from marketplace (uses native iOS app)

**Permissions:**
- ✅ View available delivery jobs
- ✅ Accept jobs
- ✅ Update job status
- ✅ Navigate to pickup/dropoff
- ✅ Capture proof photos
- ✅ Track earnings
- ✅ Receive payouts
- ❌ Access marketplace features

**Firestore Document:**
```typescript
{
  uid: "courier_789",
  roles: ["courier"],
  displayName: "Jane Smith",
  courier: {
    isOnline: true,
    location: GeoPoint(37.7749, -122.4194),
    geohash: "9q8yy",
    transportMode: "car",
    rateCard: {
      baseFee: 5.00,
      perMile: 1.50
    },
    stats: {
      completedJobs: 128,
      rating: 4.9,
      acceptanceRate: 0.85
    },
    stripeAccountId: "acct_stripe_789",
    createdAt: Timestamp
  }
}
```

---

### 4. Admin
**Special Role:** Platform management (uses desktop app)

**Permissions:**
- ✅ Full read access to all data
- ✅ User management (view, edit, ban)
- ✅ Order management (cancel, refund)
- ✅ Job monitoring (reassign, cancel)
- ✅ Dispute resolution
- ✅ Configure platform settings
- ✅ View analytics and reports
- ✅ Manage feature flags

**Firestore Document:**
```typescript
{
  uid: "admin_001",
  roles: ["admin"],
  displayName: "Admin User",
  admin: {
    level: "super", // "super" | "support" | "readonly"
    permissions: ["users", "orders", "jobs", "disputes", "analytics"],
    createdAt: Timestamp
  }
}
```

---

## 🗺️ User Journey Maps

### Buyer Flow: Browse → Purchase → Track Delivery

```
┌──────────────────────────────────────────────────────────────────┐
│                         BUYER JOURNEY                             │
└──────────────────────────────────────────────────────────────────┘

1. DISCOVER
   │
   ├─ Open marketplace app (web or iOS)
   ├─ Browse homepage feed
   ├─ Search for item
   ├─ Apply filters (category, price, location)
   └─ View item details
      │
      ├─ View photos
      ├─ Read description
      ├─ Check seller rating
      └─ View similar items

2. PURCHASE
   │
   ├─ Add to cart (or buy now)
   ├─ Enter/select shipping address
   ├─ Choose payment method
   ├─ Review order summary
   └─ Confirm purchase
      │
      └─ Stripe payment processing
         │
         ├─ Success: Order created
         └─ Failure: Retry or cancel

3. TRACK ORDER
   │
   ├─ View order in "Orders" tab
   ├─ See order status updates:
   │  • pending_seller_confirmation
   │  • confirmed
   │  • shipped (delivery job created)
   │  • in_transit
   │  • delivered
   │  • completed
   │
   ├─ Track delivery on map (real-time courier location)
   ├─ Message seller (questions about item)
   └─ Message courier (delivery instructions)

4. COMPLETE
   │
   ├─ Receive delivery
   ├─ Confirm receipt
   └─ Rate seller and courier
      │
      └─ Leave review (optional)

```

---

### Seller Flow: List Item → Manage Orders → Ship

```
┌──────────────────────────────────────────────────────────────────┐
│                         SELLER JOURNEY                            │
└──────────────────────────────────────────────────────────────────┘

1. BECOME SELLER (First Time Only)
   │
   ├─ Tap "Start Selling" button
   ├─ Enter store name
   ├─ Set up Stripe Connect account
   │  • Enter business details
   │  • Add bank account for payouts
   │  • Verify identity
   └─ Seller role activated

2. LIST ITEM
   │
   ├─ Tap "+" button (Create Listing)
   ├─ Take/upload photos (1-5 images)
   ├─ Enter item details:
   │  • Title
   │  • Description
   │  • Category
   │  • Condition (new/like new/good/fair)
   │  • Price
   │  • Quantity
   │  • Shipping options (local pickup / delivery)
   │
   ├─ Preview listing
   └─ Publish
      │
      └─ Item appears in marketplace

3. MANAGE ORDERS
   │
   ├─ Receive notification: "New order!"
   ├─ View order details
   ├─ Confirm order (or cancel if issue)
   │
   ├─ Package item
   ├─ Choose fulfillment:
   │  │
   │  ├─ Option A: Buyer arranges pickup
   │  │   └─ Mark as "ready_for_pickup"
   │  │
   │  └─ Option B: Request delivery
   │      │
   │      ├─ Create delivery job
   │      ├─ Courier picks up item
   │      └─ Mark as "shipped"
   │
   └─ Track delivery progress

4. COMPLETE SALE
   │
   ├─ Item delivered to buyer
   ├─ Buyer confirms receipt
   ├─ Funds released to seller
   │  │
   │  └─ Stripe Connect payout (2-7 days)
   │
   └─ Receive buyer rating/review

5. ONGOING MANAGEMENT
   │
   ├─ View sales analytics
   ├─ Edit active listings
   ├─ Respond to messages
   ├─ Monitor inventory
   └─ Track payouts

```

---

### Courier Flow: Accept Job → Navigate → Complete Delivery

```
┌──────────────────────────────────────────────────────────────────┐
│                         COURIER JOURNEY                           │
└──────────────────────────────────────────────────────────────────┘

1. GO ONLINE
   │
   ├─ Open courier iOS app
   ├─ View full-screen map
   ├─ Tap "Go Online" toggle (top-right)
   │  │
   │  └─ Location tracking starts
   │
   └─ Available jobs appear as pins on map

2. DISCOVER JOBS
   │
   ├─ View job pins on map (color-coded by payout)
   ├─ Tap pin to see floating job card:
   │  • Pickup area (masked address)
   │  • Dropoff area (masked address)
   │  • Distance from current location
   │  • Estimated payout
   │  • Package size and flags
   │
   └─ Decide: Accept or Skip

3. ACCEPT JOB
   │
   ├─ Tap "Accept Job" button
   │  │
   │  └─ Atomic Firestore transaction:
   │     • Check job still available
   │     • Assign to courier
   │     • Update status to "assigned"
   │
   ├─ Exact addresses revealed
   ├─ Floating card shows full details
   └─ Route preview drawn on map

4. NAVIGATE TO PICKUP
   │
   ├─ Tap "Start Navigation"
   │  │
   │  └─ Mapbox turn-by-turn directions
   │
   ├─ Update status: "enroute_pickup"
   ├─ Real-time location sent to customer
   │
   └─ Arrive at pickup
      │
      └─ Tap "I've Arrived"
         │
         └─ Status: "arrived_pickup"

5. PICKUP ITEM
   │
   ├─ Meet seller (or retrieve from location)
   ├─ Verify item matches description
   ├─ Tap "Take Pickup Photo"
   │  │
   │  └─ Camera opens (full-screen)
   │     │
   │     ├─ Capture photo of package
   │     └─ Photo uploaded to Storage
   │
   └─ Tap "Confirm Pickup"
      │
      └─ Status: "picked_up"

6. NAVIGATE TO DROPOFF
   │
   ├─ Dropoff address highlighted on map
   ├─ Route automatically updated
   ├─ Tap "Start to Dropoff"
   │  │
   │  └─ Status: "enroute_dropoff"
   │
   └─ Arrive at dropoff
      │
      └─ Tap "I've Arrived"
         │
         └─ Status: "arrived_dropoff"

7. COMPLETE DELIVERY
   │
   ├─ Meet buyer (or leave at location)
   ├─ Hand off package
   ├─ Tap "Take Delivery Photo"
   │  │
   │  └─ Camera opens
   │     │
   │     ├─ Capture proof of delivery
   │     └─ Photo uploaded to Storage
   │
   └─ Tap "Complete Delivery"
      │
      └─ Cloud Function: completeDelivery()
         │
         ├─ Status: "completed"
         ├─ Calculate payout
         ├─ Create payout record
         └─ Send notification to buyer

8. EARNINGS
   │
   ├─ View completed job in "Earnings" tab
   ├─ See payout amount
   └─ Track daily/weekly/monthly earnings

9. RETURN TO MAP
   │
   └─ Map shell returns to available jobs view
      │
      └─ Ready for next job

```

---

### Admin Flow: Monitor → Manage → Resolve Issues

```
┌──────────────────────────────────────────────────────────────────┐
│                          ADMIN JOURNEY                            │
└──────────────────────────────────────────────────────────────────┘

1. PLATFORM MONITORING
   │
   ├─ Open admin desktop app
   ├─ View dashboard:
   │  • Active orders count
   │  • Active delivery jobs count
   │  • Online couriers count
   │  • Revenue today/week/month
   │  • Recent disputes
   │
   └─ Monitor real-time activity feed

2. USER MANAGEMENT
   │
   ├─ View all users (buyers, sellers, couriers)
   ├─ Search by name, email, or UID
   ├─ Click user to view details:
   │  • Profile information
   │  • Order history
   │  • Ratings and reviews
   │  • Account status
   │
   ├─ Actions:
   │  • Edit user details
   │  • Assign/remove roles
   │  • Ban/suspend user
   │  • View messages
   │
   └─ Filters:
      • By role
      • By status (active, banned, suspended)
      • By registration date

3. ORDER MANAGEMENT
   │
   ├─ View all marketplace orders
   ├─ Filters:
   │  • By status
   │  • By date range
   │  • By buyer/seller
   │
   ├─ Click order to view details
   ├─ Actions:
   │  • Cancel order
   │  • Issue refund
   │  • Reassign delivery
   │  • View messages
   │  • Escalate to dispute
   │
   └─ Bulk actions:
      • Export to CSV
      • Mark multiple as reviewed

4. JOB MANAGEMENT
   │
   ├─ View all delivery jobs
   ├─ Real-time status updates
   ├─ Map view showing active deliveries
   │
   ├─ Filters:
   │  • By status
   │  • By courier
   │  • By date
   │
   ├─ Click job to view details
   └─ Actions:
      • Reassign to different courier
      • Cancel job
      • Override status
      • View proof photos

5. DISPUTE RESOLUTION
   │
   ├─ View open disputes
   ├─ Click dispute to review:
   │  • Issue description
   │  • Evidence (photos, messages)
   │  • User histories
   │
   ├─ Actions:
   │  • Message buyer/seller/courier
   │  • Request additional info
   │  • Issue refund
   │  • Close dispute with resolution
   │
   └─ Track resolution time metrics

6. ANALYTICS & REPORTS
   │
   ├─ Revenue dashboard
   │  • GMV (Gross Merchandise Value)
   │  • Platform fees collected
   │  • Courier payouts
   │
   ├─ User growth metrics
   │  • New signups
   │  • Active users
   │  • Retention rates
   │
   ├─ Marketplace metrics
   │  • Items listed
   │  • Items sold
   │  • Average order value
   │  • Conversion rate
   │
   └─ Delivery metrics
      • Jobs completed
      • Average delivery time
      • Courier ratings

7. PLATFORM CONFIGURATION
   │
   ├─ Feature flags
   │  • Enable/disable marketplace features
   │  • Toggle experimental features
   │
   ├─ Rate cards
   │  • Set delivery pricing
   │  • Configure courier payouts
   │
   └─ System settings
      • Notification templates
      • Email settings
      • API rate limits

```

---

## 🔄 Status Transitions

### Marketplace Order Status Flow

```
pending_payment
    │
    ├─ Payment success
    │     │
    │     ▼
    │  pending_seller_confirmation
    │     │
    │     ├─ Seller confirms
    │     │     │
    │     │     ▼
    │     │  confirmed
    │     │     │
    │     │     ├─ Delivery requested
    │     │     │     │
    │     │     │     ▼
    │     │     │  shipped (job created)
    │     │     │     │
    │     │     │     └─ (follows Job Status Flow)
    │     │     │
    │     │     └─ Local pickup
    │     │           │
    │     │           ▼
    │     │        ready_for_pickup
    │     │           │
    │     │           └─ Buyer picks up
    │     │                 │
    │     │                 ▼
    │     │              delivered
    │     │
    │     └─ Seller declines
    │           │
    │           ▼
    │        cancelled (refund issued)
    │
    └─ Payment failure
          │
          ▼
       payment_failed (order cancelled)
```

---

### Delivery Job Status Flow

```
open
  │
  ├─ Courier accepts
  │     │
  │     ▼
  │  assigned
  │     │
  │     ├─ Courier starts driving
  │     │     │
  │     │     ▼
  │     │  enroute_pickup
  │     │     │
  │     │     └─ Arrives at pickup
  │     │           │
  │     │           ▼
  │     │        arrived_pickup
  │     │           │
  │     │           └─ Takes pickup photo
  │     │                 │
  │     │                 ▼
  │     │              picked_up
  │     │                 │
  │     │                 └─ Starts to dropoff
  │     │                       │
  │     │                       ▼
  │     │                    enroute_dropoff
  │     │                       │
  │     │                       └─ Arrives at dropoff
  │     │                             │
  │     │                             ▼
  │     │                          arrived_dropoff
  │     │                             │
  │     │                             └─ Takes delivery photo
  │     │                                   │
  │     │                                   ▼
  │     │                                completed
  │     │                                   │
  │     │                                   └─ Payout processed
  │     │
  │     └─ Cancellation (before pickup)
  │           │
  │           ▼
  │        cancelled
  │
  ├─ Timeout (no courier accepts)
  │     │
  │     ▼
  │  expired
  │
  └─ Issue during delivery
        │
        ▼
     failed (dispute created)
```

---

## 🔐 Role-Based Permissions Matrix

| Feature/Action | Buyer | Seller | Courier | Admin |
|----------------|-------|--------|---------|-------|
| Browse marketplace | ✅ | ✅ | ❌ | ✅ |
| Purchase items | ✅ | ✅ | ❌ | ✅ |
| List items | ❌ | ✅ | ❌ | ✅ |
| View own orders | ✅ | ✅ | ❌ | ✅ |
| View all orders | ❌ | ❌ | ❌ | ✅ |
| Message buyer/seller | ✅ | ✅ | ❌ | ✅ |
| Accept delivery jobs | ❌ | ❌ | ✅ | ❌ |
| View delivery jobs | ❌ | ❌ | ✅ | ✅ |
| Update job status | ❌ | ❌ | ✅ | ✅ |
| Issue refunds | ❌ | ❌ | ❌ | ✅ |
| Ban users | ❌ | ❌ | ❌ | ✅ |
| View analytics | ❌ | ✅* | ✅* | ✅ |

*Sellers and couriers can only view their own analytics

---

## 💬 Communication Channels

### Buyer ↔ Seller Messaging
- In-app messaging system
- Thread per order
- Real-time notifications
- Attachment support (photos)

### Buyer ↔ Courier Communication
- Limited to delivery instructions
- One-way messages (buyer to courier)
- Courier can call buyer (phone link)

### Admin Communication
- Can view all messages
- Can intervene in disputes
- Can send platform-wide announcements

---

*User flows designed for simplicity, safety, and scalability. Update as features evolve.*

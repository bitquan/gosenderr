# Customer Role - Complete Documentation

## Role Identity
- **Icon:** 👤
- **Display Name:** Customer / Order Up
- **Color:** Purple (#6B4EFF)
- **Tagline:** "Request. Track. Receive."
- **Purpose:** Order marketplace items, request deliveries, track shipments

---

## Architecture & Access

### How to Become a Customer
1. Sign up at `/login` with email/password
2. Select "Customer" role at `/select-role` (first login only)
3. Auto-redirects to `/customer/dashboard`

### User Document Structure
```typescript
{
  uid: string
  email: string
  displayName?: string
  role: 'customer' // No role field = default customer
  // Optional fields
  savedAddresses?: Array<{
    label: string
    address: string
    lat: number
    lng: number
  }>
  defaultPaymentMethod?: string
  phoneNumber?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Pages & Features

### 1. Dashboard (`/customer/dashboard`)
**Purpose:** Central hub for all customer activities

**Features:**
- **Header Stats:**
  - Total deliveries count
  - Active deliveries count
  - Completed deliveries count
- **Recent Activity Feed:** Last 10 jobs, orders, packages
- **Quick Actions:**
  - Request Delivery button
  - View All Jobs button
  - Browse Marketplace button
- **Saved Addresses:** Quick access to frequent locations
- **Active Deliveries:** Real-time status cards

**Real-time Data:**
- Jobs: `where('createdByUid', '==', uid)` ordered by createdAt desc
- Orders: `where('buyerId', '==', uid)` from marketplaceOrders
- Packages: `where('senderId', '==', uid)` from packages

---

### 2. Request Delivery (`/customer/request-delivery`)
**Purpose:** Create new delivery job with marketplace item

**Workflow:**
1. Select item from marketplace (arrives with `?itemId=xxx`)
2. Confirm item details (price, pickup location)
3. Enter delivery address (Mapbox autocomplete)
4. Select courier from available list
5. Review pricing breakdown
6. Proceed to payment

**Features:**
- Mapbox address autocomplete for delivery location
- Live courier discovery (online couriers within range)
- Estimated fee calculation based on:
  - Item price
  - Distance (pickup → delivery)
  - Courier's rate card
  - Platform fee
- Real-time courier availability

**Creates:**
- Job document in `jobs` collection (status: 'open')
- Links to item via `itemId` field

---

### 3. Jobs List (`/customer/jobs`)
**Purpose:** View all delivery requests

**Features:**
- **Filter Tabs:** All, Active, Completed, Cancelled
- **Search:** By address, description, job ID
- **Sort:** By date, status, price
- **Stats Header:**
  - Total jobs
  - Active count
  - Completed count
  
**Job Cards Show:**
- Job ID + Status badge
- Pickup address 📍
- Delivery address 🎯
- Courier (if assigned) with avatar
- Agreed fee
- Created timestamp
- "View Details" button

**Empty States:**
- "No deliveries yet" with CTA to request delivery

---

### 4. Job Detail (`/customer/jobs/[jobId]`)
**Purpose:** Track individual delivery in real-time

**Features:**
- **Status Timeline:**
  - Open (waiting for courier)
  - Assigned (courier claimed)
  - Enroute to Pickup
  - Arrived at Pickup
  - Package Picked Up
  - Enroute to Delivery
  - Arrived at Delivery
  - Completed
  
- **Live Map View:**
  - Courier's current location (if online)
  - Pickup marker
  - Delivery marker
  - Route polyline
  
- **Courier Info Card:**
  - Name, avatar
  - Vehicle type
  - Online status
  - Contact button
  
- **Package Details:**
  - Description
  - Photos (if uploaded)
  - Weight, dimensions
  
- **Actions:**
  - Cancel job (if status = 'open' or 'assigned')
  - Contact courier
  - Confirm delivery (after arrived_dropoff)
  - Rate courier (after completed)
  
**Real-time Updates:**
- Job status changes
- Courier location (onSnapshot)
- ETA updates

---

### 5. Checkout (`/customer/checkout`)
**Purpose:** Complete payment for delivery

**Features:**
- **Order Summary:**
  - Item details with photo
  - Pickup location
  - Delivery location
  - Item price
  - Delivery fee
  - Platform fee
  - Total amount
  
- **Payment Integration:**
  - Stripe Elements (PaymentElement)
  - Pre-authorization hold (capture later)
  - Saved payment methods
  
- **Payment Flow:**
  1. Create PaymentIntent via API route
  2. Confirm payment client-side
  3. Update job status to 'pending_pickup'
  4. Create delivery job document
  5. Update item status to 'sold'
  6. Redirect to job tracking page

**Security:**
- Payment captured only after delivery confirmed
- Automatic refund if cancelled before delivery

---

### 6. Packages (`/customer/packages`)
**Purpose:** Long-distance package shipping

**Features:**
- List all packages sent
- Filter: All, Payment Pending, In Transit, Delivered
- Track packages by tracking number
- View package timeline
- Download shipping labels

**Package Cards:**
- Tracking number
- Sender → Recipient
- Status badge
- Weight, dimensions
- Service level (standard/express/overnight)
- Estimated delivery date
- Current location

---

### 7. Package Detail (`/customer/packages/[packageId]`)
**Purpose:** Track individual package

**Features:**
- Full tracking history timeline
- Current location on map
- Package photos
- Sender/recipient details
- Pricing breakdown
- Proof of delivery (signature, photo)

---

### 8. Orders (`/customer/orders`)
**Purpose:** Marketplace purchases history

**Features:**
- List items purchased
- Order status tracking
- Delivery tracking (links to jobs)
- Re-order functionality
- Rate/review purchased items

---

### 9. Profile (`/customer/profile`)
**Purpose:** Account management

**Features:**
- Edit display name
- Update email
- Phone number
- Profile photo
- Saved addresses management
- Payment methods
- Order history stats
- Sign out

---

## Navigation

### Bottom Navigation (Mobile)
```typescript
[
  { icon: "🏠", label: "Home", href: "/customer/dashboard" },
  { icon: "📦", label: "Jobs", href: "/customer/jobs" },
  { icon: "🛒", label: "Market", href: "/marketplace" },
  { icon: "👤", label: "Profile", href: "/customer/profile" }
]
```

### Floating Action Button (FAB)
- Icon: ➕
- Label: "Request Delivery"
- Href: `/customer/request-delivery`
- Hidden on: `/customer/request-delivery`, `/customer/checkout`

---

## Interactions with Other Roles

### 👉 Customer → Courier
**Direct Interactions:**
1. **Job Creation:** Customer creates job → appears in courier's available jobs
2. **Job Claim:** Courier accepts → customer sees courier assigned
3. **Delivery Progress:** Courier updates status → customer sees real-time updates
4. **Communication:** Customer can message courier during delivery
5. **Rating:** Customer rates courier after delivery completion

**Data Flow:**
- Customer creates job → `status: 'open'`, `courierUid: null`
- Courier claims → `status: 'assigned'`, `courierUid: <courier-id>`, `agreedFee: <fee>`
- Courier updates → status changes → customer's job detail updates live
- Customer confirms → `customerConfirmation.received: true` → triggers payment capture
- Customer rates → creates rating document → updates courier's avgRating

---

### 👉 Customer → Vendor
**Direct Interactions:**
1. **Browse Marketplace:** Customer views vendor's items
2. **Purchase:** Customer orders item → vendor sees order
3. **Delivery Request:** Customer requests delivery → vendor marks ready
4. **Rating:** Customer can rate vendor (future feature)

**Data Flow:**
- Customer orders item → creates `marketplaceOrders` doc
- Vendor marks ready → `order.status: 'ready_for_pickup'`
- Delivery completes → vendor receives payout via Stripe Connect
- Customer rating → creates rating doc for vendor

---

### 👉 Customer → Runner (Package Runner)
**Indirect Interaction:**
- Customer ships package → Runner transports on long route
- Customer tracks via tracking number
- No direct contact (admin manages)

---

### 👉 Customer → Admin
**Indirect Oversight:**
- Admin can view customer's jobs, orders, packages
- Admin can cancel jobs, issue refunds
- Admin resolves disputes
- Customer doesn't interact with admin directly (unless support)

---

## Permissions

### ✅ Customer CAN:
- Create delivery jobs
- Request deliveries for marketplace items
- Ship packages (long-distance)
- Browse and search marketplace
- Purchase items from vendors
- Track deliveries in real-time
- Cancel jobs (before picked up)
- Confirm delivery receipt
- Rate and review couriers
- Manage payment methods
- Save delivery addresses
- View order history
- **Also:** Become vendor (upgrade role)
- **Also:** Become courier (set up courier profile)

### ❌ Customer CANNOT:
- Accept delivery jobs (not courier)
- See other customers' orders
- Access admin features
- Modify courier rates
- View courier earnings
- Approve package runners
- Access feature flags
- Cancel other users' jobs

---

## Firestore Security Rules

```javascript
// Customer can read their own jobs
match /jobs/{jobId} {
  allow read: if request.auth.uid == resource.data.createdByUid
              || request.auth.uid == resource.data.courierUid;
  allow create: if request.auth.uid == request.resource.data.createdByUid;
}

// Customer can read their own orders
match /marketplaceOrders/{orderId} {
  allow read: if request.auth.uid == resource.data.buyerId
              || request.auth.uid == resource.data.sellerId;
  allow create: if request.auth.uid == request.resource.data.buyerId;
}

// Customer can read their own packages
match /packages/{packageId} {
  allow read: if request.auth.uid == resource.data.senderId
              || request.auth.uid == resource.data.recipientId;
  allow create: if request.auth.uid == request.resource.data.senderId;
}
```

---

## Key Workflows

### Workflow 1: Browse → Order → Delivery
1. Customer browses `/marketplace`
2. Finds item → clicks "Order & Deliver"
3. Enters delivery address
4. Selects courier from available list
5. Reviews pricing → proceeds to checkout
6. Completes payment (Stripe pre-auth)
7. Job created (status: 'pending_pickup')
8. Courier claims job → Customer sees courier assigned
9. Courier picks up → Customer sees status updates
10. Courier delivers → Customer confirms receipt
11. Payment captured → Vendor receives payout
12. Customer rates courier

### Workflow 2: Direct Delivery Request
1. Customer goes to `/customer/request-delivery` directly
2. Enters pickup location
3. Enters delivery location  
4. Selects courier
5. Pays and creates job
6. (Rest same as Workflow 1)

### Workflow 3: Package Shipping
1. Customer goes to `/ship`
2. Fills package details (weight, dimensions)
3. Enters sender/recipient addresses
4. Selects service level
5. Pays shipping fee
6. Receives tracking number
7. Tracks package via `/track/package/[trackingNumber]`
8. Package assigned to runner by system
9. Customer receives delivery confirmation

### Workflow 4: Cancel Job
1. Customer views job detail
2. Job status must be 'open' or 'assigned'
3. Clicks "Cancel Job" button
4. Confirms cancellation
5. Job status → 'cancelled'
6. If payment authorized → automatic refund triggered
7. Courier notified (if assigned)

---

## Future Enhancements

### Phase 2 - Customer Features
- **Subscription Plans:** Monthly delivery bundles
- **Scheduled Deliveries:** Set pickup time in advance
- **Delivery Instructions:** Gate codes, door preferences
- **Tip Couriers:** Optional tip after delivery
- **Favorite Couriers:** Request specific courier
- **Address Book:** Unlimited saved addresses
- **Split Payment:** Pay with multiple methods
- **Promo Codes:** Discount codes at checkout
- **Delivery Insurance:** Optional item insurance
- **Delivery Photos:** Require photo proof
- **Live Chat:** In-app messaging with courier

### Phase 3 - Analytics for Customer
- Spending analytics
- Delivery frequency charts
- Most ordered items
- Favorite vendors
- Carbon footprint tracker

### Phase 4 - Social Features
- Share delivery tracking link
- Gift deliveries (pay for someone else)
- Group orders (split with friends)
- Referral system (invite friends)

---

## Related Collections

### Customer Creates:
- `jobs` - Delivery requests
- `marketplaceOrders` - Item purchases
- `packages` - Package shipments
- `ratings` - Courier reviews

### Customer Reads:
- `items` - Marketplace listings (public)
- `users` - Courier profiles (limited)
- `routes` - Not directly (via packages)

---

## Status Codes

### Job Status (Customer Perspective)
- `open` - Waiting for courier to claim
- `assigned` - Courier claimed, heading to pickup
- `enroute_pickup` - Courier on the way to pickup
- `arrived_pickup` - Courier at pickup location
- `picked_up` - Package picked up, heading to delivery
- `enroute_dropoff` - Courier on the way to delivery
- `arrived_dropoff` - Courier arrived at delivery
- `completed` - Delivery confirmed by customer
- `cancelled` - Job cancelled
- `disputed` - Issue reported

### Order Status
- `pending_payment` - Awaiting payment
- `paid` - Payment completed
- `ready_for_pickup` - Vendor marked ready
- `in_transit` - Courier has package
- `delivered` - Completed
- `cancelled` - Order cancelled
- `refunded` - Money returned

---

## Support & Help

### Customer Support Access
- In-app help center
- Email: support@gosenderr.com
- Live chat (coming soon)
- FAQ page
- Report delivery issues
- Dispute resolution via admin

---

**Last Updated:** January 23, 2026
**Version:** 1.0

# GoSenderr Platform - Synced Architecture Master Index

## 📋 Table of Contents
1. [Overview](#overview)
2. [Role Documentation](#role-documentation)
3. [Core Collections](#core-collections)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Cloud Functions Reference](#cloud-functions-reference)
6. [Security Rules Matrix](#security-rules-matrix)
7. [System Architecture](#system-architecture)

---

## Overview

**GoSenderr** is a multi-role delivery and marketplace platform connecting:
- 👤 **Customers** - Request deliveries, order items, ship packages
- 🚗 **Couriers** - Accept local delivery jobs (<50 miles)
- 🚚 **Runners** - Transport packages on long-haul routes (50-200+ miles)
- 🏪 **Vendors** - Sell items with integrated delivery
- ⚙️ **Admins** - Oversee platform, resolve disputes, manage users

---

## Role Documentation

### 📄 Complete Role Specifications

Each role document includes:
- User document structure (Firestore schema)
- Core collections and interactions
- Firestore security rules
- Cloud Functions integration
- Inter-role data flows
- Permissions matrix
- Workflows and examples

| Role | Document | Icon | Color | Primary Function |
|------|----------|------|-------|------------------|
| **Customer** | [01-CUSTOMER-ROLE.md](./01-CUSTOMER-ROLE.md) | 👤 | Purple | Initiate deliveries, purchases, shipments |
| **Courier** | [02-COURIER-ROLE.md](./02-COURIER-ROLE.md) | 🚗 | Green | Fulfill local delivery jobs |
| **Runner** | [03-RUNNER-ROLE.md](./03-RUNNER-ROLE.md) | 🚚 | Orange | Transport packages between hubs |
| **Vendor** | [04-VENDOR-ROLE.md](./04-VENDOR-ROLE.md) | 🏪 | Blue | Sell marketplace items |
| **Admin** | [05-ADMIN-ROLE.md](./05-ADMIN-ROLE.md) | ⚙️ | Red | Platform management and oversight |

---

## Core Collections

### Firestore Database Schema

```
firestore/
├── users/{uid}
│   ├── role: 'customer' | 'courier' | 'package_runner' | 'vendor' | 'admin'
│   ├── courierProfile?: { ... }
│   ├── packageRunnerProfile?: { ... }
│   ├── vendorProfile?: { ... }
│   ├── adminProfile?: { ... }
│   └── location?: { lat, lng, updatedAt }
│
├── jobs/{jobId}
│   ├── createdByUid: string (Customer)
│   ├── courierUid: string | null (Courier)
│   ├── status: JobStatus
│   ├── pickup: { lat, lng, address }
│   ├── dropoff: { lat, lng, address }
│   ├── pricing: { courierEarnings, platformFee, totalCharge }
│   └── paymentStatus: 'authorized' | 'captured' | 'refunded'
│
├── routes/{routeId}
│   ├── type: 'local' (<50 miles)
│   ├── courierUid?: string
│   ├── jobIds: string[]
│   ├── optimizedStops: Array<{ jobId, sequence, location }>
│   └── pricing: { courierEarnings, platformFees }
│
├── longHaulRoutes/{routeId}
│   ├── type: 'long_haul' (50-200+ miles)
│   ├── runnerId?: string
│   ├── originHub: { hubId, name, location }
│   ├── destinationHub: { hubId, name, location }
│   ├── packageIds: string[]
│   └── pricing: { runnerEarnings, platformFees }
│
├── packages/{packageId}
│   ├── senderId: string (Customer)
│   ├── recipientId?: string
│   ├── currentStatus: PackageStatus
│   ├── journey: Array<{ type, status, routeId, runnerId }>
│   ├── origin: { address, hubId }
│   ├── destination: { address, hubId }
│   └── pricing: { shippingFee, breakdown, totalCustomerPaid }
│
├── items/{itemId}
│   ├── sellerId: string (Vendor)
│   ├── title, description, price
│   ├── photos: string[]
│   ├── pickupLocation: { address, lat, lng }
│   ├── deliveryMethods: Array<'delivery' | 'pickup'>
│   └── status: 'available' | 'sold' | 'unavailable'
│
├── marketplaceOrders/{orderId}
│   ├── buyerId: string (Customer)
│   ├── sellerId: string (Vendor)
│   ├── itemId: string
│   ├── status: OrderStatus
│   ├── deliveryMethod: 'delivery' | 'pickup'
│   ├── jobId?: string (Created when vendor marks ready)
│   └── pricing: { itemPrice, deliveryFee, vendorReceives }
│
├── ratings/{ratingId}
│   ├── deliveryJobId: string
│   ├── fromUserId: string
│   ├── toUserId: string
│   ├── role: 'customer' | 'courier'
│   ├── stars: number (1-5)
│   └── categories?: { professionalism, timeliness, communication, care }
│
├── disputes/{disputeId}
│   ├── type: 'low_rating_suspension' | 'customer_complaint' | 'payment_dispute'
│   ├── courierUid?: string
│   ├── status: 'open' | 'resolved'
│   └── resolvedBy?: string (Admin UID)
│
├── hubs/{hubId}
│   ├── name, code, type
│   ├── location: { lat, lng, address, city, state, zip }
│   ├── operatingHours: { monday: { open, close }, ... }
│   ├── storageCapacity: number
│   └── isActive: boolean
│
└── featureFlags/config
    ├── marketplace: { enabled, vendorOnboarding, foodDelivery }
    ├── delivery: { routes, longRoutes, express }
    ├── courier: { equipment, rateCards, autoSuspension }
    ├── packageRunner: { enabled, hubNetwork }
    └── customer: { saveAddresses, scheduleDeliveries, tip }
```

---

## Data Flow Diagrams

### 🔄 Flow 1: Local Delivery (Customer → Courier)

```
┌─────────────┐
│  CUSTOMER   │
│    👤       │
└──────┬──────┘
       │ 1. Create Job
       │ POST /customer/request-delivery
       │ { pickup, dropoff, pricing }
       ▼
┌────────────────────────────────┐
│ Firestore: jobs/{jobId}        │
│ status: 'open'                 │
│ createdByUid: customer.uid     │
│ courierUid: null               │
└────────┬───────────────────────┘
         │ 2. Cloud Function Trigger
         │ onCreateJob
         ▼
┌──────────────────────────────────┐
│ Find Couriers in Range          │
│ - Online couriers                │
│ - Within serviceRadius           │
│ - Work mode matches              │
│ - Equipment approved (if food)   │
└────────┬─────────────────────────┘
         │ 3. Send Notifications
         ▼
┌─────────────┐
│  COURIER    │
│    🚗       │
└──────┬──────┘
       │ 4. View Available Jobs
       │ GET /courier/dashboard
       │ Filter: eligible jobs only
       ▼
┌────────────────────────────────┐
│ Courier Sees Job on Map        │
│ - Purple pin at pickup          │
│ - Distance: 5 mi                │
│ - Estimated fee: $12.50         │
│ - Pickup/dropoff (masked)       │
└────────┬───────────────────────┘
         │ 5. Claim Job (Transaction)
         │ PUT /jobs/{jobId}/claim
         ▼
┌────────────────────────────────┐
│ Firestore: jobs/{jobId}        │
│ status: 'assigned'             │
│ courierUid: courier.uid        │
│ agreedFee: 1250 (cents)        │
└────────┬───────────────────────┘
         │ 6. Real-time Update
         │ Firestore listener
         ▼
┌─────────────┐
│  CUSTOMER   │
│    👤       │
│ "Courier    │
│  assigned"  │
└──────┬──────┘
       │ 7. Track Delivery
       │ Courier location updates every 10s
       │ useCourierLocationWriter hook
       ▼
┌────────────────────────────────┐
│ Status Progression:            │
│ assigned → enroute_pickup →    │
│ picked_up → enroute_dropoff →  │
│ arrived_dropoff → completed    │
└────────┬───────────────────────┘
         │ 8. Delivery Complete
         │ status: 'completed'
         ▼
┌────────────────────────────────┐
│ Cloud Function: capturePayment │
│ - Capture Stripe payment        │
│ - Update paymentStatus          │
│ - Add to courier earnings       │
└────────┬───────────────────────┘
         │ 9. Rating
         ▼
┌─────────────┐
│  CUSTOMER   │
│ Rate Courier│
│ ⭐⭐⭐⭐⭐    │
└──────┬──────┘
       │ 10. Cloud Function: enforceRatings
       ▼
┌────────────────────────────────┐
│ Update Courier Stats           │
│ - Calculate average rating     │
│ - Check suspension threshold   │
│ - Auto-suspend if < 3.5        │
└────────────────────────────────┘
```

---

### 🛒 Flow 2: Marketplace Order (Customer → Vendor → Courier)

```
┌─────────────┐
│  CUSTOMER   │
│    👤       │
└──────┬──────┘
       │ 1. Browse Marketplace
       │ GET /marketplace
       ▼
┌────────────────────────────────┐
│ Firestore: items               │
│ Filter: status = 'available'   │
│ Query by category, price       │
└────────┬───────────────────────┘
         │ 2. View Item Detail
         ▼
┌─────────────┐
│   VENDOR    │
│    🏪       │
│ Item:       │
│ "iPhone 13" │
│ $800        │
└──────┬──────┘
       │ 3. Customer Orders
       │ POST /marketplace/checkout
       │ { itemId, deliveryMethod: 'delivery', deliveryAddress }
       ▼
┌────────────────────────────────┐
│ Stripe: Create Payment Intent  │
│ - Pre-authorize $812 (item +   │
│   delivery fee)                 │
│ - Hold funds (not captured yet) │
└────────┬───────────────────────┘
         │ 4. Create Order
         ▼
┌────────────────────────────────┐
│ Firestore:                     │
│ marketplaceOrders/{orderId}    │
│ status: 'paid'                 │
│ buyerId: customer.uid          │
│ sellerId: vendor.uid           │
│ stripePaymentIntentId: "pi_..." │
└────────┬───────────────────────┘
         │ 5. Notify Vendor
         │ sendNotifications trigger
         ▼
┌─────────────┐
│   VENDOR    │
│    🏪       │
│ "New Order!"│
└──────┬──────┘
       │ 6. Prepare Item
       │ Vendor packs item
       │ 
       │ 7. Mark Ready
       │ PUT /vendor/orders/{orderId}
       │ { status: 'ready_for_pickup' }
       ▼
┌────────────────────────────────┐
│ Cloud Function:                │
│ onVendorMarkReady              │
│                                │
│ IF deliveryMethod = 'delivery':│
│   - Create jobs/{jobId}        │
│   - pickup: vendor.location    │
│   - dropoff: customer.address  │
│   - Link: order.jobId = jobId  │
└────────┬───────────────────────┘
         │ 8. Courier Discovery
         │ (Same as Flow 1)
         ▼
┌─────────────┐
│  COURIER    │
│    🚗       │
└──────┬──────┘
       │ 9. Claim & Deliver
       │ (Follow Flow 1 steps 4-8)
       ▼
┌────────────────────────────────┐
│ Courier picks up from Vendor   │
│ Delivers to Customer            │
│ status: 'delivered'             │
└────────┬───────────────────────┘
         │ 10. Payment Capture
         │ Cloud Function: captureMarketplacePayment
         ▼
┌────────────────────────────────┐
│ Stripe: Capture Payment        │
│ - Charge customer $812          │
│ - Transfer to vendor: $681.80   │
│   (item $800 - platform 15% -   │
│    Stripe 2.9%)                 │
│ - Pay courier: $10.20 (delivery)│
└────────┬───────────────────────┘
         │ 11. Mark Item Sold
         │ items/{itemId}.status: 'sold'
         ▼
┌─────────────┐
│   VENDOR    │
│ Receives    │
│ Payout      │
│ $681.80     │
└─────────────┘
```

---

### 📦 Flow 3: Package Shipping (Customer → Runner → Last-Mile Courier)

```
┌─────────────┐
│  CUSTOMER   │
│    👤       │
└──────┬──────┘
       │ 1. Ship Package
       │ POST /ship
       │ { origin: SF, destination: LA, weight: 10 lbs }
       ▼
┌────────────────────────────────┐
│ Calculate Shipping Fee         │
│ - Distance: 380 miles           │
│ - Service level: standard       │
│ - Weight: 10 lbs                │
│ - Total: $45                    │
└────────┬───────────────────────┘
         │ 2. Create Package
         ▼
┌────────────────────────────────┐
│ Firestore: packages/{packageId}│
│ currentStatus: 'pickup_pending' │
│ journey: [                      │
│   { type: 'pickup', status:     │
│     'pending' },                │
│   { type: 'long_haul',          │
│     fromHub: 'hub_sf',          │
│     toHub: 'hub_la',            │
│     status: 'pending' },        │
│   { type: 'last_mile', status:  │
│     'pending' }                 │
│ ]                               │
└────────┬───────────────────────┘
         │ 3. Local Pickup
         │ Courier accepts pickup job
         ▼
┌─────────────┐
│  COURIER    │
│    🚗       │
│ (Local SF)  │
└──────┬──────┘
       │ 4. Deliver to Origin Hub
       │ SF Hub, 123 Mission St
       ▼
┌────────────────────────────────┐
│ Hub: Scan Package In           │
│ - journey[0].status: 'completed'│
│ - currentStatus: 'at_origin_hub'│
│ - Hub: inboundPackages++        │
└────────┬───────────────────────┘
         │ 5. Hub Aggregation
         │ Wait for more packages
         │ (15+ packages to same dest)
         ▼
┌────────────────────────────────┐
│ Cloud Function:                │
│ buildLongHaulRoutes            │
│ Schedule: Daily at midnight UTC │
│                                │
│ Query:                          │
│ packages.currentStatus in       │
│   ['at_origin_hub', 'pickup_   │
│    pending']                    │
│                                │
│ Group by: origin/dest hub pairs│
│ Filter: 15+ packages per pair   │
└────────┬───────────────────────┘
         │ 6. Create Route
         ▼
┌────────────────────────────────┐
│ Firestore:                     │
│ longHaulRoutes/{routeId}       │
│ originHub: hub_sf              │
│ destinationHub: hub_la         │
│ packageIds: [20 packages]      │
│ distance: 380 miles            │
│ runnerEarnings: $500           │
│ status: 'available'            │
└────────┬───────────────────────┘
         │ 7. Update Package Journey
         │ journey[1].routeId = routeId
         ▼
┌─────────────┐
│   RUNNER    │
│    🚚       │
└──────┬──────┘
       │ 8. View Available Routes
       │ GET /runner/available-routes
       │ Filter: homeHub = hub_sf,
       │         vehicleType match
       ▼
┌────────────────────────────────┐
│ Runner Sees Route:             │
│ - SF → LA                       │
│ - 380 miles                     │
│ - 20 packages                   │
│ - $500 earnings                 │
│ - Tomorrow 8 AM departure       │
└────────┬───────────────────────┘
         │ 9. Claim Route (Transaction)
         │ PUT /longHaulRoutes/{routeId}/claim
         ▼
┌────────────────────────────────┐
│ longHaulRoutes/{routeId}       │
│ status: 'claimed'              │
│ runnerId: runner.uid           │
│                                │
│ All packages:                   │
│ journey[1].runnerId: runner.uid│
│ journey[1].status: 'in_progress'│
│ currentStatus: 'in_transit'    │
└────────┬───────────────────────┘
         │ 10. Runner Picks Up from SF Hub
         │ Scan all 20 packages
         │ Load vehicle
         ▼
┌─────────────┐
│   RUNNER    │
│    🚚       │
│ Drives SF   │
│    ↓        │
│   LA        │
│ (6 hours)   │
└──────┬──────┘
       │ 11. Customer Tracks Package
       │ GET /track/package/{trackingNumber}
       ▼
┌─────────────┐
│  CUSTOMER   │
│ "In transit │
│ with Runner │
│ John D."    │
│ [Map showing│
│  SF to LA]  │
└──────┬──────┘
       │ 12. Runner Arrives LA Hub
       │ Unload 20 packages
       │ Scan at hub checkin
       ▼
┌────────────────────────────────┐
│ Hub: Scan Packages In          │
│ - journey[1].status: 'completed'│
│ - currentStatus:                │
│   'at_destination_hub'          │
│ - Hub: inboundPackages += 20    │
└────────┬───────────────────────┘
         │ 13. Route Complete
         │ longHaulRoutes/{routeId}.status: 'completed'
         │ Runner receives $500 payout
         ▼
┌─────────────┐
│  COURIER    │
│    🚗       │
│ (Local LA)  │
└──────┬──────┘
       │ 14. Last-Mile Delivery
       │ Courier picks up from LA Hub
       │ Delivers to customer in LA
       ▼
┌────────────────────────────────┐
│ Package Delivered              │
│ - journey[2]: 'last_mile'       │
│   status: 'completed'           │
│ - currentStatus: 'delivered'    │
└────────┬───────────────────────┘
         │ 15. Payment Capture
         │ Cloud Function: capturePayment
         ▼
┌────────────────────────────────┐
│ Stripe: Capture $45            │
│ - Runner receives: $25 (payout)│
│ - Last-mile courier: $8         │
│ - Platform fee: $12             │
└────────────────────────────────┘
```

---

### ⚙️ Flow 4: Admin Approval (Runner Application)

```
┌─────────────┐
│   RUNNER    │
│    🚚       │
│ (Applicant) │
└──────┬──────┘
       │ 1. Apply at /runner/onboarding
       │ Complete 5-step form:
       │ - Vehicle info + photo
       │ - Driver license + photo
       │ - DOT/MC numbers
       │ - Commercial insurance ($100k+)
       │ - Home hub + preferred routes
       ▼
┌────────────────────────────────┐
│ Firestore: users/{uid}         │
│ packageRunnerProfile:          │
│   status: 'pending_review'     │
│   applicationSubmittedAt: now()│
│   vehiclePhotoUrl: "..."       │
│   driverLicenseInfo: { ... }   │
│   commercialInsurance: { ... } │
└────────┬───────────────────────┘
         │ 2. Admin Notification
         │ sendNotifications trigger
         ▼
┌─────────────┐
│    ADMIN    │
│     ⚙️      │
└──────┬──────┘
       │ 3. View Application
       │ GET /admin/runners?status=pending
       ▼
┌────────────────────────────────┐
│ Admin Sees Application:        │
│ - Name: John Doe                │
│ - Vehicle: 2020 Ford Sprinter   │
│ - [View Vehicle Photo]          │
│ - [View Driver License]         │
│ - [View Insurance Certificate]  │
│ - Coverage: $150,000 ✓          │
│ - Expiration: Dec 2026 ✓        │
│ - Home Hub: SF Hub              │
└────────┬───────────────────────┘
         │ 4. Admin Reviews
         │ Checks:
         │ ✓ Vehicle photo matches description
         │ ✓ Driver license valid, not expired
         │ ✓ Insurance >= $100k, commercial auto
         │ ✓ DOT/MC numbers (if applicable)
         ▼
┌─────────────┐
│    ADMIN    │
│ Clicks      │
│ "Approve"   │
└──────┬──────┘
       │ 5. Call Cloud Function
       │ POST /setPackageRunnerClaim
       │ { uid: runner.uid, approve: true }
       ▼
┌────────────────────────────────┐
│ Cloud Function:                │
│ setPackageRunnerClaim          │
│                                │
│ Actions:                        │
│ 1. Set custom claim:            │
│    auth.setCustomUserClaims(uid,│
│      { packageRunner: true })   │
│                                │
│ 2. Update Firestore:            │
│    users/{uid}                  │
│    packageRunnerProfile:        │
│      status: 'approved'         │
│      approvedAt: now()          │
│      approvedBy: admin.uid      │
└────────┬───────────────────────┘
         │ 6. Send Notification
         │ Email + Push notification
         ▼
┌─────────────┐
│   RUNNER    │
│ "Application│
│  Approved!" │
└──────┬──────┘
       │ 7. Access Dashboard
       │ GET /runner/dashboard
       │ Security rule checks:
       │ - request.auth.token.packageRunner == true ✓
       ▼
┌────────────────────────────────┐
│ Runner Dashboard               │
│ - Status: Approved ✓            │
│ - Available Routes (shows list) │
│ - Can now claim routes          │
└────────────────────────────────┘
```

---

## Cloud Functions Reference

### Scheduled Functions

| Function | Schedule | Purpose | Collections Modified |
|----------|----------|---------|---------------------|
| **buildRoutes** | Every 30 minutes | Batch pending jobs into local delivery routes | `routes`, `deliveryJobs` |
| **buildLongRoutes** | Every 2 hours | Group long-distance jobs (50-200 mi) into routes | `longRoutes`, `deliveryJobs` |
| **buildLongHaulRoutes** | Daily at midnight UTC | Batch packages by hub pairs into runner routes | `longHaulRoutes`, `packages` |
| **autoCancel** | Every 15 minutes | Cancel jobs not claimed within timeout period | `jobs` → trigger refund |

---

### Firestore Triggers

| Function | Trigger | Purpose | Impact |
|----------|---------|---------|--------|
| **onCreateJob** | `jobs/{jobId}` onCreate | Notify couriers of new available job | Send push notifications |
| **capturePayment** | `jobs/{jobId}` onUpdate<br>(status → 'completed') | Capture pre-authorized Stripe payment | Update paymentStatus, add courier earnings |
| **refundPayment** | `jobs/{jobId}` onUpdate<br>(status → 'cancelled') | Refund customer automatically | Create Stripe refund, update paymentStatus |
| **sendNotifications** | `jobs/{jobId}` onUpdate<br>(any status change) | Notify customer/courier of delivery progress | Send push notifications |
| **enforceRatings** | `ratings/{ratingId}` onCreate | Update courier average rating, auto-suspend if low | Update courier stats, create dispute if suspended |
| **onVendorMarkReady** | `marketplaceOrders/{orderId}` onUpdate<br>(status → 'ready_for_pickup') | Create delivery job for marketplace order | Create `jobs/{jobId}`, link to order |
| **captureMarketplacePayment** | `marketplaceOrders/{orderId}` onUpdate<br>(status → 'delivered') | Capture payment, transfer to vendor | Stripe capture + transfer, update vendor stats, mark item sold |
| **refundMarketplaceOrder** | `marketplaceOrders/{orderId}` onUpdate<br>(status → 'cancelled') | Refund marketplace order | Stripe refund, mark item available again |

---

### HTTP Callable Functions

| Function | Caller | Purpose | Actions |
|----------|--------|---------|---------|
| **setPackageRunnerClaim** | Admin | Approve/reject runner application | Set custom claim `packageRunner: true`, update user status |
| **setAdminClaim** | Admin | Promote user to admin role | Set custom claim `role: 'admin'`, update user document |
| **seedHubs** | Admin | One-time hub network setup | Create 18 hub documents across US |

---

## Security Rules Matrix

### Collection Access Permissions

| Collection | Customer | Courier | Runner | Vendor | Admin |
|------------|----------|---------|--------|--------|-------|
| **users** | Own profile (R/W) | Own profile (R/W) | Own profile (R/W) | Own profile (R/W) | All users (R/W) |
| **jobs** | Own jobs (R/W) | Available + claimed (R/W) | ❌ | ❌ | All jobs (R/W) |
| **routes** | ❌ | Available + claimed (R/W) | ❌ | ❌ | All routes (R/W) |
| **longHaulRoutes** | ❌ | ❌ | Available + claimed (R/W) | ❌ | All routes (R/W) |
| **packages** | Own packages (R) | ❌ | Assigned packages (R/W) | ❌ | All packages (R/W) |
| **items** | All available (R) | ❌ | ❌ | Own items (R/W) | All items (R/W) |
| **marketplaceOrders** | Own orders (R) | ❌ | ❌ | Own orders (R/W) | All orders (R/W) |
| **ratings** | Own ratings (R/W) | Own ratings (R/W) | ❌ | ❌ | All ratings (R) |
| **disputes** | ❌ | ❌ | ❌ | ❌ | All disputes (R/W) |
| **hubs** | All hubs (R) | All hubs (R) | All hubs (R) | All hubs (R) | All hubs (R/W) |
| **featureFlags** | Read config (R) | Read config (R) | Read config (R) | Read config (R) | Config (R/W) |

**Legend:**
- R = Read access
- W = Write access
- R/W = Full access
- ❌ = No access

---

## System Architecture

### Technology Stack

```
┌─────────────────────────────────────────┐
│           CLIENT APPLICATIONS           │
├─────────────────────────────────────────┤
│ Web App (Next.js 15, React 19)         │
│ - Customer pages: /customer/*            │
│ - Courier pages: /courier/*              │
│ - Runner pages: /runner/*                │
│ - Vendor pages: /vendor/*                │
│ - Admin pages: /admin/*                  │
│                                          │
│ Flutter Apps (iOS/Android)              │
│ - Customer app                           │
│ - Courier app                            │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS / WebSocket
               ▼
┌─────────────────────────────────────────┐
│         FIREBASE SERVICES               │
├─────────────────────────────────────────┤
│ Authentication                           │
│ - Email/Password                         │
│ - Custom claims (role, packageRunner)   │
│                                          │
│ Firestore Database                       │
│ - Real-time listeners                    │
│ - Security rules enforcement             │
│ - Composite indexes                      │
│                                          │
│ Cloud Functions (Node.js 18)            │
│ - Scheduled: Route building              │
│ - Triggers: Payments, notifications      │
│ - HTTP Callable: Admin actions           │
│                                          │
│ Cloud Storage                            │
│ - Item photos                            │
│ - Vehicle/license photos                 │
│ - Insurance certificates                 │
│ - Proof of delivery                      │
└──────────────┬──────────────────────────┘
               │
               │ Webhooks / API
               ▼
┌─────────────────────────────────────────┐
│        EXTERNAL SERVICES                │
├─────────────────────────────────────────┤
│ Stripe                                   │
│ - Payment Intents (pre-auth)            │
│ - Stripe Connect (vendor/courier/runner)│
│ - Automatic payouts                      │
│                                          │
│ Mapbox                                   │
│ - Geocoding                              │
│ - Routing & directions                   │
│ - Real-time location display             │
│                                          │
│ SendGrid (optional)                      │
│ - Transactional emails                   │
│ - Notification delivery                  │
│                                          │
│ Firebase Cloud Messaging                 │
│ - Push notifications                     │
│ - Device tokens management               │
└─────────────────────────────────────────┘
```

---

### Deployment Architecture

```
┌───────────────────────────────────────────────┐
│              PRODUCTION                       │
├───────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────┐     │
│  │  Firebase Hosting                    │     │
│  │  - Next.js SSR/SSG                   │     │
│  │  - CDN: Global edge network          │     │
│  │  - Custom domain: gosenderr.com      │     │
│  └─────────────────────────────────────┘     │
│                                               │
│  ┌─────────────────────────────────────┐     │
│  │  Firestore (Multi-region)           │     │
│  │  - nam5 (North America)              │     │
│  │  - Automatic backups                 │     │
│  │  - Point-in-time recovery            │     │
│  └─────────────────────────────────────┘     │
│                                               │
│  ┌─────────────────────────────────────┐     │
│  │  Cloud Functions (us-central1)      │     │
│  │  - 1GB memory (scheduled)            │     │
│  │  - 512MB memory (triggers)           │     │
│  │  - Min instances: 0 (cold start OK)  │     │
│  └─────────────────────────────────────┘     │
│                                               │
│  ┌─────────────────────────────────────┐     │
│  │  Cloud Storage (Multi-region)       │     │
│  │  - Lifecycle policies                │     │
│  │  - Image optimization                │     │
│  │  - CDN caching                       │     │
│  └─────────────────────────────────────┘     │
│                                               │
└───────────────────────────────────────────────┘
```

---

## Development Guidelines

### Adding New Features

1. **Update Role Documentation**
   - Add new permissions to relevant role doc
   - Document new collections/fields
   - Update data flow diagrams

2. **Security Rules**
   - Add rules to `firebase/firestore.rules`
   - Test with Firebase Emulator
   - Deploy with `firebase deploy --only firestore:rules`

3. **Cloud Functions**
   - Add function to `firebase/functions/src/`
   - Document trigger/schedule
   - Test locally with emulator
   - Deploy with `firebase deploy --only functions`

4. **Testing**
   - Unit tests for functions
   - Integration tests for flows
   - Security rules tests
   - Manual QA on staging

---

## Cross-Role Interactions Summary

```
     CUSTOMER
        │
        ├─── creates ───→ JOB ───→ claimed by ───→ COURIER
        │                                              │
        ├─── orders ────→ ITEM ───→ sold by ────→ VENDOR
        │                  │                          │
        │                  └─── delivery via ─────────┘
        │
        ├─── ships ─────→ PACKAGE ─→ assigned to ──→ RUNNER
        │
        └─── rates ─────→ RATING ──→ affects ───→ COURIER
                            │
                            └──→ reviewed by ──→ ADMIN
                                     │
                                     └───→ manages all roles
```

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Maintained By:** GoSenderr Engineering Team

---

## Quick Links

- [Customer Role Documentation](./01-CUSTOMER-ROLE.md)
- [Courier Role Documentation](./02-COURIER-ROLE.md)
- [Runner Role Documentation](./03-RUNNER-ROLE.md)
- [Vendor Role Documentation](./04-VENDOR-ROLE.md)
- [Admin Role Documentation](./05-ADMIN-ROLE.md)

---

**Questions or Issues?**  
Contact the engineering team or file an issue in the project repository.

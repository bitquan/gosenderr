# GoSenderr Routes Documentation

**Last Updated:** January 21, 2026

## 🚀 Application URLs

### Development Server

```
http://localhost:3000
```

## 📦 Public Routes

- `/` - Home page
- `/login` - User login page
- `/select-role` - Role selection after login

### Package Tracking (No Auth Required)

- `/track/package/[trackingNumber]` - Public package tracking page
  - Example: `/track/package/PKG1737491234`
  - **Feature:** Public tracking enabled (Phase 1) - anyone with tracking number can view package status

## 👤 Customer Routes

### Jobs & Delivery

- `/customer/dashboard` - Customer dashboard ✅ **New**
  - Recent packages and jobs
  - Quick action cards
  - Activity overview
- `/customer/packages` - View all packages ✅ **New**
  - Filter by status
  - Search and sort
  - Quick tracking links
- `/customer/packages/[packageId]` - Package details ✅ **New**
  - Full package information
  - Journey timeline
  - Pricing breakdown
- `/customer/jobs` - View all customer jobs
- `/customer/jobs/new` - Create new job
- `/customer/jobs/[jobId]` - View specific job details
- `/customer/request-delivery` - Request delivery
- `/customer/checkout` - Checkout page
- `/customer/payment` - Payment page

### Shipping & Payment (Phase 1 ✅)

- `/ship` - Package shipping form
  - **Features:**
    - Address input with hub detection
    - Package details form
    - Service level selection (standard/express/priority)
    - Live pricing calculation
    - **Phase 1:** Stripe Payment Intent creation
- `/ship/confirmation/[packageId]` - Payment confirmation page
  - **Phase 1 Features:**
    - Stripe Elements integration
    - PaymentElement component
    - Package details display
    - Payment status updates (payment_pending → paid → pickup_pending)

## 🚗 Courier Routes (Local Delivery)

- `/courier/dashboard` - Courier dashboard
- `/courier/setup` - Courier account setup
- `/courier/equipment` - Equipment management
- `/courier/rate-cards` - View rate cards
- `/courier/jobs/[jobId]` - View specific courier job
- `/courier/routes` - Available routes list ✅ **Phase 1**
  - **Phase 1 Features:**
    - Route cards with summary stats
    - **Route Details Modal** with:
      - Summary stats (earnings, stops, distance, time)
      - MapboxMap preview
      - Stop-by-stop breakdown
    - Accept route functionality
- `/courier/active-route` - Active route interface ✅ **Phase 1**
  - **Phase 1 Features:**
    - Current stop display
    - Progress tracking
    - **GPS Photo Capture** with:
      - Camera access
      - High-accuracy GPS coordinates
      - Image compression (0.5MB max, 1920px)
      - Firebase Storage upload with metadata
    - Proof of delivery with photo + GPS
    - Navigation to next stop

## 🚚 Runner Routes (Long-Haul Delivery)

- `/runner/dashboard` - Runner dashboard ✅ **New**
  - Earnings and stats
  - Recent routes
  - Quick actions
- `/runner/onboarding` - Runner onboarding
- `/runner/available-routes` - Available long-haul routes

## 🛒 Marketplace Routes

- `/marketplace` - Marketplace home
- `/marketplace/create` - Create marketplace listing
- `/marketplace/[itemId]` - View marketplace item

## 🏪 Seller Routes

- `/seller/items` - View seller items
- `/seller/items/new` - Create new seller item

## 👨‍💼 Admin Routes

- `/admin/dashboard` - Admin dashboard ✅ **New**
  - System stats overview
  - Quick links to management pages
- `/admin/users` - User management ✅ **New**
  - View all users
  - Filter by role
  - User details
- `/admin/packages` - Package management ✅ **New**
  - View all packages
  - Filter by status
  - Package tracking
- `/admin/routes` - Route management ✅ **New**
  - View all routes
  - Filter by status
  - Route details
- `/admin/equipment-review` - Review equipment submissions
- `/admin/feature-flags` - Manage feature flags

## 🔧 API Routes

### Payment

- `POST /api/create-payment-intent` - Create Stripe Payment Intent
  - Body: `{ amount, currency, metadata }`
  - Returns: `{ clientSecret, paymentIntentId }`

### Webhooks

- `POST /api/webhooks/stripe` - Stripe webhook handler (planned)

## 📱 Feature Status

### ✅ Phase 1 Complete (Issue #12)

- [x] Stripe payment integration (`/ship` → `/ship/confirmation/[packageId]`)
- [x] Public package tracking (`/track/[trackingNumber]`)
- [x] Route details modal (`/courier/routes`)
- [x] GPS photo capture (`/courier/active-route`)

### 🚧 Upcoming Phases

- [ ] Phase 1.5: Dashboard Enhancements (Issue #23)
  - Real-time updates
  - Advanced admin features
  - User management actions
  - Route optimization tools
- [ ] Phase 2: TBD (Issue #13)
- [ ] Phase 3: TBD (Issue #14)
- [ ] Phase 4: TBD (Issue #15)
- [ ] Phase 5: TBD (Issue #16)

## � Missing Routes (Need Implementation)

**All missing routes have been created!** 🎉

Previously missing routes that now exist:

- ✅ `/customer/dashboard` - Basic customer dashboard with recent activity
- ✅ `/customer/packages` - Package list view with filtering
- ✅ `/customer/packages/[packageId]` - Package detail view
- ✅ `/runner/dashboard` - Runner dashboard with stats and routes
- ✅ `/admin/dashboard` - Admin overview dashboard
- ✅ `/admin/users` - User management list
- ✅ `/admin/packages` - Package management list
- ✅ `/admin/routes` - Route management list

**Note:** These are basic implementations. Advanced features are tracked in [Issue #23](https://github.com/bitquan/gosenderr/issues/23).

## 🗺️ Navigation Flow

### Customer Journey

```
/ → /login → /select-role → /customer/dashboard
                          ↓
                 /customer/packages (view all)
                          ↓
                  /ship → /ship/confirmation/[packageId] → /customer/packages/[packageId]
                          ↓
                 /track/package/[trackingNumber] (public link)
```

### Courier Journey

```
/ → /login → /select-role → /courier/dashboard → /courier/setup
                          ↓
                   /courier/routes (view + accept route)
                          ↓
                   /courier/active-route (complete deliveries with GPS photos)
                          ↓
                   /courier/dashboard (route completed)
```

### Runner Journey

```
/ → /login → /select-role → /runner/dashboard
                          ↓
                   /runner/onboarding
                          ↓
                   /runner/available-routes
```

## 🔒 Route Protection

- **Public:** `/`, `/login`, `/select-role`, `/track/package/*`, `/marketplace`, `/marketplace/*`
- **Customer Only:** `/customer/*`, `/ship/*`
- **Courier Only:** `/courier/*`
- **Runner Only:** `/runner/*`
- **Seller Only:** `/seller/*`
- **Admin Only:** `/admin/*`

## 📝 Notes

- All authenticated routes require Firebase Authentication
- Firestore security rules enforce role-based access
- Public tracking enabled via Firestore rules (no auth required for packages read)
- Stripe integration uses Payment Intents API (v2024-11-20)
- GPS photos stored in Firebase Storage at `delivery-photos/{userId}/{jobId}/`

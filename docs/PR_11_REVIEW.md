# PR #11 Review: Complete Routes System with Local Batching, Interstate Logistics, and Feature Flags

**Branch:** `pr-11`  
**Status:** Ready for review  
**Commits:** 10 commits adding comprehensive route management system

---

## 🎯 Overview

This PR introduces a complete multi-tier routing system for package delivery with:

- **Local routes** (within city, <50 miles)
- **Long routes** (regional, 50-200 miles)
- **Long haul routes** (interstate, 200+ miles)
- **Package runner** onboarding and UI
- **Feature flags** system for gradual rollout
- **Package tracking** page with real-time updates
- **Hub network** infrastructure

---

## 📦 New Features Added

### 1. **Three-Tier Routing System**

#### Local Routes (< 50 miles)

- Batches delivery jobs in the same metro area
- Optimizes stops within a city
- Uses existing courier network
- **File:** `firebase/functions/src/triggers/buildRoutes.ts`

#### Long Routes (50-200 miles, regional)

- City-to-city package batching (e.g., SF → Sacramento)
- Daily scheduled runs
- Separate from local delivery
- **File:** `firebase/functions/src/triggers/buildLongRoutes.ts`

#### Long Haul Routes (200+ miles, interstate)

- Hub-to-hub transport (e.g., SF Hub → Denver Hub)
- Scheduled daily at midnight UTC
- Packages grouped by origin/destination hub pairs
- **File:** `firebase/functions/src/triggers/buildLongHaulRoutes.ts`

### 2. **Hub Network Infrastructure**

**Major hubs seeded across the US:**

- San Francisco, CA
- Los Angeles, CA
- Seattle, WA
- Phoenix, AZ
- Denver, CO
- Salt Lake City, UT
- Dallas, TX
- Houston, TX
- Chicago, IL
- Minneapolis, MN
- Detroit, MI
- Atlanta, GA
- Miami, FL
- Charlotte, NC
- Washington DC
- Philadelphia, PA
- New York, NY
- Boston, MA

**File:** `firebase/functions/src/triggers/seedHubs.ts`

**Admin callable function** to initialize hub network.

### 3. **Package Shipping UI** (`/ship`)

Complete package shipping flow:

- Address input with geocoding
- Automatic hub assignment based on location
- Package details (dimensions, weight, fragile flag)
- Service level selection (standard/express/priority)
- Multi-leg journey planning
- Real-time pricing calculation
- **File:** `apps/web/src/app/ship/page.tsx` (685 lines)

**Pricing breakdown:**

- Local pickup fee ($10 min + $1.50/mile)
- Long haul per leg ($50)
- Local delivery fee ($10 min + $1.50/mile)
- Platform fee ($5)
- Service level multipliers (1.0x, 1.5x, 2.0x)

### 4. **Package Tracking** (`/track/package/[trackingNumber]`)

Real-time package tracking with:

- Journey progress visualization
- Current status badges
- Leg-by-leg breakdown
- Estimated delivery time
- Live Firestore updates
- **File:** `apps/web/src/app/track/package/[trackingNumber]/page.tsx`

### 5. **Courier Routes UI** (`/courier/routes`)

Courier-facing interface to:

- View available routes
- Filter by type (local/long/longHaul)
- See route details (stops, distance, earnings)
- Accept routes
- Navigate to active route
- **File:** `apps/web/src/app/courier/routes/page.tsx`

### 6. **Package Runner System**

New role for handling long-distance route segments:

**Onboarding flow** (`/runner/onboarding`):

- Vehicle information
- Equipment capabilities
- Route preferences (local/regional/interstate)
- **File:** `apps/web/src/app/runner/onboarding/page.tsx`

**Available routes** (`/runner/available-routes`):

- View unclaimed routes
- Accept routes
- View earnings
- **File:** `apps/web/src/app/runner/available-routes/page.tsx`

### 7. **Feature Flags System**

Granular control over feature rollout:

```typescript
{
  marketplace: {
    enabled: boolean,
    itemListings: boolean,
    combinedPayments: boolean
  },
  delivery: {
    onDemand: boolean,
    routes: boolean,
    longRoutes: boolean,
    longHaul: boolean
  },
  courier: {
    rateCards: boolean,
    equipmentBadges: boolean,
    workModes: boolean
  },
  packageRunner: {
    enabled: boolean,
    onboarding: boolean,
    routeAcceptance: boolean
  },
  customer: {
    routeDelivery: boolean,
    packageShipping: boolean
  }
}
```

**Files:**

- `apps/web/src/hooks/useFeatureFlags.ts` - React hook for real-time flags
- `apps/web/src/components/FeatureFlagToggle.tsx` - Admin toggle component
- `apps/web/src/app/admin/feature-flags/page.tsx` - Admin UI

**Firestore document:** `featureFlags/config`

---

## 🗂️ New Firestore Collections

### `routes`

Local batched delivery routes with optimized stops.

**Structure:**

- `routeId`, `type: 'local'`, `status`, `scheduledDate`
- `area: { name, centerLat, centerLng, radiusMiles }`
- `jobIds[]`, `optimizedStops[]`
- `totalDistance`, `estimatedDuration`
- `pricing: { courierEarnings, platformFees }`
- `courierId`, `claimedAt`, `startedAt`, `completedAt`

### `longRoutes`

Regional city-to-city routes (50-200 miles).

**Structure:**

- `type: 'long'`, `originCity`, `destinationCity`
- `jobIds[]`, `packages[]`
- `scheduledDate`, `estimatedTransitTime`

### `longHaulRoutes`

Interstate hub-to-hub routes (200+ miles).

**Structure:**

- `type: 'longHaul'`, `originHubId`, `destinationHubId`
- `packages[]` (batched by hub pair)
- `scheduledDate`, `totalDistance`
- `runnerId`, `claimedAt`

### `hubs`

Physical hub locations for package sorting and transfers.

**Structure:**

- `hubId`, `name`, `city`, `state`
- `lat`, `lng`, `address`
- `timezone`, `operatingHours`
- `capacity`, `currentPackages`

### `packages`

New document type for package shipments (separate from delivery jobs).

**Structure:**

- `packageId`, `trackingNumber`
- `customerId`, `sender`, `recipient`
- `origin: { address, lat, lng, hubId }`
- `destination: { address, lat, lng, hubId }`
- `dimensions: { weight, length, width, height }`
- `serviceLevel: 'standard' | 'express' | 'priority'`
- `currentStatus`, `journey[]` (legs with timestamps)
- `pricing`, `createdAt`, `estimatedDelivery`

### `featureFlags`

Single document (`config`) controlling feature availability.

---

## 🔧 New Cloud Functions

### Scheduled Functions

1. **`buildRoutes`** - Runs hourly  
   Creates local delivery routes from pending jobs

2. **`buildLongRoutes`** - Runs daily at midnight  
   Batches packages for regional city-to-city transport

3. **`buildLongHaulRoutes`** - Runs daily at midnight UTC  
   Groups packages by hub pairs for interstate transport

### Callable Functions

4. **`seedHubs`** - Admin only  
   Initializes the hub network with 18 major US cities

---

## 🎨 New UI Components

### `<GlassCard>`

Glassmorphic card component with loading skeleton support.  
**File:** `apps/web/src/components/GlassCard.tsx`

### `<RouteCard>`

Displays route information with accept/view actions.  
**File:** `apps/web/src/components/RouteCard.tsx`

### `<DeliveryTypeSelector>`

Tabbed selector for delivery vs package shipping modes.  
**File:** `apps/web/src/components/DeliveryTypeSelector.tsx`

### `<FeatureFlagToggle>`

Admin component for toggling feature flags.  
**File:** `apps/web/src/components/FeatureFlagToggle.tsx`

### Design Tokens

New CSS variables for consistent styling:

```css
--primary, --secondary, --accent
--success, --warning, --danger
--background, --surface, --border
--text-primary, --text-secondary
--shadow-sm, --shadow-md, --shadow-lg
```

**File:** `apps/web/src/styles/design-tokens.css`

---

## 🪝 New React Hooks

### `useRoutes()`

Fetches and subscribes to routes collection with filtering.  
**File:** `apps/web/src/hooks/useRoutes.ts`

**Options:**

- `status?: RouteStatus` - Filter by route status
- `courierId?: string` - Filter by courier
- `type?: 'local' | 'long' | 'longHaul'` - Filter by route type

### `useFeatureFlags()`

Real-time feature flag subscription from Firestore.  
**File:** `apps/web/src/hooks/useFeatureFlags.ts`

Returns default flags if document doesn't exist.

---

## 📊 Type Definitions Added

### Shared package (`@gosenderr/shared`)

**Route types:**

- `RouteDoc` - Local routes
- `LongRouteDoc` - Regional routes
- `LongHaulRouteDoc` - Interstate routes
- `RouteStatus` - Enum: available, claimed, active, completed, cancelled
- `RouteStop` - Optimized stop with job/package details

**Package types:**

- `PackageDoc` - Complete package shipment
- `PackageJourneyLeg` - Single leg of journey
- `LegType` - pickup, local_transport, hub_transfer, long_haul, delivery
- `ServiceLevel` - standard, express, priority

**Hub types:**

- `HubDoc` - Physical hub location
- `HubData` - Seeding data structure

**Feature flags:**

- `FeatureFlags` - Complete feature flag structure

**File:** `packages/shared/src/types/firestore.ts`

---

## 🔒 Security Updates Needed

### Firestore Rules

**Collections that need rules:**

- `routes` - Couriers can read available, update claimed
- `longRoutes` - Package runners can read/claim
- `longHaulRoutes` - Package runners can read/claim
- `hubs` - Public read, admin write
- `packages` - Customer can read their own, admins all
- `featureFlags` - Public read, admin write

**Current state:** Rules NOT included in PR, need to be added.

### Firebase Auth

**New custom claims needed:**

- `packageRunner: true` - For package runner role

**Implementation:** Admin function to set custom claims

---

## 🚀 Setup Required

### 1. **Deploy Cloud Functions**

```bash
cd /workspaces/gosenderr/firebase/functions
npm install
npm run build
firebase deploy --only functions
```

**Functions to deploy:**

- `buildRoutes` (scheduled hourly)
- `buildLongRoutes` (scheduled daily)
- `buildLongHaulRoutes` (scheduled daily)
- `seedHubs` (callable)

### 2. **Seed Hub Network**

Call the `seedHubs` function as an admin user:

```javascript
// From admin panel or Cloud Console
const seedHubs = firebase.functions().httpsCallable("seedHubs");
await seedHubs();
```

This creates 18 hub documents in the `hubs` collection.

### 3. **Initialize Feature Flags**

Create document: `featureFlags/config`

```javascript
await db
  .collection("featureFlags")
  .doc("config")
  .set({
    marketplace: {
      enabled: true,
      itemListings: true,
      combinedPayments: true,
    },
    delivery: {
      onDemand: true,
      routes: false, // Start disabled
      longRoutes: false, // Start disabled
      longHaul: false, // Start disabled
    },
    courier: {
      rateCards: true,
      equipmentBadges: true,
      workModes: true,
    },
    seller: {
      stripeConnect: true,
      multiplePhotos: true,
      foodListings: true,
    },
    customer: {
      liveTracking: true,
      proofPhotos: true,
      routeDelivery: false, // Start disabled
      packageShipping: false, // Start disabled
    },
    packageRunner: {
      enabled: false, // Start disabled
      onboarding: false,
      routeAcceptance: false,
    },
  });
```

### 4. **Add Firestore Security Rules**

Update `firebase/firestore.rules` with new collections:

```plaintext
// Routes (local)
match /routes/{routeId} {
  allow read: if request.auth != null;
  allow update: if request.auth != null &&
    (request.auth.uid == resource.data.courierId ||
     request.resource.data.status == 'claimed');
}

// Long routes
match /longRoutes/{routeId} {
  allow read: if request.auth != null &&
    request.auth.token.packageRunner == true;
  allow update: if request.auth != null &&
    request.auth.token.packageRunner == true;
}

// Long haul routes
match /longHaulRoutes/{routeId} {
  allow read: if request.auth != null &&
    request.auth.token.packageRunner == true;
  allow update: if request.auth != null &&
    request.auth.token.packageRunner == true;
}

// Hubs
match /hubs/{hubId} {
  allow read: if true;  // Public read
  allow write: if request.auth.token.admin == true;
}

// Packages
match /packages/{packageId} {
  allow read: if request.auth != null &&
    (request.auth.uid == resource.data.customerId ||
     request.auth.uid == resource.data.runnerId ||
     request.auth.token.admin == true);
  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.customerId;
  allow update: if request.auth.token.packageRunner == true ||
    request.auth.token.admin == true;
}

// Feature flags
match /featureFlags/{doc} {
  allow read: if true;  // Public read
  allow write: if request.auth.token.admin == true;
}
```

Then deploy:

```bash
firebase deploy --only firestore:rules
```

### 5. **Environment Variables**

No new environment variables needed. Uses existing:

- `NEXT_PUBLIC_FIREBASE_*` - Already configured
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Already configured

### 6. **Admin Setup**

Create an admin user with custom claims:

```javascript
// Run in Firebase Admin SDK or Cloud Console
await admin.auth().setCustomUserClaims(userId, {
  admin: true,
});
```

### 7. **Test Package Runner Role**

To test package runner features:

```javascript
await admin.auth().setCustomUserClaims(userId, {
  packageRunner: true,
});
```

---

## 🧪 Testing Checklist

### Feature Flags

- [ ] Access `/admin/feature-flags` as admin
- [ ] Toggle `delivery.routes` flag
- [ ] Verify routes UI appears for couriers when enabled
- [ ] Toggle `customer.packageShipping` flag
- [ ] Verify `/ship` page accessible when enabled

### Hub Network

- [ ] Call `seedHubs()` function as admin
- [ ] Verify 18 hubs created in Firestore
- [ ] Check hub locations on map (if UI exists)

### Package Shipping Flow

- [ ] Enable `customer.packageShipping` flag
- [ ] Navigate to `/ship`
- [ ] Enter origin and destination addresses
- [ ] Verify nearest hubs assigned automatically
- [ ] Enter package details
- [ ] Select service level
- [ ] Review pricing breakdown
- [ ] Submit package
- [ ] Verify package document created
- [ ] Check tracking number generated

### Package Tracking

- [ ] Navigate to `/track/package/[trackingNumber]`
- [ ] Verify journey legs displayed
- [ ] Check status badges
- [ ] Test with different package statuses
- [ ] Verify real-time updates

### Courier Routes

- [ ] Enable `delivery.routes` flag
- [ ] Navigate to `/courier/routes` as courier
- [ ] View available routes
- [ ] Accept a route
- [ ] Verify route claimed in Firestore
- [ ] Navigate to active route

### Package Runner Onboarding

- [ ] Enable `packageRunner.enabled` flag
- [ ] Navigate to `/runner/onboarding`
- [ ] Complete vehicle information
- [ ] Select equipment capabilities
- [ ] Choose route preferences
- [ ] Submit onboarding
- [ ] Verify custom claim added

### Package Runner Routes

- [ ] Navigate to `/runner/available-routes`
- [ ] View unclaimed long/longHaul routes
- [ ] Accept a route
- [ ] Verify route claimed

### Cloud Functions (Manual Trigger)

- [ ] Manually trigger `buildRoutes` function
- [ ] Verify local routes created from pending jobs
- [ ] Manually trigger `buildLongRoutes` function
- [ ] Verify long routes created from packages
- [ ] Manually trigger `buildLongHaulRoutes` function
- [ ] Verify long haul routes created with hub batching

---

## ⚠️ Known Issues / TODOs

### 1. **Firestore Rules Missing**

The PR does not include Firestore security rules for new collections. Must be added before merging.

### 2. **Admin Panel Incomplete**

`/admin/feature-flags` page exists but may need:

- Better UI/UX
- Confirmation dialogs
- Audit logging

### 3. **Route Optimization Algorithm**

Current implementation uses basic distance calculation. Consider:

- TSP solver for better stop optimization
- Real traffic data integration
- Time window constraints

### 4. **Hub Assignment Logic**

Currently assigns nearest hub by straight-line distance. Should consider:

- Hub capacity
- Operating hours
- Service coverage areas

### 5. **Package Runner Payments**

No Stripe integration for package runner earnings yet. Needs:

- Payment collection flow
- Earnings tracking
- Payout system

### 6. **Real-time Tracking**

Package tracking page shows static data. Enhancement needed:

- Live location updates for runners
- ETA calculations
- Push notifications

### 7. **Error Handling**

Some pages need better error states:

- Network failures
- Permission denied
- Feature flag disabled states

### 8. **Mobile Responsiveness**

New pages may need mobile optimization:

- `/ship` form layout
- Route cards on small screens
- Package tracking timeline

---

## 🎨 UI/UX Enhancements Needed

### Design Improvements

- Consistent loading states across all new pages
- Empty states for no routes/packages
- Better error messages
- Toast notifications for actions

### Accessibility

- Keyboard navigation
- Screen reader labels
- Focus management
- ARIA attributes

### Performance

- Lazy load route lists
- Infinite scroll for large datasets
- Debounce search inputs
- Optimize Firestore queries with indexes

---

## 📝 Documentation Needed

### User Documentation

- How to ship a package
- Understanding service levels
- Tracking your package
- Becoming a package runner

### Developer Documentation

- Route building algorithm explanation
- Hub network architecture
- Feature flag usage guide
- Testing guide for new features

### API Documentation

- Cloud Functions reference
- Firestore collection schemas
- Custom claims setup

---

## 🔄 Migration Path

### Phase 1: Infrastructure (Week 1)

1. Deploy Cloud Functions
2. Seed hub network
3. Add Firestore rules
4. Initialize feature flags (all disabled)

### Phase 2: Internal Testing (Week 2)

1. Enable `delivery.routes` for test couriers
2. Test local route building
3. Enable `packageRunner.enabled` for test users
4. Test onboarding flow

### Phase 3: Limited Rollout (Week 3-4)

1. Enable `customer.packageShipping` for beta users
2. Monitor package creation and tracking
3. Enable `delivery.longRoutes` in select regions
4. Test regional transport

### Phase 4: Full Rollout (Week 5+)

1. Enable all features for all users
2. Monitor system performance
3. Iterate based on feedback
4. Scale hub network

---

## ✅ Merge Checklist

Before merging PR #11:

- [ ] Add Firestore security rules for all new collections
- [ ] Deploy Cloud Functions to production
- [ ] Seed production hub network
- [ ] Initialize feature flags document (all disabled)
- [ ] Test complete package shipping flow
- [ ] Test courier routes acceptance
- [ ] Test package runner onboarding
- [ ] Verify all TypeScript types compile
- [ ] Run existing test suite (no regressions)
- [ ] Update project README with new features
- [ ] Create admin documentation
- [ ] Set up monitoring/alerts for new Cloud Functions
- [ ] Verify billing limits for scheduled functions

---

## 💰 Cost Implications

### Cloud Functions

- **buildRoutes**: Hourly (720 runs/month)
- **buildLongRoutes**: Daily (30 runs/month)
- **buildLongHaulRoutes**: Daily (30 runs/month)

**Estimated cost**: ~$5-10/month for scheduled functions

### Firestore

New collections will increase:

- Document reads (tracking, route queries)
- Document writes (package updates, route claims)
- Real-time listeners (tracking subscriptions)

**Estimated increase**: +20-30% in Firestore costs

### Recommendations

- Set up budget alerts
- Monitor function execution times
- Optimize Firestore queries
- Consider caching for hub data

---

## 🎓 Learning Resources

### Route Optimization

- Traveling Salesman Problem (TSP) algorithms
- Google OR-Tools for route optimization
- Distance Matrix API best practices

### Hub-and-Spoke Logistics

- FedEx/UPS hub network models
- Amazon logistics architecture
- Last-mile delivery optimization

### Feature Flags Best Practices

- LaunchDarkly patterns
- Gradual rollout strategies
- Kill switch implementation

---

## 📊 Success Metrics

Track these metrics post-merge:

### Operational

- Routes created per day
- Average route distance
- Courier acceptance rate
- Package delivery success rate

### Financial

- Average package revenue
- Courier earnings per route
- Platform fees collected
- Cost per delivery

### User Experience

- Package shipping conversion rate
- Tracking page views
- Average delivery time
- Customer satisfaction scores

---

## 🚦 Recommendation

**Status: ✅ Approve with Conditions**

This is a **well-structured and comprehensive feature** that adds significant value to the platform. The code quality is good and the architecture is sound.

**Conditions before merge:**

1. **Add Firestore security rules** (high priority)
2. **Deploy and test Cloud Functions** in staging
3. **Initialize feature flags** with all features disabled
4. **Add basic error handling** to new pages

**Nice to have (can be follow-up PRs):**

- Mobile optimization
- Better route optimization algorithm
- Real-time tracking enhancements
- Complete admin panel

---

## 📧 Questions for PR Author

1. Have you tested the Cloud Functions locally with Firebase emulator?
2. What's the plan for handling hub capacity limits?
3. Should package runners have background checks?
4. How do we handle package damage/loss insurance?
5. Is there a maximum package size/weight limit?
6. What happens if no hubs exist near an address?
7. How do we handle route cancellations?
8. Should we add webhooks for package status updates?

---

**Reviewed by:** GitHub Copilot  
**Date:** January 21, 2026  
**Branch:** `pr-11` → `main`

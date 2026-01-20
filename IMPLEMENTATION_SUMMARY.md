# GoSenderr Marketplace + Delivery Hybrid Transformation

## Overview

This document outlines the comprehensive transformation of GoSenderr from a simple delivery platform into a full-featured marketplace + delivery hybrid with real-time tracking, dual rate cards, equipment badges, and transparency features.

## ✅ Completed Work

### Phase 1: Core Infrastructure (COMPLETE)

#### 1. Type System (`packages/shared/src/types/firestore.ts`)
- **User Roles:** buyer, seller, courier, admin (with 'customer' backward compatibility)
- **Marketplace Items:** Full schema with food-specific fields (temperature, equipment requirements, pickup instructions)
- **Dual Rate Cards:** Separate PackageRateCard and FoodRateCard with optional fees and peak hours
- **Equipment System:** 7 equipment types (insulated_bag, cooler, hot_bag, drink_carrier, dolly, straps, furniture_blankets)
- **Courier Capabilities:** Auto-calculated from equipment (canDeliverHot, canDeliverCold, etc.)
- **Delivery Jobs:** Full timeline, GPS-verified photos, customer confirmation, pricing breakdown
- **Ratings & Disputes:** Bidirectional ratings with categories, dispute workflow
- **Payment Types:** Platform fees ($2.50 packages, $1.50 food), Stripe integration types

#### 2. Security Rules (`firebase/firestore.rules`)
- **Complete access control** for all 4 user roles
- **Items collection:** Seller-owned, public read for available items
- **DeliveryJobs collection:** Participant-based access (customer/seller/courier/admin)
- **Legacy jobs collection:** Maintained for backward compatibility
- **Ratings collection:** Create-only by rating author
- **Disputes collection:** Reporter and admin access
- **Admin permissions:** Read/update across all collections

#### 3. Status Management
- Added `disputed` status to JobStatus enum
- Updated all status maps, colors, and labels throughout app
- Updated state machine transitions to allow disputes after completion

### Phase 2: High-Priority Features (COMPLETE)

#### 1. Live Trip Status Component 🔴 HIGHEST PRIORITY
**File:** `apps/web/src/components/v2/LiveTripStatus.tsx`

**Features:**
- Real-time delivery status display with dynamic emojis
- ETA calculation and countdown
- Live map integration (Mapbox GL JS)
- Courier info card (name, rating, vehicle details)
- Auto-updating "last seen" timestamp (updates every second)
- Call/message courier action buttons
- Visual delivery progress timeline with 5 stages
- Proof photo display with GPS verification badges
- Photo metadata display (timestamp, GPS accuracy)
- Responsive mobile-first design

**Usage:**
```tsx
<LiveTripStatus
  jobId="job123"
  status="enroute_dropoff"
  pickup={{ lat: 40.7128, lng: -74.006, address: "123 Main St" }}
  dropoff={{ lat: 40.7580, lng: -73.9855, address: "456 Park Ave" }}
  courierInfo={{
    displayName: "Maria Rodriguez",
    averageRating: 4.9,
    vehicleType: "car",
    vehicleDetails: { make: "Honda", model: "Civic", color: "Silver" }
  }}
  courierLocation={{
    lat: 40.7489,
    lng: -73.9680,
    heading: 45,
    speed: 25,
    accuracy: 10,
    updatedAt: Timestamp.now()
  }}
  estimatedArrivalMinutes={12}
  onCallCourier={() => window.location.href = 'tel:+1234567890'}
  onMessageCourier={() => console.log('Open messenger')}
/>
```

#### 2. GPS-Verified Photo Capture 🔴 CRITICAL FOR TRUST
**File:** `apps/web/src/components/v2/GPSPhotoCapture.tsx`

**Features:**
- Real-time GPS location verification using Haversine formula
- Configurable max distance (default 100m radius)
- High-accuracy GPS mode for precise verification
- Photo preview with verification status indicator
- Comprehensive metadata capture (GPS coords, accuracy, timestamp)
- Clear error messages for GPS failures
- Mobile camera integration with `capture="environment"`
- Disabled state support during processing
- Visual feedback for GPS checking/verified/failed states

**Usage:**
```tsx
<GPSPhotoCapture
  expectedLocation={{ lat: 40.7128, lng: -74.006 }}
  maxDistanceMeters={100}
  label="Pickup"
  onPhotoCapture={async (file, metadata) => {
    const url = await uploadToStorage(file);
    await updateJob({ pickupPhoto: { url, metadata } });
  }}
  disabled={false}
/>
```

**GPS Verification Logic:**
1. Get user's current GPS location with high accuracy
2. Calculate distance from expected location using Haversine
3. If distance > maxDistance, reject with error message showing actual distance
4. If verified, capture metadata: { gpsVerified: true, accuracy, timestamp, location }
5. Upload photo with metadata to storage

#### 3. Customer Confirmation Flow 🔴 DISPUTE PROTECTION
**File:** `apps/web/src/components/v2/CustomerConfirmation.tsx`

**Features:**
- Real-time 72-hour countdown timer (updates every minute)
- Two-option UI: "Yes, I received it" or "Report Issue"
- Dispute form with required reason textarea
- Auto-confirmation display with explanation
- Visual states: pending (yellow), confirmed (green), auto-confirmed (gray)
- Clear warnings about consequences of no response
- Prevents submission without dispute reason
- Loading states during API calls

**Usage:**
```tsx
<CustomerConfirmation
  deliveryJobId="job123"
  deliveredAt={Timestamp.now()}
  confirmationDeadline={Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000)}
  onConfirm={async (received, disputeReason) => {
    if (received) {
      await updateJob({ customerConfirmation: { received: true, confirmedAt: Timestamp.now() } });
    } else {
      await createDispute({ jobId, reason: disputeReason });
    }
  }}
  alreadyConfirmed={false}
/>
```

**Confirmation Logic:**
1. Display countdown timer from delivery time to deadline (72 hours)
2. If confirmed within 72 hours: Mark as confirmed, allow disputes
3. If NO confirmation within 72 hours: Auto-confirm, REJECT future disputes
4. Timer updates every minute to show remaining time
5. After deadline, show "Expired" and auto-confirm

## 🔄 Next Steps: Remaining High-Priority Features

### 4. Dual Rate Card System (BUSINESS MODEL)

**Files to Create:**
- `apps/web/src/components/courier/PackageRateCardBuilder.tsx`
- `apps/web/src/components/courier/FoodRateCardBuilder.tsx`
- `apps/web/src/lib/pricing/calculatePlatformFee.ts`

**Requirements:**
- Package card: baseFare ($3+ min), perMile ($0.50+ min), perMinute ($0.10+ min)
- Food card: baseFare ($2.50+ min), perMile ($0.75+ min), restaurantWaitPay ($0.15/min min)
- Peak hours configuration (days, times, multiplier 1.0-2.0)
- Custom optional fees (name + amount pairs)
- Work mode toggles (packages on/off, food on/off)
- Live earnings preview calculator
- Platform fee integration ($2.50 packages, $1.50 food)

**Implementation Pattern:**
```tsx
<PackageRateCardBuilder
  currentRateCard={courier.packageRateCard}
  onSave={async (rateCard) => {
    await updateCourierProfile({ packageRateCard: rateCard });
  }}
/>
```

### 5. Equipment Badge System (DIFFERENTIATOR)

**Files to Create:**
- `apps/web/src/components/courier/EquipmentUploadForm.tsx`
- `apps/web/src/components/admin/EquipmentReviewDashboard.tsx`
- `apps/web/src/components/shared/EquipmentBadges.tsx`
- `apps/web/src/lib/equipment/calculateCapabilities.ts`

**Requirements:**
- Photo upload for each equipment type
- Admin review interface (approve/reject with notes)
- Badge display on courier profiles (🧊 Cooler, 🔥 Hot Bag, etc.)
- Auto-calculate capabilities from approved equipment
- Customer filtering by required equipment
- Equipment status: pending/approved/rejected

**Capability Auto-Calculation:**
```typescript
function calculateCapabilities(equipment: CourierEquipment): CourierCapabilities {
  return {
    canDeliverHot: equipment.hot_bag.approved || equipment.insulated_bag.approved,
    canDeliverCold: equipment.cooler.approved,
    canDeliverFrozen: equipment.cooler.approved,
    canDeliverDrinks: equipment.drink_carrier.approved,
    canDeliverHeavy: equipment.dolly.approved,
    canDeliverFurniture: equipment.dolly.approved && 
                         equipment.straps.approved && 
                         equipment.furniture_blankets.approved,
  };
}
```

## 📦 Medium Priority Features

### 6. Marketplace Listings
- Item CRUD with food-specific fields
- Browse/search with filters (category, price, location)
- Photo upload (max 10 photos)
- Seller dashboard

### 7. Rating & Review System
- Bidirectional ratings (customer ↔ courier)
- Star rating (1-5) + optional review text
- Categories: professionalism, timeliness, communication, care
- Enforcement: Suspend couriers with <3.5 rating
- Admin review for suspensions

### 8. Food Delivery Specifics
- Auto-cancel Cloud Function (60-min limit, 75-min if picked up)
- Restaurant wait time tracking
- Peak hour multiplier calculations
- Equipment requirement validation

## 🏗️ Technical Architecture

### Type System Organization

```
@gosenderr/shared (packages/shared)
├── User types (roles, courier profile, equipment)
├── Item types (marketplace, food details)
├── Job types (delivery, timeline, confirmation)
├── Rating types
└── Dispute types

@gosenderr/web (apps/web)
├── Re-exports shared types
├── Web-specific types (Job with ID, etc.)
└── Backward compatibility layer
```

### Security Model

```
users/{uid}
  - Self read/write
  - Online couriers: public read
  - Admins: full read

items/{itemId}
  - Public read (all signed-in users)
  - Seller: full control
  - Admin: full access

deliveryJobs/{jobId}
  - Participants: read/write (customer, seller, courier)
  - Admin: full access
  - Dispute: customer can update after completion

ratings/{ratingId}
  - Public read
  - Author: create only
  - No updates/deletes

disputes/{disputeId}
  - Reporter + reported: read
  - Admin: read/write
```

### Component Patterns

All new components follow these patterns:
1. **Props interface** with clear types
2. **useState** for local UI state
3. **useEffect** for timers and real-time updates
4. **Async handlers** with loading states
5. **Error handling** with user-friendly messages
6. **Responsive design** with mobile-first approach
7. **Accessibility** with semantic HTML
8. **Type safety** throughout

## 📱 Mobile Considerations

All components are designed mobile-first:
- Touch-friendly button sizes (minimum 44px)
- Responsive layouts with flexible containers
- Mobile camera integration for photos
- Optimized image sizes
- GPS access for location verification
- Readable font sizes (14px+ body, 16px+ buttons)

## 🔒 Security Features

1. **GPS Verification:** Photos must be within 100m radius
2. **Metadata Audit Trail:** All photos include GPS, accuracy, timestamp
3. **72-Hour Window:** Strict confirmation deadline prevents late disputes
4. **Role-Based Access:** Firestore rules enforce participant access
5. **Admin Oversight:** All disputes and equipment reviews require admin action

## 🎯 Success Metrics

When fully implemented, the platform will provide:

1. **Transparency:** Customers see live courier location, proof photos, exact timing
2. **Trust:** GPS-verified photos prevent fraud, 72-hour window prevents abuse
3. **Flexibility:** Couriers set own rates with dual card system
4. **Quality:** Equipment badges signal professionalism, ratings enforce standards
5. **Revenue:** Platform fees ($1.50-$2.50 per delivery) on 100% of transactions

## 🚀 Getting Started

### For Developers

1. **Review types:** Start with `packages/shared/src/types/firestore.ts`
2. **Review components:** Check `apps/web/src/components/v2/` for examples
3. **Run type check:** `pnpm -C apps/web type-check`
4. **Review security rules:** `firebase/firestore.rules`

### For Product/Design

1. **Review Live Trip Status:** See `LiveTripStatus.tsx` for delivery tracking UI
2. **Review GPS Photos:** See `GPSPhotoCapture.tsx` for photo verification flow
3. **Review Confirmation:** See `CustomerConfirmation.tsx` for dispute prevention
4. **Next:** Design dual rate card builder and equipment badge system

## 📚 Additional Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **Mapbox GL JS:** https://docs.mapbox.com/mapbox-gl-js/
- **Haversine Formula:** https://en.wikipedia.org/wiki/Haversine_formula
- **Geolocation API:** https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

## 💡 Notes

- All components pass TypeScript type checking
- Backward compatibility maintained with existing 'customer' role
- Legacy 'jobs' collection still supported
- Build requires Firebase API keys (not provided in repo)
- Security rules deployed separately from code

---

**Status:** Foundation + 3 highest priority features complete  
**Next:** Implement dual rate card builder and equipment badge system  
**Build:** Type checking passes ✅

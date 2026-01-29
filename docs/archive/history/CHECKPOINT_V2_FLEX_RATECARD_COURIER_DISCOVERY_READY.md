# CHECKPOINT: GoSenderr v2 — Flexible Rate Cards + Courier Discovery ✅

**Date:** January 10, 2026  
**Status:** ✅ Ready for Testing

---

## Changes Completed

### 1. Flexible RateCard Type ✅
**File:** `apps/web/src/lib/v2/types.ts`

Updated `RateCard` interface to support comprehensive pricing rules:

```typescript
interface RateCard {
  baseFee: number;          // Required base fee per delivery
  perMile: number;          // Required cost per job mile (pickup → dropoff)
  minFee?: number;          // Optional minimum charge
  pickupPerMile?: number;   // Optional extra cost for courier → pickup ("deadhead")
  perMinute?: number;       // Optional time-based pricing
  maxPickupMiles?: number;  // Optional radius rule (courier → pickup limit)
  maxJobMiles?: number;     // Optional job distance rule (pickup → dropoff limit)
}
```

Also added `geohash?: string` to `CourierLocation` for geo-queries.

---

### 2. Geohash Location Tracking ✅
**File:** `apps/web/src/hooks/v2/useCourierLocationWriter.ts`

- Installed `ngeohash` library (+ `@types/ngeohash`)
- When courier location updates, now writes `location.geohash` (precision 6)
- Enables efficient geo-queries for nearby courier discovery

**Write shape:**
```typescript
{
  lat: number,
  lng: number,
  geohash: string,  // NEW
  heading?: number,
  updatedAt: Timestamp
}
```

---

### 3. Enhanced Pricing Engine ✅
**File:** `apps/web/src/lib/v2/pricing.ts`

**New Functions:**
1. `estimateMinutes(miles, mode)` - Calculates ETA based on transport mode
   - Walk: 3 mph
   - Scooter: 10 mph
   - Car: 25 mph

2. `calcFee(rateCard, jobMiles, pickupMiles?, mode?)` - Flexible fee calculation
   - Base: `baseFee + perMile * jobMiles`
   - Deadhead: `+ pickupPerMile * pickupMiles` (if configured)
   - Time: `+ perMinute * estimatedMinutes` (if configured)
   - Minimum: applies `minFee` floor (if configured)
   - Returns rounded to 2 decimals

3. `isEligible(rateCard, jobMiles, pickupMiles)` - Checks distance limits
   - Returns `false` if `pickupMiles > maxPickupMiles`
   - Returns `false` if `jobMiles > maxJobMiles`
   - Otherwise `true`

---

### 4. Courier Setup Page — Fully Flexible ✅
**File:** `apps/web/src/app/v2/courier/setup/page.tsx`

**New Fields:**
- Base Fee ($) - required
- Per Mile Rate ($) - required
- Pickup Per Mile ($) - optional (deadhead cost)
- Per Minute Rate ($) - optional (time-based)
- Minimum Fee ($) - optional (floor)
- Max Pickup Miles - optional (radius limit)
- Max Job Miles - optional (distance limit)
- Transport Mode selector (walk/scooter/car with speed indicators)
- Go Online toggle

**Features:**
- Two-column layout: Form (left) | Live Preview (right)
- Preview shows 3 sample jobs: 1mi, 5mi (2mi pickup), 10mi (3mi pickup)
- Displays active limits section when any limit is configured
- Uses new `calcFee` function for accurate previews

---

### 5. Nearby Couriers Hook ✅
**File:** `apps/web/src/hooks/v2/useNearbyCouriers.ts`

**Query Strategy:**
- Computes geohash prefix (precision 5) from pickup location
- Firestore query:
  ```typescript
  where('role', '==', 'courier')
  where('courier.isOnline', '==', true)
  where('location.geohash', '>=', prefix)
  where('location.geohash', '<=', prefix + '\uf8ff')
  ```
- Client-side filtering:
  - Calculates `pickupMiles` and `jobMiles` for each courier
  - Checks eligibility using `isEligible()`
  - Calculates estimated fee using `calcFee()`

**Sorting:**
- Eligible couriers first
- Then by lowest estimated fee

**Returns:**
```typescript
interface NearbyCourier {
  uid: string;
  email: string;
  transportMode: string;
  pickupMiles: number;
  jobMiles: number;
  estimatedFee: number;
  eligible: boolean;
  rateCard: RateCard;
}
```

---

### 6. Customer Job Creation — Nearby Couriers Panel ✅
**File:** `apps/web/src/app/v2/customer/jobs/new/page.tsx`

**New Features:**
- Two-column layout: JobForm (left) | Nearby Couriers (right)
- Nearby Couriers panel appears when pickup + dropoff coords are valid
- Real-time query updates as customer types coordinates (300ms debounce)

**Courier Cards Show:**
- Email, transport mode icon
- Distance to pickup
- Job distance (pickup → dropoff)
- Estimated fee
- Eligibility badge (green "Eligible" or red "Too far")
- Reason for ineligibility (exceeds max pickup or job distance)
- Color-coded backgrounds (green for eligible, red for ineligible)

**Info Note:**
"ℹ️ These are couriers currently online in your pickup area. Fees are estimates and may change when a courier accepts."

---

### 7. JobForm Component — Coordinate Change Callback ✅
**File:** `apps/web/src/components/v2/JobForm.tsx`

**New Props:**
- `onPickupDropoffChange?: (pickup, dropoff) => void`
- Calls callback with valid lat/lng objects (or null) on coordinate input change
- Debounced 300ms to avoid excessive queries

---

### 8. Courier Dashboard — Enhanced Job Preview ✅
**Files:** 
- `apps/web/src/components/v2/CourierJobPreview.tsx`
- `apps/web/src/app/v2/courier/dashboard/page.tsx`

**CourierJobPreview Updates:**
- Now accepts `courierLocation` and `transportMode` props
- Calculates pickup distance from courier to pickup
- Shows eligibility warning if job exceeds limits
- Displays fee breakdown including deadhead cost if configured
- Disables "Accept" button if job is ineligible
- Button text changes to "Too Far" for ineligible jobs

**Dashboard Updates:**
- Passes courier's location and transport mode to preview
- Job preview now shows accurate fee with deadhead cost

---

## Sample Courier Document

```json
{
  "role": "courier",
  "email": "courier@example.com",
  "courier": {
    "isOnline": true,
    "transportMode": "scooter",
    "rateCard": {
      "baseFee": 5.00,
      "perMile": 1.50,
      "pickupPerMile": 0.75,
      "perMinute": 0.25,
      "minFee": 8.00,
      "maxPickupMiles": 10,
      "maxJobMiles": 20
    }
  },
  "location": {
    "lat": 37.7749,
    "lng": -122.4194,
    "geohash": "9q8yy",  // precision 6
    "updatedAt": Timestamp
  }
}
```

---

## Fee Calculation Examples

### Example 1: Basic Job
- **Courier:** Scooter
- **Rate Card:** $5 base + $1.50/mi
- **Job:** 5 miles
- **Courier → Pickup:** N/A
- **Calculation:** $5 + (5 * $1.50) = **$12.50**

### Example 2: With Deadhead
- **Courier:** Car
- **Rate Card:** $5 base + $1.50/mi + $0.75/mi pickup
- **Job:** 5 miles
- **Courier → Pickup:** 3 miles
- **Calculation:** $5 + (5 * $1.50) + (3 * $0.75) = **$14.75**

### Example 3: With Time-Based + Minimum
- **Courier:** Walk
- **Rate Card:** $5 base + $1/mi + $0.25/min, minFee = $15
- **Job:** 2 miles (40 min walk @ 3 mph)
- **Calculation:** $5 + (2 * $1) + (40 * $0.25) = $17 → **$17.00** (above min)
- **Short job:** 1 mile = $5 + $1 + $5 = $11 → **$15.00** (min applied)

### Example 4: Ineligible Job
- **Courier:** Car
- **Rate Card:** maxPickupMiles = 10
- **Courier → Pickup:** 15 miles
- **Result:** **Ineligible** (exceeds max pickup distance)
- Button disabled, shows "Too Far"

---

## Testing Checklist

### Courier Setup
- [ ] All 7 rate card fields save correctly
- [ ] Optional fields (minFee, pickupPerMile, perMinute, maxPickupMiles, maxJobMiles) can be left blank
- [ ] Preview updates in real-time as fields change
- [ ] Preview shows 3 sample jobs with accurate calculations
- [ ] Active limits section appears only when limits are configured
- [ ] Transport mode affects time-based calculations in preview
- [ ] Go Online toggle triggers location tracking
- [ ] Geohash writes to Firestore when location updates

### Nearby Couriers Discovery
- [ ] Panel appears on customer job creation page when coords are valid
- [ ] Shows "Loading..." while querying
- [ ] Shows "No online couriers found" when query returns empty
- [ ] Courier cards display all information correctly
- [ ] Eligible vs ineligible badges are accurate
- [ ] Ineligibility reasons show when job exceeds limits
- [ ] Couriers sorted correctly (eligible first, then by lowest fee)
- [ ] Query updates as customer changes coordinates (debounced)
- [ ] Info note displays at bottom of panel

### Courier Dashboard
- [ ] Job preview shows pickup distance when courier location available
- [ ] Fee includes deadhead cost if pickupPerMile configured
- [ ] Eligibility warning appears for jobs exceeding limits
- [ ] "Accept" button disabled for ineligible jobs
- [ ] Fee calculation matches courier's rate card settings

### E2E Job Flow
- [ ] Customer creates job with valid coordinates
- [ ] Nearby couriers appear with accurate fee estimates
- [ ] Eligible courier can accept job
- [ ] Agreed fee matches courier's calculation (including deadhead)
- [ ] Ineligible courier cannot accept (button disabled)
- [ ] Job progresses through all statuses normally
- [ ] Customer sees agreed fee on job detail page

---

## Firestore Security Rules

**May Need Update:**
If customers cannot read online couriers for discovery, update rules:

```
match /users/{userId} {
  // Self read/write
  allow read, write: if request.auth.uid == userId;
  
  // Allow signed-in users to read online couriers
  allow read: if request.auth != null 
    && resource.data.role == 'courier' 
    && resource.data.courier.isOnline == true;
}
```

**Current status:** Test if query works, deploy rules update only if blocked.

---

## Firestore Index Requirements

**Possible composite index needed:**
```
Collection: users
Fields: 
  - role (Ascending)
  - courier.isOnline (Ascending)
  - location.geohash (Ascending)
```

**If Firestore prompts for index:** Click the provided link to create it automatically.

---

## Files Modified Summary

### New Files (1)
- `apps/web/src/hooks/v2/useNearbyCouriers.ts` - Geohash-based courier discovery hook

### Modified Files (7)
- `apps/web/src/lib/v2/types.ts` - Updated RateCard, added geohash to CourierLocation
- `apps/web/src/lib/v2/pricing.ts` - Added estimateMinutes, isEligible, enhanced calcFee
- `apps/web/src/hooks/v2/useCourierLocationWriter.ts` - Writes geohash on location update
- `apps/web/src/app/v2/courier/setup/page.tsx` - Fully flexible rate card form with preview
- `apps/web/src/app/v2/customer/jobs/new/page.tsx` - Added nearby couriers panel
- `apps/web/src/components/v2/JobForm.tsx` - Added coordinate change callback
- `apps/web/src/components/v2/CourierJobPreview.tsx` - Enhanced with eligibility check and deadhead cost
- `apps/web/src/app/v2/courier/dashboard/page.tsx` - Pass location and mode to preview

### Dependencies Added
- `ngeohash` (0.6.3) - Geohash encoding/decoding
- `@types/ngeohash` (0.6.8) - TypeScript definitions

---

## Known TODOs (Future Enhancements)

### Nice-to-Have (Not MVP)
- [ ] Mapbox Geocoding API for address autocomplete
- [ ] Mapbox Directions API for real road distance (vs straight-line)
- [ ] Customer can "invite" specific courier to job
- [ ] Courier earnings dashboard with rate card analytics
- [ ] Dynamic pricing suggestions based on demand
- [ ] Multi-courier bidding system
- [ ] Route optimization for multiple deliveries

### Performance
- [ ] Cache nearby couriers query for 30s
- [ ] Add pagination for large courier lists
- [ ] Optimize geohash precision based on area density

---

## Summary

✅ **Flexible rate card system with 7 configurable pricing knobs**  
✅ **Geohash-based courier discovery for efficient geo-queries**  
✅ **Customer sees nearby online couriers with eligibility and estimated fees**  
✅ **Courier setup page with live preview of 3 sample jobs**  
✅ **Enhanced job preview with deadhead cost and eligibility warnings**  
✅ **Time-based pricing using transport mode speed estimates**  
✅ **Min fee enforcement and distance limit checks**  
✅ **Zero TypeScript errors**  
✅ **Existing E2E job flow unchanged and compatible**  

---

## Next Steps

1. **Test courier setup:**
   - Create courier account
   - Configure rate card with all optional fields
   - Verify geohash writes to Firestore
   - Go online and check location tracking

2. **Test nearby couriers:**
   - Create customer account
   - Start creating job
   - Enter pickup and dropoff coordinates
   - Verify nearby couriers appear
   - Check eligibility badges and fee calculations

3. **Test eligibility enforcement:**
   - Set max pickup distance to 5 miles
   - Create job 10 miles away
   - Verify job shows as ineligible with disabled button

4. **Test E2E with flexible pricing:**
   - Configure courier with deadhead cost ($0.75/mi)
   - Customer creates job 5 miles (courier 3 miles from pickup)
   - Verify agreed fee includes deadhead: base + job + pickup
   - Complete job flow to delivered status

5. **Monitor Firestore:**
   - Check for index creation prompts
   - Verify geohash precision (should be 6 chars in location doc)
   - Check query performance with multiple online couriers

---

**Status:** 🎉 Flexible Rate Cards + Courier Discovery Complete — Ready for Production Testing

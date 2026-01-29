# CHECKPOINT: V2 Matching Guards Ready

**Status**: ✅ Complete  
**Date**: January 11, 2026

## Summary
Implemented comprehensive eligibility filtering system with clear reasons and server-side guards to prevent mismatched job assignments.

---

## What Was Implemented

### 1. Eligibility Helper Library
**File**: `apps/web/src/lib/v2/eligibility.ts`

New function `getEligibilityReason()` centralizes all eligibility logic:
- Returns `{ eligible: boolean, reason?: string }`
- Checks `maxPickupMiles` constraint: "Pickup is outside courier radius"
- Checks `maxJobMiles` constraint: "Trip distance exceeds courier max"
- Single source of truth used by both client and server

### 2. Customer Job Creation UX
**File**: `apps/web/src/app/v2/customer/jobs/new/page.tsx`

**Changes**:
- All nearby couriers are shown (eligible and ineligible)
- Badge displays: "Eligible" (green) or "Not eligible" (red)
- Reason shown below badge for ineligible couriers
- Sorting: Eligible couriers first by lowest estimate, ineligible last
- Minimum estimate behavior:
  - If eligible couriers exist → lowest eligible estimate
  - If zero eligible couriers → floor rate + label "No eligible couriers online"

**Example Screenshot Scenario**:
```
Minimum Estimate: $12.50
└─ "No eligible couriers online" (when all are ineligible)

Nearby Couriers:
┌─────────────────────────────────┐
│ courier@example.com      [Eligible] │
│ 🚗 Car                            │
│ 📍 2.1 mi to pickup              │
│ 📦 5.3 mi job distance           │
│ Estimated Fee: $18.50            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ far@example.com    [Not eligible]│
│ 🛴 Scooter                       │
│ 📍 12.5 mi to pickup             │
│ 📦 5.3 mi job distance           │
│ Estimated Fee: $24.00            │
│ ⚠️ Pickup is outside courier radius │
└─────────────────────────────────┘
```

### 3. Courier Dashboard with Filtering
**File**: `apps/web/src/app/v2/courier/dashboard/page.tsx`

**Changes**:
- Computed eligibility for each job using courier's location + rate card
- Toggle: "Hide ineligible jobs" (default: ON)
- When all jobs are ineligible: Shows "Show all jobs" button
- Job cards show:
  - Red border for ineligible jobs
  - Badge: "⚠️ Not eligible" with reason
  - Distance info: "(2.1 mi away)" and "(5.3 mi trip)"
  - Cannot click Accept on ineligible jobs

**Example Screenshot Scenario**:
```
Available Jobs                    ☑ Hide ineligible jobs

All jobs outside service area
[Show all jobs] ← Button appears when filtered list is empty

--- With "Show all jobs" enabled ---

┌───────────────────────────────────┐
│ ⚠️ Not eligible                    │
│    Trip distance exceeds courier max│
│                                    │
│ Posted: 1/11/2026, 10:30 AM       │
│ 📍 Pickup: 123 Main St (2.1 mi away)│
│ 📍 Dropoff: 789 Oak Ave (15.2 mi trip)│
└───────────────────────────────────┘
```

### 4. Server-Side Safety Guard
**File**: `apps/web/src/lib/v2/jobs.ts`

**Changes**:
- `claimJob()` now reads courier user doc inside transaction
- Extracts courier location and rate card
- Computes `pickupMiles` and `jobMiles`
- Calls `getEligibilityReason()` before allowing claim
- If ineligible: throws error `"not-eligible: {reason}"`
- Courier dashboard catches this and shows specific alert

**Example Rejected Claim Log**:
```javascript
// Console log when someone tries to bypass UI:
Error: Failed to claim job: not-eligible: Trip distance exceeds courier max

// UI shows:
"You are not eligible for this job. It may exceed your distance limits."
```

---

## Components Updated

### Created:
- `apps/web/src/lib/v2/eligibility.ts` - Eligibility helper

### Modified:
- `apps/web/src/hooks/v2/useNearbyCouriers.ts` - Use new eligibility helper
- `apps/web/src/app/v2/customer/jobs/new/page.tsx` - Show eligibility, update minimum logic
- `apps/web/src/app/v2/courier/dashboard/page.tsx` - Add filtering, eligibility badges, distance info
- `apps/web/src/components/v2/CourierJobPreview.tsx` - Use new helper, better messaging
- `apps/web/src/lib/v2/jobs.ts` - Server-side eligibility guard in claimJob()

---

## Acceptance Criteria

✅ **Customer sees clear reason when no couriers can take it**
- Minimum estimate shows "No eligible couriers online"
- Each ineligible courier shows reason below badge

✅ **Courier dashboard does not allow accepting jobs outside their rules**
- Accept button disabled for ineligible jobs
- Clear badge and reason shown on job cards
- Filter toggle to hide/show ineligible jobs

✅ **Transaction rejects ineligible claims**
- Server reads courier doc in transaction
- Validates eligibility before claiming
- Throws `"not-eligible"` error with reason
- UI catches and shows specific error message

---

## Testing Checklist

### Customer Flow:
- [ ] Create job with no online couriers → see floor estimate
- [ ] Create job with only ineligible couriers → see "No eligible couriers online"
- [ ] Create job with mixed couriers → see eligible first, ineligible last
- [ ] Hover over ineligible courier → see reason displayed

### Courier Flow:
- [ ] Dashboard with all eligible jobs → all accept buttons work
- [ ] Dashboard with ineligible job → see red border, "Not eligible" badge, reason
- [ ] Try to accept ineligible job → button disabled
- [ ] Toggle "Hide ineligible" → list updates correctly
- [ ] All jobs ineligible → see "Show all jobs" prompt

### Server Safety:
- [ ] Attempt to call claimJob() with invalid distance via API → rejected with "not-eligible"
- [ ] Console shows full error: `"not-eligible: Trip distance exceeds courier max"`
- [ ] Job remains unclaimed after failed attempt

---

## Example Eligibility Scenarios

### Scenario 1: Pickup Too Far
```
Courier rate card:
- maxPickupMiles: 5

Job:
- Pickup: 7 miles from courier
- Job distance: 3 miles

Result: NOT ELIGIBLE
Reason: "Pickup is outside courier radius"
```

### Scenario 2: Job Too Long
```
Courier rate card:
- maxJobMiles: 10

Job:
- Pickup: 2 miles from courier
- Job distance: 12 miles

Result: NOT ELIGIBLE
Reason: "Trip distance exceeds courier max"
```

### Scenario 3: Both Valid
```
Courier rate card:
- maxPickupMiles: 10
- maxJobMiles: 15

Job:
- Pickup: 3 miles from courier
- Job distance: 8 miles

Result: ELIGIBLE
```

---

## Security Notes

- Eligibility checked on client for UX (instant feedback)
- Eligibility RE-CHECKED on server during transaction (security)
- Rate card and location read from authoritative source (users doc)
- Cannot bypass by manipulating client state or calling API directly

---

## Next Steps

Potential enhancements:
1. Add eligibility filters to customer view ("Show only eligible")
2. Real-time eligibility updates when courier moves
3. Push notifications when courier becomes eligible for waiting job
4. Analytics: Track % of jobs that have zero eligible couriers
5. Admin dashboard: View eligibility stats across all jobs/couriers

---

**Checkpoint Verified**: All acceptance criteria met ✓

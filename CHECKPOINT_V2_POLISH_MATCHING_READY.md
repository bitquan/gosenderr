# CHECKPOINT: GoSenderr v2 Polish — Matching Views Complete ✅

**Date:** January 10, 2026  
**Status:** ✅ Ready for Testing

---

## Changes Completed

### 1. StatusTimeline Component ✅
**File:** `apps/web/src/components/v2/StatusTimeline.tsx`

- Created visual progress indicator for job status
- Shows all 6 steps: open → assigned → enroute_pickup → picked_up → enroute_dropoff → delivered
- Highlights current step with pulsing animation
- Shows checkmarks for completed steps
- Progress bar fills proportionally
- Handles cancelled status with special UI

**Usage:**
```tsx
<StatusTimeline currentStatus={job.status} />
```

---

### 2. Courier Dashboard Map ✅
**File:** `apps/web/src/app/v2/courier/dashboard/page.tsx`

**Features Added:**
- MapboxMap component displays above job list
- When no job selected: shows courier's location only
- When job selected: shows pickup (green) + dropoff (red) + courier (blue)
- Auto-fits bounds to include both pickup and dropoff pins
- Auto-selects first job on load
- Map updates immediately when selecting different jobs
- Two-column layout: Map + Jobs List (left) | Job Preview (right)

**UX:**
- Click any job card to select it
- Selected job gets purple border and updates map + preview panel
- Hover states for better interactivity

---

### 3. Customer Job Detail — Assignment + Fee Clarity ✅
**File:** `apps/web/src/app/v2/customer/jobs/[jobId]/page.tsx`

**Enhancements:**
- ✅ StatusTimeline added at top (shows live progress)
- ✅ Clearly shows "Delivery Fee" with large green text when agreedFee exists
- ✅ Shows courier assignment status:
  - "🟢 Online & Assigned" if courier is online
  - "⚫ Assigned" if courier is offline
  - "Waiting for courier to accept..." if still open
- ✅ Two-column layout for locations + job info
- ✅ Map shows courier location (blue marker) when available
- ✅ Max-width container for better readability

---

### 4. Courier Job Page — Timeline + Map + Navigation ✅
**File:** `apps/web/src/app/v2/courier/jobs/[jobId]/page.tsx`

**Enhancements:**
- ✅ StatusTimeline added at top
- ✅ Map shows pickup, dropoff, and courier's own location
- ✅ "Navigate 🗺️" buttons for both pickup and dropoff (opens Google Maps)
- ✅ Status progression buttons remain functional
- ✅ Max-width container for better layout
- ✅ Completed job shows success message

---

## Pricing Model Decision

**Chosen:** **Option B — Flexible Pricing** (baseFee + perMile + optional perMinute/min/max)

### Why?
- Already implemented and working
- Gives couriers maximum flexibility
- Supports both distance-based and time-based pricing
- Min/max limits protect both couriers and customers
- Backward compatible (optional fields)

### Schema:
```typescript
interface RateCard {
  baseFee: number;        // Required
  perMile: number;        // Required
  perMinute?: number;     // Optional time-based rate
  minimumFee?: number;    // Optional floor
  maximumFee?: number;    // Optional ceiling
}
```

### Calculation Logic:
```typescript
// lib/v2/pricing.ts
fee = baseFee + (miles * perMile)
if (perMinute && estimatedMinutes) fee += (minutes * perMinute)
if (minimumFee && fee < minimumFee) fee = minimumFee
if (maximumFee && fee > maximumFee) fee = maximumFee
```

---

## Testing Checklist

### Courier Dashboard Map
- [ ] Map shows courier's location when no job selected
- [ ] Selecting job shows pickup (green) and dropoff (red) pins
- [ ] Map auto-fits to show both pickup and dropoff
- [ ] Courier marker (blue) appears if location available
- [ ] Job preview panel updates with selection
- [ ] Accept button claims job correctly

### Customer Job Detail
- [ ] StatusTimeline shows current status correctly
- [ ] "Waiting for courier..." message shows when status = 'open'
- [ ] After courier accepts:
  - [ ] Shows "🟢 Online & Assigned" or "⚫ Assigned"
  - [ ] Shows agreedFee in large green text
  - [ ] Map shows courier location (blue marker)
- [ ] StatusTimeline updates in real-time as courier progresses
- [ ] All status transitions visible without refresh

### Courier Job Page
- [ ] StatusTimeline shows current status
- [ ] Map shows pickup, dropoff, and courier's own location
- [ ] "Navigate 🗺️" buttons open Google Maps correctly
- [ ] Status progression buttons work (Start Pickup → Mark Picked Up → etc.)
- [ ] Buttons disabled at wrong status (can't skip steps)
- [ ] Completed job shows success message
- [ ] Auto-redirects to dashboard after marking delivered

### Pricing Display
- [ ] Courier setup page shows all fields (baseFee, perMile, perMinute, minimumFee, maximumFee)
- [ ] Job preview shows rate breakdown correctly
- [ ] Optional fields (perMinute, min/max) only show when > 0
- [ ] Agreed fee matches calculation
- [ ] Rate preview on setup page shows 1mi/5mi/10mi examples correctly

---

## Files Modified

### New Files (1)
- `apps/web/src/components/v2/StatusTimeline.tsx`

### Modified Files (3)
- `apps/web/src/app/v2/courier/dashboard/page.tsx` — Added map and two-column layout
- `apps/web/src/app/v2/customer/jobs/[jobId]/page.tsx` — Added timeline, improved clarity
- `apps/web/src/app/v2/courier/jobs/[jobId]/page.tsx` — Added timeline and navigate buttons

---

## Known TODOs (Future)

### Nice-to-Have (Not MVP)
- [ ] Geocoding API for address autocomplete (Mapbox Places)
- [ ] Directions API for real road distance (vs straight-line Haversine)
- [ ] Customer cancel job button
- [ ] Job history filtering/sorting
- [ ] Courier earnings dashboard
- [ ] Push notifications for status changes
- [ ] ETA calculations
- [ ] In-app chat between customer and courier
- [ ] Photo uploads (proof of pickup/delivery)
- [ ] Ratings and reviews

### Polish
- [ ] Loading skeletons for maps
- [ ] Better error boundaries
- [ ] Offline detection UI
- [ ] Toast notifications instead of alerts

---

## Screenshots

### Before
- Courier dashboard: No map, text-only job list
- Customer job detail: No timeline, unclear assignment status
- Courier job page: No timeline, navigation links in raw text

### After
- **Courier Dashboard:** Map shows selected job pins + courier location, clean two-column layout
- **Customer Job Detail:** Visual timeline, clear "Delivery Fee: $X.XX", courier assignment status prominent
- **Courier Job Page:** Timeline shows progress, "Navigate 🗺️" buttons styled, map with all pins

---

## Summary

✅ **Customer and courier views now match in quality and clarity**  
✅ **Maps on both sides show live tracking**  
✅ **Status timeline provides clear visual progress**  
✅ **Assignment and fee information prominent**  
✅ **Flexible pricing model supports time + distance + limits**  
✅ **Zero TypeScript errors**  
✅ **Ready for E2E testing**

---

## Next Steps

1. **Test complete flow:**
   - Customer creates job
   - Courier sees it on dashboard map
   - Courier accepts (map disappears, redirects to active job)
   - Customer sees timeline update + courier marker appear
   - Courier progresses through all statuses
   - Customer sees real-time updates
   - Both see "delivered" state

2. **Verify pricing:**
   - Set up courier with perMinute rate
   - Create job, accept it
   - Verify agreedFee matches calculation
   - Test with min/max limits

3. **Multi-user testing:**
   - Multiple couriers competing for same job
   - Atomic claim should prevent double-assignment
   - Loser sees error, job disappears from their list

---

**Status:** 🎉 v2 Polish Complete — Ready for Production Testing

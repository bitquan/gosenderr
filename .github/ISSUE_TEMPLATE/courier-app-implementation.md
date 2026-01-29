# 🚗 Courier App Enhancement - Implementation Plan

## Overview

Refine and complete the existing courier app with map-based dashboard, navigation features, and delivery workflow. The app already has a strong foundation with map shell, bottom nav, and core features - we just need to polish and fix remaining issues.

**Timeline:** 2-3 days  
**Priority:** High  
**Status:** 🔄 In Progress (80% Complete)  
**Labels:** `feature`, `courier`, `mobile`, `maps`

---

## ✅ Already Complete (80%)

### Core Infrastructure ✅
- ✅ **Map Shell Dashboard** - Full-screen Mapbox map with overlay UI
- ✅ **Bottom Navigation** - 4-tab nav (Dashboard, Active, Earnings, Settings)
- ✅ **Job Thumbnails** - Floating markers on map for available jobs
- ✅ **Swipeable Bottom Sheet** - Job list with drag-to-expand
- ✅ **Location Tracking** - Real-time GPS with permission handling
- ✅ **Route Visualization** - Turn-by-turn directions with polylines
- ✅ **Job Cards** - Rich job cards with pickup/dropoff details

### Pages (95% Complete) ✅
- ✅ `/dashboard` - Map shell with jobs (**needs minor fixes**)
- ✅ `/jobs` (routes page) - Available routes/jobs list
- ✅ `/jobs/:id` - Job detail page
- ✅ `/routes` - Routes management
- ✅ `/active-route` - Active delivery interface with navigation
- ✅ `/navigation/active` - Full-screen navigation view
- ✅ `/earnings` - Earnings dashboard
- ✅ `/rate-cards` - Rate card configuration
- ✅ `/equipment` - Equipment submission
- ✅ `/settings` - Profile and settings
- ✅ `/support` - Support and help
- ✅ `/onboarding` - Onboarding flow
- ✅ `/onboarding/stripe` - Stripe Connect setup

### Features ✅
- ✅ Online/Offline toggle
- ✅ Job acceptance workflow
- ✅ Photo capture (pickup/dropoff proof)
- ✅ GPS location tracking
- ✅ Mapbox navigation integration
- ✅ Job filtering by vehicle type
- ✅ Distance calculations
- ✅ ETA estimates
- ✅ Stripe Connect payouts
- ✅ Equipment badges
- ✅ Rate card system

---

## 🔧 Phase 1: Dashboard Polish & Fixes (Day 1)

### Priority Fixes

- [ ] **Fix Dashboard Job List**
  - [ ] Ensure jobs load correctly in bottom sheet
  - [ ] Fix job selection state management
  - [ ] Verify job thumbnails appear on map
  - [ ] Test swipe gestures on bottom sheet

- [ ] **Online/Offline Toggle**
  - [ ] Verify toggle updates Firestore `courierProfile.online`
  - [ ] Test location tracking starts/stops correctly
  - [ ] Add visual feedback when going online/offline
  - [ ] Show status badge in header

- [ ] **Map Interaction**
  - [ ] Fix map centering on user location
  - [ ] Verify job markers clickable
  - [ ] Test zoom controls
  - [ ] Ensure routes draw correctly

- [ ] **Job Cards Enhancement**
  - [ ] Show accurate pickup distance ("X mi away")
  - [ ] Display trip distance ("X mi trip")
  - [ ] Show estimated earnings
  - [ ] Add vehicle type badge
  - [ ] Show estimated time

### Mobile Optimization

- [ ] **Touch Gestures**
  - [ ] Bottom sheet drag smoothness
  - [ ] Map pan and zoom
  - [ ] Job card tap targets (44x44px minimum)
  - [ ] Pull-to-refresh on job list

- [ ] **Performance**
  - [ ] Optimize map render performance
  - [ ] Reduce re-renders on location updates
  - [ ] Lazy load job thumbnails
  - [ ] Throttle location updates (5-second intervals)

**Deliverables:**
- ✅ Dashboard fully functional with no bugs
- ✅ Online/offline toggle working reliably
- ✅ Smooth map interactions
- ✅ Job list loads and updates in real-time

---

## 📦 Phase 2: Active Delivery Flow (Day 1-2)

### Job Detail Page (`/jobs/:id`)

- [ ] **Job Information**
  - [ ] Complete job details display
  - [ ] Customer contact info (call/text buttons)
  - [ ] Pickup and delivery addresses
  - [ ] Special instructions
  - [ ] Package description
  - [ ] Agreed fee display

- [ ] **Actions**
  - [ ] Accept job button (if not accepted)
  - [ ] Navigate to pickup button
  - [ ] Contact customer button
  - [ ] View on map button
  - [ ] Reject/decline option

### Active Route Page (`/active-route`)

**Already 90% Complete** - Just needs testing and minor fixes:

- [x] Full-screen map with turn-by-turn
- [x] Current stop display
- [x] Next action buttons ("Mark Picked Up", "Mark Delivered")
- [x] Photo capture for proof
- [x] GPS coordinates embedded in photos
- [x] Navigation to Google Maps/Waze
- [ ] **Fix:** Verify status transitions work
- [ ] **Fix:** Test photo upload to Firebase Storage
- [ ] **Add:** Completion confirmation screen

### Navigation Features

- [ ] **Turn-by-Turn UI**
  - [ ] Next turn instruction banner
  - [ ] Distance to next turn
  - [ ] ETA to destination
  - [ ] Visual route highlighting
  - [ ] Recenter on driver button

- [ ] **Status Updates**
  - [ ] "Heading to Pickup" status
  - [ ] "Arrived at Pickup" → capture photo
  - [ ] "Heading to Delivery"
  - [ ] "Arrived at Delivery" → capture photo + complete
  - [ ] Firebase status updates in real-time

**Deliverables:**
- ✅ Job acceptance flow complete
- ✅ Active delivery tracking works
- ✅ Photo proof uploads successfully
- ✅ Status updates persist to Firestore

---

## 💰 Phase 3: Earnings & History (Day 2)

### Earnings Dashboard (`/earnings`)

**Already exists** - needs enhancement:

- [ ] **Summary Cards**
  - [ ] Today's earnings
  - [ ] This week's earnings
  - [ ] This month's earnings
  - [ ] Total lifetime earnings
  - [ ] Pending payouts
  - [ ] Available balance

- [ ] **Job History**
  - [ ] List of completed jobs
  - [ ] Job date, time, amount
  - [ ] Customer name (if available)
  - [ ] Route details
  - [ ] Filter by date range
  - [ ] Search functionality

- [ ] **Payout History**
  - [ ] Stripe payout records
  - [ ] Date, amount, status
  - [ ] Link to Stripe dashboard
  - [ ] Export to CSV

- [ ] **Charts**
  - [ ] Weekly earnings chart
  - [ ] Monthly earnings trend
  - [ ] Jobs completed over time

**Deliverables:**
- ✅ Earnings accurately calculated
- ✅ Job history displays correctly
- ✅ Payout tracking integrated with Stripe

---

## ⚙️ Phase 4: Settings & Profile (Day 2-3)

### Settings Page (`/settings`)

**Already exists** - needs organization:

- [ ] **Profile Section**
  - [ ] Display name and email
  - [ ] Phone number
  - [ ] Profile photo upload
  - [ ] Edit profile modal

- [ ] **Vehicle Information**
  - [ ] Current vehicle type
  - [ ] Change vehicle type
  - [ ] Equipment badges display
  - [ ] Link to equipment page

- [ ] **Payout Settings**
  - [ ] Stripe Connect status
  - [ ] Bank account info (masked)
  - [ ] Payout schedule
  - [ ] Link to Stripe dashboard

- [ ] **Preferences**
  - [ ] Notification settings
  - [ ] Auto-accept jobs toggle
  - [ ] Service radius
  - [ ] Language preference
  - [ ] Dark mode toggle

- [ ] **Account Actions**
  - [ ] Sign out
  - [ ] Delete account
  - [ ] Contact support

**Deliverables:**
- ✅ Profile editable and persists
- ✅ Stripe Connect fully integrated
- ✅ Settings save correctly

---

## 🚧 Phase 5: Runner Features (BEHIND FEATURE FLAG)

### Feature Flag: `packageRunner.enabled`

**DO NOT BUILD YET** - These features should be gated behind the `packageRunner.enabled` flag (default: `false`)

### Future Runner Features (When Flag Enabled):

- [ ] **Hub Network**
  - [ ] Hub locations on map
  - [ ] Hub-to-hub routes
  - [ ] Package pickup from hubs
  - [ ] Package dropoff at hubs

- [ ] **Package Tracking**
  - [ ] Scan package barcodes
  - [ ] Track package status
  - [ ] Multi-package deliveries
  - [ ] Package manifest

- [ ] **Route Optimization**
  - [ ] Multi-stop route planning
  - [ ] Optimized stop order
  - [ ] Bulk accept routes
  - [ ] Route bundles

### Implementation Plan (When Ready):

1. Check feature flag in code:
   ```typescript
   const { flags } = useFeatureFlags()
   if (flags?.packageRunner?.enabled) {
     // Show runner features
   }
   ```

2. Add "Runner Mode" toggle in settings (behind flag)
3. Show different dashboard for runners (hub-based)
4. Add package scanning features
5. Build hub management interface

**DO NOT START** until product team confirms we're ready for runner features.

---

## 🗄️ Database Collections

### Existing Collections (Used by Courier App):

1. **`users/{userId}`** - Courier profiles
   ```typescript
   courierProfile: {
     online: boolean
     vehicleType: 'bike' | 'car' | 'van' | 'truck'
     currentLocation: { lat: number, lng: number }
     rating: number
     completedJobs: number
   }
   ```

2. **`jobs/{jobId}`** - Individual delivery jobs
   ```typescript
   {
     status: 'available' | 'assigned' | 'in_progress' | 'completed'
     courierId: string
     pickup: { lat, lng, label, address }
     dropoff: { lat, lng, label, address }
     agreedFee: number
     vehicleType: string
     createdAt: Timestamp
   }
   ```

3. **`routes/{routeId}`** - Multi-stop routes (for runners, behind flag)
4. **`earnings/{recordId}`** - Earnings records
5. **`equipment/{submissionId}`** - Equipment submissions

---

## 🎯 Success Metrics

### Core Functionality
- [ ] Couriers can go online/offline smoothly
- [ ] Available jobs appear on map immediately
- [ ] Job acceptance is instant (< 1 second)
- [ ] Navigation provides accurate turn-by-turn
- [ ] Photo proof uploads reliably
- [ ] Status updates happen in real-time

### Performance
- [ ] Map loads < 2 seconds
- [ ] Location updates every 5 seconds (when active)
- [ ] Bottom sheet drag is smooth (60fps)
- [ ] No jank on job selection
- [ ] App works offline (cached data)

### User Experience
- [ ] Intuitive navigation (no instructions needed)
- [ ] Clear visual feedback for all actions
- [ ] Error messages are helpful
- [ ] Works on iOS and Android
- [ ] Handles poor network gracefully

---

## 🧪 Testing Checklist

### Dashboard
- [ ] Map loads with current location centered
- [ ] Jobs appear as markers on map
- [ ] Bottom sheet displays job list
- [ ] Swipe gestures work smoothly
- [ ] Online toggle updates status
- [ ] Job selection highlights correctly
- [ ] Distance calculations accurate

### Job Acceptance
- [ ] Accept job button works
- [ ] Job removed from available list
- [ ] Job appears in "Active" tab
- [ ] Navigation button enabled
- [ ] Customer contact buttons work

### Active Delivery
- [ ] Turn-by-turn directions accurate
- [ ] Status updates at each step
- [ ] Photo capture works
- [ ] GPS coordinates embedded
- [ ] Completion triggers payout calculation

### Earnings
- [ ] Completed jobs listed
- [ ] Earnings totals accurate
- [ ] Stripe payouts tracked
- [ ] Date filters work
- [ ] Export functionality works

### Settings
- [ ] Profile updates save
- [ ] Vehicle type changes persist
- [ ] Stripe Connect status displays
- [ ] Sign out works
- [ ] Preferences save correctly

### Edge Cases
- [ ] Handles GPS permission denied
- [ ] Works with poor network
- [ ] Handles simultaneous job acceptance
- [ ] Photo upload failures retry
- [ ] Offline mode shows cached jobs

---

## 📱 Mobile-First Design Principles

### Layout
- **Map Shell:** Full-screen map as base layer
- **Floating UI:** Cards and sheets overlay map
- **Bottom Nav:** Always accessible, 72px height
- **Bottom Sheet:** Swipeable, 3 states (collapsed, half, full)
- **Safe Areas:** Respect iOS notch and Android nav bar

### Touch Targets
- Minimum 44x44px for all interactive elements
- 8px spacing between adjacent buttons
- Floating action buttons 56x56px
- Swipe handles clearly visible (4px tall)

### Gestures
- Swipe bottom sheet up/down
- Pinch to zoom map
- Pan to move map
- Tap markers to select
- Long-press for context menus

### Performance
- Throttle location updates (5s intervals)
- Debounce search inputs (300ms)
- Lazy load off-screen content
- Cache map tiles
- Optimize image sizes

---

## 📋 Implementation Order

### Day 1: Dashboard Fixes
1. Fix job list loading
2. Fix online/offline toggle
3. Fix map centering
4. Test job selection
5. Verify route drawing

### Day 2: Active Delivery
1. Test job acceptance flow
2. Verify active route page
3. Test photo capture
4. Verify status updates
5. Test completion flow

### Day 3: Polish & Testing
1. Enhance earnings page
2. Organize settings page
3. Mobile testing (iOS + Android)
4. Performance optimization
5. Bug fixes

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance metrics met
- [ ] Mobile devices tested (iOS + Android)
- [ ] Network error handling works
- [ ] Offline mode functional

### Environment Variables
```env
VITE_MAPBOX_TOKEN=...
VITE_FIREBASE_API_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...
```

### Build & Deploy
```bash
# Build
cd apps/courier-app
pnpm build

# Test build locally
pnpm preview

# Deploy to Firebase Hosting
firebase deploy --only hosting:gosenderr-courier
```

### Post-Deployment
- [ ] Verify production build loads
- [ ] Test on real devices
- [ ] Check Firebase analytics
- [ ] Monitor error tracking (Sentry)
- [ ] Review user feedback

---

## 🔗 Related Documentation

- [COURIER_ROLE_PLAN.md](../../docs/COURIER_ROLE_PLAN.md) - Complete courier feature spec
- [NAVIGATION_GUIDE.md](../../docs/NAVIGATION_GUIDE.md) - Navigation patterns
- [APP_ARCHITECTURE.md](../../docs/APP_ARCHITECTURE.md) - Overall app structure
- [COURIER_RUNNER_AUDIT.md](../../COURIER_RUNNER_AUDIT.md) - Current state audit

---

## 💬 Questions/Blockers

### Current Issues:
1. Dashboard job list not loading? - **Needs investigation**
2. Online toggle updating Firestore? - **Needs testing**
3. Photo upload to Firebase Storage? - **Verify configuration**
4. Stripe Connect webhook handling? - **Cloud Function needed?**

### Decisions Needed:
1. Should we auto-accept jobs if courier is online? - **Product decision**
2. Maximum service radius for job visibility? - **Default 10 miles?**
3. Photo requirements (max size, format)? - **2MB, JPEG?**
4. Offline mode - how long to cache data? - **24 hours?**

---

## 📝 Progress Updates

_Add progress updates as work proceeds..._

### [Date] - Courier App Enhancement Started
- Reviewing existing codebase
- Identifying bugs and gaps
- Creating fix priority list

---

## 🎉 Completion Criteria

### Definition of Done:
- ✅ All dashboard features working smoothly
- ✅ Job acceptance to completion flow tested
- ✅ Photo proof uploads successfully
- ✅ Earnings accurately tracked
- ✅ Settings save and persist
- ✅ No critical bugs
- ✅ Works on iOS and Android
- ✅ Performance metrics met
- ✅ Documentation updated

### Success Indicators:
- Couriers can complete deliveries end-to-end
- No user-facing errors
- Smooth 60fps interactions
- < 3 second load times
- Real-time updates working
- Stripe payouts processing

---

## 🔮 Future Enhancements (Post-Launch)

**Not in this implementation - future work:**

- [ ] In-app chat with customers
- [ ] Voice navigation instructions
- [ ] Apple Watch companion app
- [ ] Batch job acceptance
- [ ] Smart route suggestions
- [ ] Heat map of high-demand areas
- [ ] Gamification (badges, streaks)
- [ ] Courier leaderboard
- [ ] Referral bonuses
- [ ] Advanced analytics dashboard

**Runner Features (Behind Flag):**
- [ ] Hub network visualization
- [ ] Package scanning
- [ ] Multi-package deliveries
- [ ] Route optimization
- [ ] Bulk operations

---

_Last Updated: January 28, 2026_

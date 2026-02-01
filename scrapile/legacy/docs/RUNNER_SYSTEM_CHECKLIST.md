# Runner/Senderr System - Implementation Checklist

**Last Updated:** January 23, 2026  
**Status:** In Progress (Existing features need audit)

---

## Overview

The Runner/Senderr portal allows delivery drivers to:
- Accept delivery jobs and routes
- Track earnings and completed deliveries
- Manage availability and vehicle info
- Navigate to pickup and dropoff locations
- Update delivery status in real-time
- View payment history and withdrawals

**Apps:**
- `apps/courier-app` - Standalone Vite app (port 3001)
- `apps/web/src/app/runner/*` - Next.js web app (port 3003)

---

## Phase 1: Core Delivery Features ⚠️ PARTIAL

### ✅ Dashboard
- [x] Welcome header with runner info
- [x] Quick stats (active jobs, earnings, completed deliveries)
- [x] Active jobs section with real-time updates
- [x] Available jobs nearby
- [x] Online/offline toggle
- [x] Quick action buttons
- [ ] **MISSING:** Today's earnings breakdown
- [ ] **MISSING:** Performance metrics (rating, on-time%)
- **Location:** `/dashboard` (courier-app), `/runner/dashboard` (web)
- **Files:** `Dashboard.tsx` in both apps
- **Status:** Core features working, needs enhancements

### ✅ Available Routes/Jobs
- [x] View all available delivery jobs
- [x] Filter by home hub
- [x] Job cards with key info (pickup, dropoff, pay)
- [x] Accept job button
- [x] Real-time job updates
- [x] Distance calculation from current location
- [ ] **MISSING:** Estimated time to complete
- [ ] **MISSING:** Batch job acceptance (multiple deliveries)
- [ ] **MISSING:** Job preferences (size, distance limits)
- **Location:** `/jobs` or `/available-routes` (courier-app), `/runner/available-routes` (web)
- **Files:** `Jobs.tsx`, `AvailableRoutes.tsx`
- **Status:** Basic functionality works

### ✅ Active Job Details
- [x] Full job information display
- [x] Pickup and dropoff addresses
- [x] Customer contact info (masked until accepted)
- [x] Navigation integration (Google Maps)
- [x] Status update buttons (picked up, delivered)
- [x] Real-time location tracking
- [x] **✅ Photo proof of delivery** (completed)
- [x] **✅ Reject job with reason** (completed)
- [ ] **MISSING:** In-app navigation
- [ ] **MISSING:** Customer signature
- **Location:** `/jobs/:jobId` (courier-app), `/runner/jobs` (web)
- **Files:** `JobDetail.tsx`, `ProofOfDeliveryModal.tsx`, `RunnerRejectModal.tsx`
- **Status:** Core features complete

### ⚠️ Earnings Page
- [x] Total earnings display
- [x] Earnings by timeframe (today, week, month, all-time)
- [x] Completed jobs list with payouts
- [x] Filtering and search
- [ ] **MISSING:** Cash out / withdraw funds
- [ ] **MISSING:** Earnings breakdown (tips, base pay, bonuses)
- [ ] **MISSING:** Tax documents (1099)
- [ ] **MISSING:** Payment method management
- **Location:** `/earnings` (courier-app), `/runner/earnings` (web)
- **Files:** `apps/web/src/app/runner/earnings/page.tsx`
- **Status:** View-only, no payouts

---

## Phase 2: Profile & Onboarding ⚠️ PARTIAL

### ✅ Onboarding Flow
- [x] Multi-step form
- [x] Vehicle information (type, make, model)
- [x] License info
- [x] Insurance details
- [x] Background check consent
- [x] Bank account for payouts
- [ ] **MISSING:** Document upload (license, insurance)
- [ ] **MISSING:** Vehicle photo upload
- [ ] **MISSING:** Admin approval workflow
- **Location:** `/onboarding` (web)
- **Files:** `apps/web/src/app/runner/onboarding/page.tsx`
- **Status:** Form exists, needs document upload

### ✅ Profile Page
- [x] Basic runner info display
- [x] Vehicle details
- [x] Rating display
- [x] Total deliveries count
- [x] **✅ Edit profile functionality** (completed)
- [x] **✅ Update vehicle info** (completed)
- [ ] **MISSING:** Profile photo upload
- [ ] **MISSING:** Availability schedule
- **Location:** `/profile` (courier-app), `/runner/profile` (web)
- **Files:** `Profile.tsx` in both apps
- **Status:** Edit mode complete, missing photo upload

### ⚠️ Settings Page
- [x] Basic settings structure
- [ ] **MISSING:** Notification preferences
- [ ] **MISSING:** Delivery preferences (max distance, package size)
- [ ] **MISSING:** Home hub selection
- [ ] **MISSING:** Privacy settings
- [ ] **MISSING:** Language selection
- **Location:** `/settings` (courier-app), `/runner/settings` (web)
- **Files:** `Settings.tsx`
- **Status:** Placeholder only

---

## Phase 3: Navigation & Tracking ⬜ NOT IMPLEMENTED

### ⬜ Turn-by-Turn Navigation
- [ ] In-app navigation to pickup
- [ ] In-app navigation to dropoff
- [ ] Real-time traffic updates
- [ ] Alternative routes
- [ ] ETA calculation
- **Estimated Time:** 4 hours
- **Integration:** Mapbox or Google Maps Navigation SDK

### ⬜ Live Location Tracking
- [ ] Share live location with customer
- [ ] Background location updates
- [ ] Geofence triggers (arrived at pickup/dropoff)
- [ ] Battery optimization
- **Estimated Time:** 3 hours
- **Note:** Requires mobile permissions

### ⬜ Multi-Stop Routes
- [ ] Accept multiple jobs in one route
- [ ] Route optimization (best order)
- [ ] Stop-by-stop navigation
- [ ] Mark each stop as complete
- **Estimated Time:** 3 hours

---

## Phase 4: Proof of Delivery ✅ COMPLETE

### ✅ Photo Proof
- [x] Camera integration
- [x] Take photo at dropoff
- [x] Multiple photos support (single required)
- [x] Photo compression and upload (Firebase Storage)
- [x] Customer receives notification with photo
- **Completed:** January 23, 2026
- **Files:** `ProofOfDeliveryModal.tsx`

### ⬜ Signature Capture
- [ ] Digital signature pad
- [ ] Save signature as image
- [ ] Associate with job
- [ ] Required for high-value deliveries
- **Estimated Time:** 1.5 hours
- **Files to Create:** `SignatureModal.tsx`

### ✅ Delivery Notes
- [x] Add notes at delivery (left at door, handed to person)
- [x] Predefined note options (6 quick options)
- [x] Custom text input (200 char limit)
- [x] Notes visible to customer and admin
- **Completed:** January 23, 2026
- **Files:** `ProofOfDeliveryModal.tsx`

---

## Phase 5: Earnings & Payouts ⚠️ PARTIAL

### ✅ Earnings Dashboard
- [x] Total earnings display
- [x] Earnings history
- [x] Filter by date range
- [x] Job-by-job breakdown

### ⬜ Cash Out / Withdrawals
- [ ] Withdraw earnings to bank account
- [ ] Minimum withdrawal amount ($25)
- [ ] Instant payout option (fee applies)
- [ ] Payout history
- [ ] Pending vs available balance
- **Estimated Time:** 3 hours
- **Integration:** Stripe Connect payouts

### ⬜ Earnings Breakdown
- [ ] Base pay per delivery
- [ ] Tips from customers
- [ ] Bonuses (peak hours, streaks)
- [ ] Deductions (platform fee, instant payout fee)
- **Estimated Time:** 2 hours

### ⬜ Tax Documents
- [ ] Generate 1099 form
- [ ] Download yearly earnings report
- [ ] Tax withholding preferences
- [ ] W-9 form upload
- **Estimated Time:** 3 hours

---

## Phase 6: Performance & Ratings ⬜ NOT IMPLEMENTED

### ⬜ Rating System
- [ ] View customer ratings
- [ ] Average rating display
- [ ] Rating breakdown (1-5 stars)
- [ ] Recent reviews from customers
- [ ] Respond to reviews
- **Estimated Time:** 2 hours

### ⬜ Performance Metrics
- [ ] On-time delivery percentage
- [ ] Acceptance rate
- [ ] Completion rate
- [ ] Customer satisfaction score
- [ ] Weekly/monthly trends
- **Estimated Time:** 2.5 hours

### ⬜ Achievements & Badges
- [ ] Milestones (100 deliveries, 500 deliveries)
- [ ] Badges (5-star, speedy, reliable)
- [ ] Leaderboards (top earners, most deliveries)
- [ ] Rewards program
- **Estimated Time:** 2 hours

---

## Phase 7: Availability & Scheduling ⬜ NOT IMPLEMENTED

### ⬜ Availability Toggle
- [x] Online/offline switch (basic)
- [ ] **MISSING:** Scheduled availability (set hours)
- [ ] **MISSING:** Break mode
- [ ] **MISSING:** Auto-offline after inactivity
- **Estimated Time:** 2 hours

### ⬜ Shift Scheduling
- [ ] Create recurring shifts (Mon-Fri 9am-5pm)
- [ ] View scheduled shifts
- [ ] Edit/delete shifts
- [ ] Shift reminders
- **Estimated Time:** 3 hours

### ⬜ Time Off Requests
- [ ] Request days off
- [ ] Vacation mode
- [ ] View approved time off
- [ ] Block unwanted time slots
- **Estimated Time:** 2 hours

---

## Phase 8: Communication ⚠️ PARTIAL

### ⬜ Customer Chat
- [ ] In-app messaging with customer
- [ ] Quick replies (On my way, Arrived, etc.)
- [ ] Photo sharing
- [ ] Push notifications for messages
- **Estimated Time:** 3 hours

### ✅ Support Contact
- [x] Contact support button (email, phone)
- [x] FAQ section (10 FAQs across 5 categories)
- [x] Search functionality
- [x] Emergency contact
- [ ] **MISSING:** Submit issue/ticket
- **Completed:** January 23, 2026
- **Location:** `/runner/support`
- **Files:** `apps/web/src/app/runner/support/page.tsx`

### ✅ Job Rejection
- [x] Reject job with reason
- [x] Predefined rejection reasons (8 options)
- [x] Optional notes (500 char)
- [x] No penalty for first rejection warning
- [x] Track rejection rate
- **Completed:** January 23, 2026
- **Files:** `RunnerRejectModal.tsx`
- **Integration:** Available Routes page

---

## Phase 9: Advanced Features ⬜ NOT IMPLEMENTED

### ⬜ Vehicle Management
- [ ] Multiple vehicles (car, bike, scooter)
- [ ] Switch active vehicle
- [ ] Vehicle inspection reminders
- [ ] Mileage tracking
- **Estimated Time:** 2.5 hours

### ⬜ Route History
- [ ] View past routes
- [ ] Route replay (see path taken)
- [ ] Total miles driven
- [ ] Export route history
- **Estimated Time:** 2 hours

### ⬜ Referral Program
- [ ] Generate referral code
- [ ] Share referral link
- [ ] Track referrals
- [ ] Earn bonus per referral
- **Estimated Time:** 2 hours

### ⬜ Notifications
- [ ] Push notifications for new jobs
- [ ] SMS alerts for urgent jobs
- [ ] Email summaries (daily/weekly)
- [ ] Notification preferences
- **Estimated Time:** 2.5 hours

---

## Quick Reference: Runner Routes

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/dashboard` | Dashboard | ✅ | Overview with stats |
| `/available-routes` | Available Jobs | ✅ | Accept new deliveries |
| `/jobs` | Active Jobs | ✅ | View current deliveries |
| `/jobs/:jobId` | Job Details | ⚠️ | Track individual delivery |
| `/earnings` | Earnings | ⚠️ | View earnings (no payouts) |
| `/profile` | Profile | ⚠️ | View profile (no edit) |
| `/settings` | Settings | ⚠️ | Basic settings only |
| `/onboarding` | Onboarding | ⚠️ | Signup flow (needs docs) |
| `/navigation` | Navigation | ⬜ | Not implemented |
| `/payouts` | Payouts | ⬜ | Not implemented |
| `/support` | Support | ✅ | FAQ and help center |

---

## Component Library

### Core Components (Shared)
- ✅ `StatusBadge.tsx` - Job status indicators
- ✅ `Avatar.tsx` - User avatars
- ✅ `Card.tsx` - Reusable cards
- ✅ `StatCard.tsx` - Stats display
- ✅ `SwipeableCard.tsx` - Swipeable job cards
- ✅ `ProofOfDeliveryModal.tsx` - **Created**
- ✅ `RunnerRejectModal.tsx` - **Created**
- ⬜ `SignatureModal.tsx` - Not created

### Feature Components (Runner-Specific)
- ✅ `RunnerJobCard.tsx` - Job display card
- ✅ `RunnerStats.tsx` - Dashboard stats
- ⬜ `NavigationView.tsx` - Not created
- ⬜ `EarningsChart.tsx` - Not created
- ⬜ `PayoutForm.tsx` - Not created

---

## Cloud Functions Status

| Function | Status | Purpose | Used By Runner |
|----------|--------|---------|----------------|
| `acceptJob` | ✅ | Accept delivery job | Yes - Available Routes |
| `updateJobStatus` | ✅ | Update job status | Yes - Job Details |
| `completeJob` | ✅ | Mark job complete | Yes - Job Details |
| `rejectJob` | ✅ | Reject job with reason | **Complete** - Available Routes |
| `submitProofOfDelivery` | ✅ | Upload delivery proof | **Complete** - Job Details |
| `requestPayout` | ⬜ | Withdraw earnings | **NEEDED** |
| `updateRunnerLocation` | ⚠️ | Track live location | Partial |
| `calculateEarnings` | ✅ | Calculate job payout | Yes |

---

## Testing Checklist

### ✅ Already Tested
- [x] Login/Signup flow
- [x] Dashboard loads with stats
- [x] View available jobs
- [x] Accept job
- [x] View active jobs
- [x] Update job status
- [x] View earnings

### ⏳ Needs Testing
- [ ] **Proof of Delivery:**
  - [ ] Take photo at dropoff
  - [ ] Capture signature
  - [ ] Add delivery notes
  - [ ] Customer receives notification
- [ ] **Payouts:**
  - [ ] Request withdrawal
  - [ ] Instant payout (fee)
  - [ ] View payout history
  - [ ] Bank account verification
- [ ] **Navigation:**
  - [ ] Turn-by-turn directions
  - [ ] Live location sharing
  - [ ] Multi-stop routes
  - [ ] ETA accuracy
- [ ] **Performance:**
  - [ ] Rating system
  - [ ] Performance metrics
  - [ ] Achievements
- [ ] **Communication:**
  - [ ] Chat with customer
  - [ ] Contact support
  - [ ] Reject job with reason

---

## Known Issues

### 🐛 Active Bugs
1. **Onboarding document upload not working** (needs file upload)
2. **Profile page is view-only** (no edit functionality)
3. **Settings page is placeholder** (no actual settings)
4. **No proof of delivery** (photo/signature missing)
5. **Cannot withdraw earnings** (payouts not implemented)

### ⚠️ Limitations
- No in-app navigation (relies on external maps)
- No proof of delivery (photo/signature)
- No payout system (earnings are tracked but not withdrawn)
- No rating system (runners don't see customer feedback)
- No multi-stop routes (one job at a time)
- No scheduled availability (only online/offline)
- No customer chat (no communication)
- No performance tracking (no metrics dashboard)

---

## Implementation Priority

### Phase 1: Critical Features 🔥 HIGH PRIORITY
1. Proof of Delivery (photo + signature) (4 hours)
2. Payout system (Stripe Connect) (3 hours)
3. Edit profile functionality (2 hours)
4. Job rejection with reason (1 hour)
5. Support/Help page (1.5 hours)

**Total Phase 1:** ~11.5 hours

### Phase 2: Core Enhancements 🌟 MEDIUM PRIORITY
1. Navigation integration (4 hours)
2. Live location tracking (3 hours)
3. Performance metrics dashboard (2.5 hours)
4. Rating system (2 hours)
5. Earnings breakdown (2 hours)

**Total Phase 2:** ~13.5 hours

### Phase 3: Nice-to-Have ✨ LOW PRIORITY
1. Multi-stop routes (3 hours)
2. Customer chat (3 hours)
3. Shift scheduling (3 hours)
4. Achievements/badges (2 hours)
5. Referral program (2 hours)
6. Vehicle management (2.5 hours)

**Total Phase 3:** ~15.5 hours

---

## Total Estimated Time: ~40.5 hours

---

## Quick Wins (Can Do First)
These are the easiest and most impactful:

1. **Edit Profile** (2 hours) - Runners need this
2. **Proof of Delivery Photo** (2 hours) - Essential for trust
3. **Job Rejection Modal** (1 hour) - Already partially exists
4. **Support Page** (1.5 hours) - Help and FAQ
5. **Earnings Breakdown** (2 hours) - Show tips vs base pay

**Quick Wins Total:** 8.5 hours

---

## Summary

**Total Features:** ~40 features across 9 phases  
**Completed:** ~12/40 (30%) ✅  
**Partial:** ~8/40 (20%) ⚠️  
**Remaining:** ~20/40 (50%) ⬜  
**Status:** Core delivery flow works, needs enhancements

### What Works Right Now
✅ Login/Signup authentication  
✅ Dashboard with stats  
✅ View available jobs  
✅ Accept jobs  
✅ View active jobs  
✅ Update job status (picked up, delivered)  
✅ View earnings history  
✅ Basic profile display  
✅ Online/offline toggle  
✅ Onboarding form (no document upload)  

### What's Missing (Critical)
⬜ Proof of delivery (photo/signature)  
⬜ Withdraw earnings (payouts)  
⬜ Edit profile  
⬜ Job rejection with reason  
⬜ In-app navigation  
⬜ Performance metrics  
⬜ Customer communication  
⬜ Support/help page  

### What's Missing (Nice-to-Have)
⬜ Multi-stop routes  
⬜ Scheduled availability  
⬜ Rating system  
⬜ Achievements/badges  
⬜ Referral program  
⬜ Tax documents  

**The runner portal has the core delivery flow working but needs proof of delivery, payouts, and profile management!** 🚚💰

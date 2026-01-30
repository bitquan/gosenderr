# Courier App V2 - Fresh Start Plan

**Branch:** `feature/courier-app-v2-backend`
**Status:** Starting fresh backend-first approach
**Created:** Jan 30, 2026

---

## Philosophy: Backend-First Design

Instead of building UI first then fighting backend issues, we're building:
1. **Cloud Functions** (business logic)
2. **Firestore Schema** (data models)
3. **Real-time listeners** (pub/sub patterns)
4. **Clean APIs** (typed responses)
5. **Then UI** (components consuming clean APIs)

---

## Phase 1: Backend Infrastructure (This Phase)

### 1.1 Firestore Collections Structure

```typescript
// Define all collections and indexes needed
collections/
├── couriers/
│   ├── profile (name, vehicle, ratings, etc)
│   ├── availability (online status, working hours)
│   ├── location (current lat/lng, updated at)
│   ├── earnings (today, week, month totals)
│   └── documents (license, insurance, etc)
│
├── jobs/
│   ├── metadata (id, status, createdAt, etc)
│   ├── details (pickup, delivery, addresses, etc)
│   ├── pricing (distance, fee, etc)
│   ├── assignment (courierUid, assignedAt)
│   ├── tracking (current status, history)
│   └── proof (photos, signatures)
│
├── deliveries/
│   ├── activeJobs (real-time job list)
│   ├── completedJobs (history)
│   ├── canceledJobs (reasons, disputes)
│   └── ratings (customer feedback)
│
└── courierLocations/
    ├── realtime (lat, lng, timestamp, accuracy)
    └── history (archive of movements)
```

### 1.2 Cloud Functions to Build

```typescript
// Core courier operations
├── onCreate(courier)           // Setup new courier profile
├── onUpdate(availability)      // Courier online/offline
├── updateLocation()            // Real-time GPS updates
├── claimJob()                  // Accept available job
├── startDelivery()             // Begin trip
├── completeDelivery()          // Mark done with photo proof
├── rejectJob()                 // Decline job
└── submitRating()              // Customer feedback

// Real-time job management
├── getAvailableJobs()          // Query nearby jobs
├── getMyActiveJobs()           // Courier's current deliveries
├── getJobDetails()             // Full job info + route
├── getEarningsToday()          // Today's money
└── getDeliveryHistory()        // Past deliveries
```

### 1.3 Real-Time Data Patterns

```typescript
// Firestore listeners that client subscribes to
listeners/
├── courierProfile: Listen for courier's own data
├── availableJobs: Real-time query of nearby open jobs
├── myActiveJobs: Courier's assigned but not complete jobs
├── jobTracking: Live updates on assigned job (status, location, etc)
├── earnings: Real-time earnings calculation
└── notifications: New jobs, pickups ready, delivery times, etc
```

### 1.4 Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Courier can only read/write their own profile
    match /couriers/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isOwner(uid) && validateCourierUpdate(resource);
    }
    
    // Courier can read available jobs + write to accept them
    match /jobs/{jobId} {
      allow read: if hasCourierRole() || isAdmin();
      allow write: if hasCourierRole() && canAssignJob(jobId);
    }
    
    // Real-time location updates (write-only for courier)
    match /courierLocations/{uid} {
      allow write: if isOwner(uid) && validateLocation(request);
      allow read: if isAdmin();
    }
  }
}
```

---

## Phase 2: Frontend Components

*Built on top of Phase 1 API*

```typescript
pages/
├── Login.tsx              // Auth
├── Dashboard.tsx          // Job list + online toggle
├── JobDetail.tsx          // Job info before accepting
├── Navigation.tsx         // Map + turn-by-turn
├── DeliveryComplete.tsx   // Photo proof + signature
└── History.tsx            // Past deliveries

components/
├── JobCard.tsx            // Displays one job card
├── MapShell.tsx           // Full-screen Mapbox
├── StatusBanner.tsx       // Online/offline toggle
├── EarningsCard.tsx       // Today's earnings
└── ProofCapture.tsx       // Photo + signature capture
```

---

## Phase 3: Mobile Optimization

- Minimal bundle size
- Responsive layouts (sm, md, lg breakpoints)
- Touch-friendly UI (larger tap targets)
- Battery-efficient GPS tracking
- Offline fallback

---

## Current Issues to Avoid in V2

1. ❌ **Giant Dashboard component** → Split into smaller hooks
2. ❌ **Too many re-renders** → Proper memoization + selective subscriptions
3. ❌ **Navigation bugs** → Simpler routing structure
4. ❌ **GPS tracking flaky** → Direct Firestore writes, no complex logic
5. ❌ **UI too big on mobile** → Responsive design from day 1
6. ❌ **Inconsistent error handling** → Centralized error boundary
7. ❌ **No TypeScript** → Strict types everywhere

---

## Development Workflow

### Sprint 1: Backend (Week 1-2)
- [ ] Design Firestore collections
- [ ] Write security rules
- [ ] Create Cloud Functions
- [ ] Test with Firebase Emulator
- [ ] Document all APIs

### Sprint 2: Frontend (Week 3-4)
- [ ] Build React hooks consuming APIs
- [ ] Create components
- [ ] Test on device
- [ ] Performance optimization

### Sprint 3: Polish (Week 5)
- [ ] Bug fixes
- [ ] Mobile refinements
- [ ] E2E testing
- [ ] Deployment

---

## Test Users

```bash
admin@courier.test
courier1@courier.test
courier2@courier.test

# All password: admin123 (use strong password in prod)
```

---

## Metrics to Track

- GPS accuracy + update frequency
- Job claim time (time to accept offer)
- Real-time sync latency (job → notification)
- Battery drain (background tracking)
- Network resilience (offline mode, reconnect)

---

## Success Criteria

✅ No dropped GPS updates
✅ <500ms job assignment latency
✅ <100ms real-time UI updates
✅ Offline mode works
✅ Tests pass on real iPhone

---

## Branch Checklist

- [ ] Phase 1: Backend complete
- [ ] Phase 2: Frontend basic
- [ ] Phase 3: Mobile polish
- [ ] E2E tests passing
- [ ] Ready to merge to main

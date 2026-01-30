# Courier App V2 - Fresh Start Summary

**Date:** Jan 30, 2026
**Branch:** `feature/courier-app-v2-backend`
**Status:** ✅ Foundation laid - Ready for Phase 1 Backend Development

---

## What's Been Done

### 1. ✅ Branch Created
- New clean branch: `feature/courier-app-v2-backend`
- Previous courier app issues left on `feature/courier-app-working`
- Can merge back to main when v2 is production-ready

### 2. ✅ Architecture Planning
- Documented backend-first approach in **COURIER_APP_V2_PLAN.md**
- 3-phase development plan with clear milestones
- Philosophy: Build APIs first, UI second

### 3. ✅ Firestore Schema Defined
- **COURIER_SCHEMA_V2.ts** - Complete TypeScript interfaces for:
  - CourierProfile (name, vehicle, ratings, documents)
  - CourierLocation (real-time GPS tracking)
  - Job (pickup, delivery, pricing, proof)
  - CourierEarnings (money tracking)
  
- Security rules included
- Indexes documented

### 4. ✅ Cloud Functions Structure Started
- **courier/types.ts** - API interfaces for:
  - ClaimJobRequest/Response
  - CompleteJobRequest/Response
  - CourierLocationUpdate
  - AvailableJobsResponse
  - CourierStatsResponse

---

## What We're Avoiding This Time

| Issue | V1 Problem | V2 Solution |
|-------|-----------|-----------|
| **Massive Dashboard** | 600 lines in one file | Split into hooks + small components |
| **GPS Flaky** | Complex state logic | Direct Firestore writes + real-time listeners |
| **Navigation Bugs** | Too many route states | Simple routing (Dashboard → JobDetail → Navigation) |
| **Excessive Re-renders** | No memoization | React.memo + useCallback on every hook |
| **Mobile UI too big** | Responsive design last | Mobile-first from component creation |
| **No error handling** | Silent failures | Centralized error boundary + try/catch |
| **No types** | Any types everywhere | Strict TypeScript on everything |

---

## Next Steps (Phase 1: Backend)

### Week 1: Cloud Functions

```bash
# Create these functions in firebase/functions/src/courier/

1. claimJob() 
   - Assign job to courier
   - Update job status to "claimed"
   - Notify customer

2. startDelivery()
   - Mark job as "active"
   - Start tracking updates

3. completeDelivery()
   - Accept photos + signature
   - Mark job complete
   - Calculate and store earnings
   - Trigger payment transfer

4. updateLocation()
   - Real-time GPS writer
   - Store to courierLocations/{uid}
   - Update job tracking

5. getAvailableJobs()
   - Query jobs within 5 miles
   - Sort by distance
   - Return with estimated time

6. getMyActiveJobs()
   - List courier's current deliveries
   - Real-time updates
```

### Week 2: Testing

```bash
# Firebase Emulator testing

1. Manual cloud function tests
2. Firestore write verification
3. Real-time listener testing
4. Security rule validation
```

---

## How to Start Developing

### 1. Switch to new branch
```bash
git checkout feature/courier-app-v2-backend
```

### 2. Start Firebase Emulator
```bash
firebase emulators:start
```

### 3. Create first Cloud Function
```typescript
// firebase/functions/src/courier/claimJob.ts

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ClaimJobRequest, ClaimJobResponse } from "./types";

const db = admin.firestore();

export const claimJob = functions.https.onCall(
  async (request: ClaimJobRequest): Promise<ClaimJobResponse> => {
    try {
      const { jobId, courierId } = request;
      
      // 1. Get job
      const jobDoc = await db.collection("jobs").doc(jobId).get();
      if (!jobDoc.exists) {
        return { success: false, error: "Job not found" };
      }
      
      const job = jobDoc.data();
      
      // 2. Check if available
      if (job.courierUid) {
        return { success: false, error: "Job already claimed" };
      }
      
      // 3. Assign to courier
      await jobDoc.ref.update({
        courierUid: courierId,
        status: "claimed",
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // 4. Return confirmation
      return {
        success: true,
        job: {
          id: jobId,
          pickup: job.pickup,
          delivery: job.delivery,
          price: job.totalPrice,
        },
      };
    } catch (error: any) {
      console.error("claimJob error:", error);
      return { success: false, error: error.message };
    }
  }
);
```

### 4. Test with Emulator
```bash
# In Firebase Emulator UI: http://127.0.0.1:4000/functions

# Call function:
firebase functions:shell

claimJob({
  jobId: "test-job-123",
  courierId: "courier-123"
})
```

---

## Branch Protection

**Do NOT merge to main until:**
- ✅ Phase 1: Backend functions all working
- ✅ Phase 2: Frontend components built
- ✅ Phase 3: Mobile tested on real device
- ✅ All E2E tests passing

Current branch: `feature/courier-app-v2-backend`
Previous branch: `feature/courier-app-working` (old buggy version)

---

## File Structure

```
courier-app-v2/
├── COURIER_APP_V2_PLAN.md           ← Main roadmap
├── firebase/
│   ├── COURIER_SCHEMA_V2.ts         ← Types + schema
│   └── functions/src/courier/
│       ├── types.ts                 ← API types
│       ├── claimJob.ts              ← (to create)
│       ├── startDelivery.ts         ← (to create)
│       ├── completeDelivery.ts      ← (to create)
│       ├── updateLocation.ts        ← (to create)
│       ├── getAvailableJobs.ts      ← (to create)
│       └── getMyActiveJobs.ts       ← (to create)
│
└── apps/courier-app/
    ├── src/
    │   ├── hooks/
    │   │   ├── useClaimJob.ts       ← (to create)
    │   │   ├── useAvailableJobs.ts  ← (to create)
    │   │   └── useJobTracking.ts    ← (to create)
    │   └── pages/
    │       ├── Dashboard.tsx         ← (to create - clean)
    │       ├── JobDetail.tsx         ← (to create)
    │       └── Navigation.tsx        ← (to create)
```

---

## Questions Before Starting Phase 1?

1. **GPS Update Frequency** - How often should location update? (1s, 5s, 10s?)
2. **Job Query Range** - Show jobs within how many miles? (1, 5, 10?)
3. **Payment Flow** - Immediate transfer or end-of-day batch?
4. **Offline Support** - Queue deliveries offline, sync when online?
5. **Multi-Job** - Can courier carry multiple active jobs? (YES/NO)

---

## Success Definition

When Phase 1 is complete, we should have:

```typescript
// All these should work via Firebase Emulator

✅ claimJob() - Courier claims available job
✅ startDelivery() - Courier begins trip
✅ completeDelivery() - Courier finishes + uploads proof
✅ updateLocation() - GPS writes every N seconds
✅ getAvailableJobs() - Real-time nearby jobs list
✅ getMyActiveJobs() - Courier's current deliveries
✅ getEarningsToday() - Today's money total
✅ getSecurity Rules() - Pass all permission tests
```

When Phase 2 is complete:

```typescript
// All these React components should work

✅ Dashboard - Show available jobs + earnings
✅ JobDetail - Show job info before accepting
✅ Navigation - Map + turn-by-turn directions
✅ DeliveryComplete - Photo + signature capture
✅ History - Past deliveries review
```

---

Ready to start coding the backend? Start with `claimJob()` function! 🚀

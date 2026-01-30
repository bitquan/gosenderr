# Courier App V2 - Development Log & Context

**Date Started:** January 30, 2026  
**Branch:** `feature/courier-app-v2-backend`  
**Status:** ✅ Ready for Phase 1 Backend Implementation

---

## 🎯 Why We Started Over

The original courier app had interconnected bugs that made development difficult:

### Previous Issues (feature/courier-app-working branch):
- ❌ **UI too large** - Header/navbar/spacing not mobile-responsive
- ❌ **GPS tracking flaky** - Complex state logic causing race conditions
- ❌ **Navigation bugs** - Routes disappearing on resume, permission re-prompting
- ❌ **Massive Dashboard** - 600+ lines in single component
- ❌ **No error handling** - Silent failures in background tracking
- ❌ **Type safety issues** - "any" types throughout codebase
- ❌ **Re-render spam** - No memoization, components re-rendering unnecessarily

### Decision: Backend-First Architecture
Instead of patching bugs, we decided to rebuild with a clean architecture:
1. **Define Firestore schema first** → Avoid guessing at data structure
2. **Define Cloud Functions APIs** → Type-safe contracts
3. **Define security rules** → No "figure it out later"
4. **Build React hooks** → Consume well-defined APIs
5. **Build UI components** → Simple, focused components

---

## 📋 What's Been Setup

### Foundation Files Created (Jan 30, 2026)

| File | Purpose | Status |
|------|---------|--------|
| **COURIER_APP_V2_PLAN.md** | 200+ line backend-first roadmap | ✅ Done |
| **firebase/COURIER_SCHEMA_V2.ts** | Complete Firestore types + schema | ✅ Done |
| **firebase/functions/src/courier/types.ts** | Cloud Functions API types | ✅ Done |
| **COURIER_APP_V2_START.md** | Quick reference guide | ✅ Done |

### Environment Status

```bash
# Ports
✅ All ports closed (3000, 5173, 5174, 5175, 5180, 9099, 8080, 5001)

# Build
✅ Clean artifacts removed
✅ Fresh build: 4.30s (no errors)
✅ Bundle size: ~56KB CSS, ~67KB vendor, ~1.5MB maps

# Firebase Emulator
✅ Ready to start (firebase emulators:start)
✅ Test users seeded: admin@sender.com, courier@sender.com
✅ Network port forwarding: socat (192.168.0.76 accessible from iPhone)
```

---

## 🚀 Next Steps - Phase 1: Backend

### Week 1: Cloud Functions Implementation

**Milestone 1: Job Claiming (IN PROGRESS)**
```
├─ [ ] 1. claimJob() function          ← START HERE
├─ [ ] 2. startDelivery() function
├─ [ ] 3. completeDelivery() function
├─ [ ] 4. updateLocation() function
├─ [ ] 5. getAvailableJobs() function
└─ [ ] 6. getEarnings() functions
```

**Implementation Pattern:**
```typescript
// Location: firebase/functions/src/courier/[functionName].ts

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { [RequestType], [ResponseType] } from "./types";

export const [functionName] = functions.https.onCall(
  async (request: [RequestType], context): Promise<[ResponseType]> => {
    // 1. Validate auth
    // 2. Query Firestore
    // 3. Perform business logic
    // 4. Update documents
    // 5. Return response
  }
);
```

**Testing Pattern:**
```bash
# 1. Start emulator
firebase emulators:start

# 2. Test via Firebase console
# Open http://127.0.0.1:4000/functions

# 3. Call function and verify Firestore updates
```

---

## 🔧 Development Workflow

### Starting a Session

```bash
# 1. Verify clean state
git status  # Should show only modified files, not artifacts

# 2. Kill all processes
lsof -ti:3000,5173,5174,5175,5180 | xargs kill -9

# 3. Clean artifacts
rm -rf apps/*/dist apps/*/.next .firebase

# 4. Verify ports available
lsof -i :3000,5173,5174,5175,5180 || echo "All clear"

# 5. Start emulator
firebase emulators:start

# 6. In separate terminal: run tests/development
cd apps/courier-app && pnpm dev
```

### Committing Work

```bash
# Use semantic commits
git add firebase/functions/src/courier/claimJob.ts
git commit -m "feat(courier): implement claimJob cloud function"

# For multiple changes
git add firebase/functions/src/courier/startDelivery.ts
git add firebase/functions/src/courier/__tests__/startDelivery.test.ts
git commit -m "feat(courier): implement startDelivery with tests"
```

### Architecture Decision Log

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Backend-first | Defines data structure before UI | Cleaner React hooks, type-safe |
| TypeScript strict | Catch errors early | No "any" types except deliberate workarounds |
| Firestore ownership checks | Security by default | Cloud Functions validate `context.auth.uid` |
| Real-time listeners | Live updates for couriers | Subscription-based hooks, not polling |
| socat port forwarding | Expose emulator to network | iPhone can test on same WiFi as Mac |

---

## 📚 Key Files to Know

### Firestore Schema Reference
**File:** `firebase/COURIER_SCHEMA_V2.ts`

```typescript
// Collections structure:
/couriers/{uid}                    // Courier profiles
/courierLocations/{uid}            // Real-time GPS
/jobs/{jobId}                      // Available + active jobs
/courierEarnings/{uid}             // Money tracking
/notifications/{uid}/messages/{id} // Push notifications
```

### Cloud Functions Types
**File:** `firebase/functions/src/courier/types.ts`

All request/response types for every function are here. Refer when building hooks.

### Courier App Entry Point
**File:** `apps/courier-app/src/App.tsx`

Routes:
- `/login` → Auth
- `/dashboard` → Job list + stats
- `/job/:id` → Job details
- `/active/:jobId` → Navigation in progress
- `/earnings` → Money tracking

---

## 🐛 Common Issues & Solutions

### Issue: "Dynamic import not in separate chunk"
```
Warning: directions.ts is dynamically imported but also statically imported
```
**Solution:** This is a Vite bundling optimization warning. Safe to ignore for now. Add to follow-up ticket for code splitting.

### Issue: Firebase emulator not accessible from iPhone
```
Error: auth/network-request-failed
```
**Solution:** Ensure socat port forwarding is running:
```bash
bash scripts/network-forward-emulators.sh
# Or manually:
socat TCP-LISTEN:9099,reuseaddr,bind=0.0.0.0,fork TCP:127.0.0.1:9099
```

### Issue: TypeScript strict mode errors in Cloud Functions
```
Property 'claims' does not exist on type 'DecodedIdToken'
```
**Solution:** Use interface extension or `// @ts-ignore` with comment explaining why:
```typescript
// @ts-ignore: custom claims added during user creation
const courierRole = context.auth.token.claims.role;
```

### Issue: Build getting slow/laggy
```
Bundle size: 1.5MB+ for maps
```
**Solution:** Use code splitting for Mapbox:
```typescript
const MapboxGL = lazy(() => import('mapbox-gl'));
```

---

## 🎓 Learning Resources

- **Firestore Best Practices:** https://firebase.google.com/docs/firestore/best-practices
- **Cloud Functions Patterns:** https://firebase.google.com/docs/functions/callable
- **Capacitor GPS:** https://capacitorjs.com/docs/apis/geolocation
- **Mapbox Navigation:** https://docs.mapbox.com/mapbox-gl-js/

---

## ✅ Quality Checklist

Before committing Cloud Functions:

- [ ] Function has TypeScript types (request/response)
- [ ] Function validates `context.auth` exists
- [ ] Function validates user has courier role
- [ ] Function has try/catch with proper error messages
- [ ] Function includes `console.error()` for debugging
- [ ] Function tested in Firebase Emulator UI
- [ ] Firestore updates tested in Emulator UI
- [ ] Commit message follows `feat(courier): ...` format
- [ ] No `// @ts-ignore` unless documented

---

## 📞 Getting Help

### If stuck on Cloud Functions:
1. Check `firebase/COURIER_SCHEMA_V2.ts` for data structure
2. Check `firebase/functions/src/courier/types.ts` for API contract
3. Test in Firebase Emulator UI (http://127.0.0.1:4000)
4. Check browser console for errors
5. Check Terminal for emulator logs

### If stuck on React hooks:
1. Reference existing hooks in `apps/courier-app/src/hooks/`
2. Use Firebase `onSnapshot()` for real-time updates
3. Use Firebase `getDocs()` for one-time queries
4. Always clean up listeners with unsubscribe()

### If stuck on types:
1. Look at Cloud Functions types first
2. Extend if needed in React code
3. Use `as const` for literal types
4. Never use `any` without documenting why

---

## 🔄 Phase 1 → Phase 2 Transition

**Phase 1 Complete When:**
- ✅ All 6 Cloud Functions implemented
- ✅ All functions tested in Emulator
- ✅ Security rules deployed
- ✅ Real-time listeners working

**Phase 2 Will Build:**
- React hooks consuming the APIs
- Dashboard component
- Job detail component
- Navigation component
- Photo/signature proof capture

---

## 🌳 Branch Strategy

**Main Development:** `feature/courier-app-v2-backend`
- Commits here: `feat(courier): ...`, `fix(courier): ...`, `test(courier): ...`
- Regular commits, not holding for perfection

**Before Merging to Main:**
- [ ] Run full test suite
- [ ] Manual iOS testing on real device
- [ ] Performance profile (battery, CPU, memory)
- [ ] Security review of Cloud Functions
- [ ] Code review from team

**Old Version:** `feature/courier-app-working`
- Has mobile layout fixes if needed
- Keep as reference for any borrowed patterns

---

## 📝 Last Session Summary (Jan 30, 2026)

**What We Did:**
1. ✅ Fixed Firebase emulator network accessibility (socat port forwarding)
2. ✅ Optimized courier app UI for mobile (header, navbar, spacing)
3. ✅ Decided on backend-first architectural redesign
4. ✅ Created comprehensive backend plan (COURIER_APP_V2_PLAN.md)
5. ✅ Defined Firestore schema with full TypeScript interfaces
6. ✅ Created Cloud Functions type system
7. ✅ Created new branch `feature/courier-app-v2-backend`
8. ✅ Committed all foundation files

**Build Status:** ✅ Clean, 4.30s build time, no errors
**Ports Status:** ✅ All closed and available
**Next:** 🚀 Start implementing claimJob() function

---

**This document should be updated as new features are built. Each completed Cloud Function should have notes added here.**

Last updated: January 30, 2026 @ 00:30 UTC

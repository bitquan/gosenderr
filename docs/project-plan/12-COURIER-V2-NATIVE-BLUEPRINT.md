# Courier V2 Native Blueprint (Plan D)

**Status:** Draft — Ready for execution

**Goal:** Ship a full native courier v2 (React Native iOS) alongside the current courier web app, then migrate traffic safely with feature flags.

---

## ✅ Scope (Must-Have)
- Map-first UI with live jobs and courier location
- Job lifecycle: claim → pickup → dropoff → proof photos
- Turn-by-turn navigation with ETA updates
- Background location tracking + battery-aware throttling
- Earnings dashboard + payout history
- Notifications (job alerts + status updates)
- Offline/poor network resilience (queue + retry)
- Profile, vehicle, equipment, and availability settings
- Feature flags for gradual rollout + kill switch

## 🧭 Non-Goals (V2.0)
- Android release (defer)
- Advanced route optimization (defer)
- Multi-stop batch routing beyond basic hub runs (defer)
- In-app chat (defer, keep in web app for now)

---

## 🧱 Architecture (Dual-Track)
- **Keep:** apps/courier-app (Vite + Capacitor) stable for production
- **Add:** apps/courier-ios-native (React Native)
- **Shared:** packages/shared for types, firestore models, and utilities
- **Backend:** Firebase Auth + Firestore + Functions
- **Maps:** Mapbox native iOS SDK

---

## 🚩 Feature Flags (Required)
New features must be wrapped in flags stored in Firestore `featureFlags`.

**Flags (proposed):**
- `courier_native_v2_enabled`
- `courier_native_v2_jobs`
- `courier_native_v2_navigation`
- `courier_native_v2_payouts`

**Rollout:**
1) Internal only (allowedUsers)
2) 5% of couriers
3) 25% of couriers
4) 100%

---

## 🔗 Dependencies & Prereqs
- Apple Developer account + signing
- Mapbox native token and iOS SDK setup
- Firebase iOS config (GoogleService-Info.plist)
- Push notification credentials
- QA devices with iOS 17 simulators

---

## 📅 Phase Plan (Step-by-Step)

### Phase 0 — Setup & Foundations (Week 1)
1. Create `apps/courier-ios-native` React Native project (TypeScript)
2. Add to pnpm workspace and shared tsconfig
3. Configure iOS bundle ID: `com.gosenderr.courier`
4. Add Firebase iOS config + Auth setup
5. Add Mapbox SDK + base map screen
6. Wire basic navigation (Auth → Map Shell)
7. Add feature flag loader (read-only)

**Exit Criteria:** App boots on simulator, map renders, user can sign in.

---

### Phase 1 — Core Job Flow (Week 2)
1. Jobs list overlay (nearby jobs)
2. Job preview panel (details + payout)
3. Claim job (transaction) + status changes
4. Pickup workflow + photo capture
5. Dropoff workflow + photo capture
6. Firestore updates for job status
7. Basic job history list

**Exit Criteria:** Courier can complete a job end-to-end in emulator.

---

### Phase 2 — Navigation & Tracking (Week 3)
1. Mapbox turn-by-turn navigation
2. Route polyline + ETA updates
3. Background location tracking + throttling
4. Live location sync to Firestore
5. Offline queue for updates + retry

**Exit Criteria:** Navigation works and location updates in background.

---

### Phase 3 — Earnings + Payouts (Week 4)
1. Earnings summary (daily/weekly)
2. Payout history + status
3. Stripe Connect status + onboarding link
4. Admin payout visibility validation

**Exit Criteria:** Earnings and payouts match backend data.

---

### Phase 4 — Stability, Rollout, Store (Week 5)
1. Crash handling + logging
2. Battery + performance profiling
3. App Store assets + screenshots
4. TestFlight build + internal testers
5. Feature-flag rollout plan

**Exit Criteria:** TestFlight build approved + internal rollout starts.

---

## 🧪 QA & Verification Checklist
- Auth works on first install
- Map loads in under 2 seconds
- Job claim is atomic (no double-claims)
- Pickup/dropoff photos upload correctly
- Location updates continue in background
- Navigation updates ETA live
- Earnings totals match Firestore
- Push notifications arrive on job offer

---

## 🔒 Security & Privacy
- Location permission text reviewed
- Camera permission text reviewed
- Only courier role can read/write courier job fields
- Firestore rules verified for new collections

---

## 🧭 Migration Plan
1. Keep web courier app stable
2. Release native v2 to internal couriers
3. Gradual rollout via feature flags
4. Deprecate web courier features after 4–8 weeks

---

## ✅ Phase Exit Criteria (Full V2)
- V2 handles 100% of courier jobs
- Map performance stable at 60fps on iPhone 12+
- Crash-free rate > 99.5%
- Background tracking reliable for 30+ minutes
- Payouts accurate and verified

---

## 📌 Risks & Mitigations
- **Map performance:** profile early; reduce layer count
- **Background tracking:** aggressive throttling + battery tests
- **Feature creep:** lock scope to must-have list
- **Store approval delays:** start TestFlight early

---

## 📚 Documentation & Ownership
- Keep this doc as the single source of truth
- Update `docs/project-plan/README.md`, `docs/_sidebar.md`, and root `README.md`
- Track progress weekly against phase exit criteria

# Role Simulation Plan (Customer + Courier + Vendor + Admin)

## Goal

Create a repeatable local demo that shows a full marketplace delivery flow:

1. Vendor lists an item
2. Customer orders the item and requests delivery
3. Courier claims and completes the job
4. Admin observes key artifacts

## Assumptions

- Local app runs at http://localhost:3001
- Firebase project is connected and Firestore rules are deployed
- Test users exist for each role (customer, courier, vendor, admin)

## Required Test Users

Create or verify these accounts in Firebase Auth + Firestore `users` collection:

- customer@example.com → role: customer
- courier@example.com → role: courier
- vendor@example.com → role: vendor (or seller)
- admin@example.com → role: admin

## One-Time Data Setup

### 1) Vendor onboarding

- Sign in as vendor
- Complete Stripe Connect setup (or use feature flag to bypass if needed)

### 2) Courier setup

- Sign in as courier
- Complete Courier Setup: equipment + rate card
- Ensure courier profile has `currentLocation` and `serviceRadius`

## Simulation Script (Manual)

### A) Vendor lists an item

1. Sign in as vendor
2. Go to Vendor Items → + New Item
3. Create item with:
   - Title: "Demo Item"
   - Price: $15
   - Pickup location: use a real address

### B) Customer orders item and requests delivery

1. Sign in as customer
2. Go to Marketplace → open "Demo Item"
3. Proceed to checkout
4. Confirm order and pay
5. Go to Customer Jobs / Dashboard and confirm job created

### C) Courier claims and completes job

1. Sign in as courier
2. Go to Courier Dashboard → Available Jobs
3. Claim the job
4. Mark progress until completion

### D) Customer confirms delivery

1. Sign in as customer
2. Open the job detail
3. Confirm delivery (if required by flow)

### E) Admin verification

1. Sign in as admin
2. Review Packages / Users / Routes (as applicable)

## Optional Automated Setup (Next Step)

Use the automated seed script:

```bash
node scripts/seed-role-simulation.js
```

Optional env override:

```bash
DEMO_PASSWORD="DemoPass123!" node scripts/seed-role-simulation.js
```

If you are running outside Google Cloud, set credentials:

```bash
export FIREBASE_PROJECT_ID="gosenderr-6773f"
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccount.json"
node scripts/seed-role-simulation.js
```

The script:

- Creates demo users in Firebase Auth
- Upserts their Firestore `users` docs
- Creates a vendor item
- Creates a marketplace order
- Creates an open courier job

## Success Criteria

- Order visible in vendor orders
- Job visible in customer jobs
- Job visible and claimable by courier
- Admin sees updated counts

## Known Dependencies

- Firestore rules allow marketplaceOrders read/write for buyer/seller
- Jobs collection rules allow customer/courier reads and updates

## Open Questions

- Use Stripe test keys or bypass payments?
- Should we auto-complete job status transitions in the script?

## Testing & Tools

- The UI tests and unit tests mock Firestore snapshots; use the provided helper in the repo at `apps/admin-app/src/tests/firestoreMock.ts` to obtain consistent `DocumentSnapshot` and `QuerySnapshot` shapes (`data()` method for documents and `docs` array for queries).
- Functions integration tests should invoke exported handlers (e.g., `runSystemSimulationHandler`) directly when possible to avoid network-dependent flaky behavior.
- Add a CI job that starts the emulators and runs both the functions integration tests and the frontend Vitest suite to catch regressions.

# Role Simulation Plan (Customer + Courier + Seller + Admin)

## Goal

Create a repeatable local demo that shows a full marketplace delivery flow:

1. Seller lists an item
2. Customer orders the item and requests delivery
3. Courier claims and completes the job
4. Admin observes key artifacts

## Assumptions

- Local app runs at http://localhost:3001
- Firebase project is connected and Firestore rules are deployed
- Test users exist for each role (customer, courier, seller, admin)

## Required Test Users

Create or verify these accounts in Firebase Auth + Firestore `users` collection:

- customer@example.com → role: customer
- courier@example.com → role: courier
- seller@example.com → role: seller
- admin@example.com → role: admin

## One-Time Data Setup

### 1) Seller onboarding

- Sign in as seller
- Complete Stripe Connect setup (or use feature flag to bypass if needed)

### 2) Courier setup

- Sign in as courier
- Complete Courier Setup: equipment + rate card
- Ensure courier profile has `currentLocation` and `serviceRadius`

## Simulation Script (Manual)

### A) Seller lists an item

1. Sign in as seller
2. Go to Seller Items → + New Item
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
- Creates a seller item
- Creates a marketplace order
- Creates an open courier job

## Success Criteria

- Order visible in seller orders
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

### FIREBASE_TOKEN in CI

To allow Firebase CLI operations that require authentication (and to avoid emulator warnings), add a repository secret named `FIREBASE_TOKEN` containing a token obtained from `firebase login:ci` (or prefer a GCP service account for scoped permissions). Example validation step in GitHub Actions:

```yaml
- name: Validate FIREBASE_TOKEN (if provided)
  if: ${{ secrets.FIREBASE_TOKEN }}
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
  run: firebase projects:list --token "$FIREBASE_TOKEN" --format=json || (echo "FIREBASE_TOKEN invalid" && exit 1)
```

This step ensures the token is valid and will fail early with a clear message if not.

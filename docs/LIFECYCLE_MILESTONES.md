# Senderr Lifecycle Canonical Map + Milestones

Last updated: 2026-02-09

## Goal
- Use one lifecycle vocabulary across app UI, Firestore rules, and Cloud Functions.
- Enforce ownership of every transition (who can move which state).
- Prevent drift between client assumptions and backend truth.

## Canonical Lifecycles

### 1) Delivery Job Lifecycle (`deliveryJobs.status`, legacy `jobs.status`)
Canonical states:
1. `open`
2. `assigned`
3. `enroute_pickup`
4. `arrived_pickup`
5. `picked_up`
6. `enroute_dropoff`
7. `arrived_dropoff`
8. `completed`
9. `cancelled` (terminal)
10. `disputed` (terminal unless admin override)

Allowed transitions:
1. `open -> assigned | cancelled`
2. `assigned -> enroute_pickup | cancelled`
3. `enroute_pickup -> arrived_pickup | cancelled`
4. `arrived_pickup -> picked_up | cancelled`
5. `picked_up -> enroute_dropoff | cancelled`
6. `enroute_dropoff -> arrived_dropoff | cancelled`
7. `arrived_dropoff -> completed | cancelled`
8. `completed -> disputed`

Transition ownership:
1. `open -> assigned`: courier (claim) or admin
2. `* -> cancelled`: creator/admin under policy
3. Progression states: assigned courier only
4. `completed -> disputed`: customer or admin

### 2) Delivery Payment Lifecycle (`paymentStatus`)
Canonical states:
1. `pending`
2. `authorized`
3. `captured`
4. `refunded`
5. `failed`

Allowed transitions:
1. `pending -> authorized | failed`
2. `authorized -> captured | refunded | failed`
3. `captured -> refunded` (admin/system policy only)

Transition ownership:
1. `pending/authorized`: Stripe callback + server function
2. `captured`: system trigger after delivery confirmation
3. `refunded`: cancel/refund flow (system/admin)

### 3) Courier Onboarding Lifecycle (`users/{uid}.courierProfile.status`)
Canonical states:
1. `draft`
2. `pending_review`
3. `approved`
4. `active`
5. `rejected`
6. `suspended`
7. `banned`

Allowed transitions:
1. `draft -> pending_review`
2. `pending_review -> approved | rejected`
3. `approved -> active`
4. `active -> suspended | banned`
5. `rejected -> pending_review` (resubmission)
6. `suspended -> active | banned`

Transition ownership:
1. `draft -> pending_review`: courier submit
2. `pending_review -> approved/rejected`: admin only
3. `approved -> active`: system post-checks or admin
4. Enforcement states (`suspended`, `banned`): admin/system only

### 4) Package Runner Lifecycle (`users/{uid}.packageRunnerProfile.status`)
Canonical states:
1. `draft`
2. `pending_review`
3. `approved`
4. `rejected`
5. `suspended`

Allowed transitions:
1. `draft -> pending_review`
2. `pending_review -> approved | rejected`
3. `approved -> suspended`
4. `rejected -> pending_review` (resubmission)
5. `suspended -> approved | rejected`

Transition ownership:
1. Applicant can only submit/resubmit
2. Admin approves/rejects/suspends
3. Claims set only from Cloud Functions

### 5) Marketplace Order Lifecycle (`orders.status` and/or `marketplaceOrders.status`)
Canonical states:
1. `pending_payment`
2. `paid`
3. `pending_assignment`
4. `assigned`
5. `in_transit`
6. `delivered`
7. `cancelled`
8. `payment_failed`

Allowed transitions:
1. `pending_payment -> paid | payment_failed | cancelled`
2. `paid -> pending_assignment | assigned`
3. `pending_assignment -> assigned | cancelled`
4. `assigned -> in_transit | cancelled`
5. `in_transit -> delivered | cancelled`

Transition ownership:
1. Payment states from webhook/system only
2. Fulfillment states from seller/courier/admin via server commands
3. Clients never write lifecycle-critical states directly

## Milestones

Execution rule:
1. Do not start a milestone until all exit criteria from the previous milestone are met.
2. If blocked, unblock in the current milestone rather than skipping ahead.

## Milestone 1: Freeze Canonical Vocabulary
Why now:
1. Every downstream rule/function/test depends on stable status names.

Exit criteria:
1. Shared type exports include canonical statuses for all five lifecycles.
2. Deprecation map is documented (`pending` -> `pending_review`, etc.).
3. UI status badges use canonical values only.

Implementation steps:
1. Update shared types in `packages/shared/src/types/firestore.ts`.
2. Add a single `statusConstants` module used by app + functions.
3. Replace ad hoc strings in app pages/hooks with constants.

## Milestone 2: Enforce Transition Guards Server-Side
Depends on:
1. Milestone 1 complete.

Why now:
1. Guard logic is only reliable once status vocabulary is frozen.

Exit criteria:
1. Firestore rules permit only valid next states.
2. Rules constrain `affectedKeys()` for lifecycle writes.
3. Direct client writes to privileged transitions are blocked.

Implementation steps:
1. Add reusable transition helper functions in Firestore rules.
2. Restrict `deliveryJobs`, `jobs`, `orders`, `routes` update fields.
3. Deny role/status escalation in direct `users` writes.

## Milestone 3: Move Lifecycle Commands to Cloud Functions
Depends on:
1. Milestone 2 complete.

Why now:
1. Commands should sit on top of already-tightened rule boundaries.

Exit criteria:
1. State changes happen through callable/onRequest commands.
2. Functions validate role + current state + next state atomically.
3. Client performs command calls instead of raw status writes.

Implementation steps:
1. Add command endpoints (example: `claimJob`, `advanceJob`, `reviewCourier`, `reviewRunner`, `advanceOrder`).
2. Use transactions for compare-and-set transitions.
3. Emit normalized audit log event per transition.

## Milestone 4: Data Migration + Compatibility Window
Depends on:
1. Milestone 3 complete.

Why now:
1. Migrations should target final transition model, not intermediate behavior.

Exit criteria:
1. Existing docs mapped to canonical statuses.
2. Backfill complete for legacy collections.
3. Dual-read compatibility removed after validation window.

Implementation steps:
1. Add migration script for old status values.
2. Add temporary adapter in reads for legacy values.
3. Remove adapter after all docs migrated and verified.

## Milestone 5: Lifecycle Test Gate
Depends on:
1. Milestone 4 complete.

Why now:
1. Final gate should validate the completed architecture, not a partial state.

Exit criteria:
1. Rules tests cover allow/deny for every transition edge.
2. Function tests cover success/failure per command.
3. CI blocks merges on lifecycle regression.

Implementation steps:
1. Add transition matrix tests for Firestore rules.
2. Add integration tests for payment + webhook + capture/refund sequence.
3. Add a CI job that runs lifecycle suite on every PR.

## Tracking Template
Use this per milestone:
1. Owner
2. Branch / PR
3. Test evidence link
4. Rollout date
5. Rollback strategy

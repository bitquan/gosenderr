# Job Lifecycle Worktree Plan

**Feature slug:** `job-lifecycle`

## Goal
Provide a canonical, well-tested job lifecycle implementation (status state machine, client and server guards, tests, and e2e flows) across Senderr web and Courier native apps.

## Scope
- Implement and test status transitions (accept → enroute_pickup → arrived_pickup → picked_up → enroute_dropoff → arrived_dropoff → delivered).
- Ensure server-side rules and cloud functions are authoritative and consistent with client logic.
- Add Playwright e2e tests for web courier flows and expand native integration tests.
- Add migration/normalization if we canonicalize `jobs` vs `deliveryJobs`.

## Files to update
- `apps/senderr-app/src/lib/v2/status.ts` (verify/enhance helpers)
- `apps/senderr-app/src/pages/jobs/*` (ensure UI actions match new transitions)
- `apps/courieriosnativeclean/src/services/jobTransitionRules.ts` (sync rules)
- `firebase/firestore.rules` & `firebase/functions/src/triggers/*` (ensure canonical collection)
- `tests/e2e/courier-lifecycle.spec.ts` (Playwright) & native integration tests

## Acceptance criteria
- Unit tests for state machine pass (web & native).
- Playwright e2e demonstrates a full lifecycle end-to-end against emulators.
- Cloud Functions unit tests updated & pass locally.
- Docs: `docs/senderr_app/job-lifecycle-worktree-plan.md` present and updated.

## Verification
1. Run firebase emulators and seed a job in `open` state. 2. Run Playwright test; verify Firestore status updates and UI transitions. 3. Run native integration tests for queueing & offline scenarios.

---

# BAT-035 Job Lifecycle Resilience Disposition

Date: 2026-02-17
Branch: `bat035/job-lifecycle-resilience`

## Scope

Finalize senderr courier lifecycle lane with explicit command-state handling across:

- feed accept action
- job detail lifecycle actions (`start pickup -> arrived -> pickup -> start dropoff -> complete`)
- loading/retry/offline/error UX states

## Gaps Found

1. Feed accept action loading state was declared but not set before command execution.
2. Feed accept failures used `alert()` instead of explicit inline error/retry state.
3. Lifecycle status updates from job detail did not pass actor UID into the backend transaction guard.

## Action Taken

1. Patched feed accept command in `dashboard/page.tsx` to:
   - set and clear per-command loading (`acceptingJobId`)
   - handle offline attempts explicitly
   - capture accept error in UI state
   - expose retry for the last failed accept command
2. Patched courier lifecycle command action in `CourierJobActions.tsx` to pass `courierUid` into `updateJobStatus(...)` so the transaction-level ownership guard is enforced.

## Verification

- `pnpm --filter @gosenderr/senderr-app build` passes after BAT-035 changes.
- Feed now renders explicit accept command failure card with retry.
- Job lifecycle status transition command now includes actor UID guard path.

## Files

- `apps/senderr-app/src/pages/dashboard/page.tsx`
- `apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx`

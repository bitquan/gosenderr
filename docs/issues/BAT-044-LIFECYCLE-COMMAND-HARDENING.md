# BAT-044 — Lifecycle Command Hardening

Status: done  
Date: 2026-02-17  
Branch: `senderrplace/local/baseline-sync-2026-02-17`

## Objective

Move launch-critical courier lifecycle command handling to server-side callables and remove direct client authority over claim/status transitions.

## Scope

- In scope: `apps/senderr-app`, `firebase/functions`, launch web/admin surfaces only.
- Out of scope: iOS-native workflows (deferred to V2 by branch policy).

## Changes

1. Exported lifecycle callables from Functions index:
   - `claimCourierJob`
   - `advanceCourierJobStatus`
   - `cancelCourierJob`
   - `declineCourierJobOffer`
2. Exported telemetry callable:
   - `logCommandFailure`
3. Migrated senderr web lifecycle path (`claimJob`, `updateJobStatus`) to call Firebase callable commands instead of direct Firestore transaction writes.
4. Updated UI callsites to handle callable outcomes in:
   - `MapShellScreen`
   - `dashboard/page`
   - `CourierJobActions`

## Evidence

- `firebase/functions/src/index.ts`
- `apps/senderr-app/src/lib/v2/jobs.ts`
- `apps/senderr-app/src/screens/MapShellScreen.tsx`
- `apps/senderr-app/src/pages/dashboard/page.tsx`
- `apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx`

## Validation

- `cd firebase/functions && pnpm build` ✅
- `pnpm --filter @gosenderr/senderr-app build` ✅
- `pnpm --filter @gosenderr/marketplace-app exec vitest run` ✅
- `pnpm --filter @gosenderr/admin-app build` ✅
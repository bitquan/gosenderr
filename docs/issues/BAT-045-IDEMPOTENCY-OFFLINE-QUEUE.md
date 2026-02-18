# BAT-045 — Idempotency + Offline Command Queue

Status: done  
Date: 2026-02-17  
Branch: `senderrplace/local/baseline-sync-2026-02-17`

## Objective

Harden courier lifecycle commands against duplicate submission and connectivity loss by adding idempotency keys server-side and an offline queue client-side.

## Changes

### Server-side idempotency

- Added optional `idempotencyKey` support to:
  - `claimCourierJob`
  - `advanceCourierJobStatus`
  - `cancelCourierJob`
- Added deterministic command receipt storage in Firestore (`courierCommandReceipts`) keyed by caller + command + job + idempotency key.
- Added replay behavior: repeated requests with same idempotency key return cached success payload (`idempotentReplay: true`).

### Client-side offline queue

- Added lifecycle queue in senderr web (`localStorage`):
  - queue key: `senderr.lifecycle.command.queue.v1`
  - queues claim/status/cancel commands when offline-like errors occur
  - auto-flush on `online` event
  - explicit `flushLifecycleCommandQueue()` utility
- Added lifecycle failure telemetry calls to `logCommandFailure` (best effort) for accept/status/cancel failures.
- Updated UI action handlers to show queued/offline messaging instead of generic failure where applicable.

## Evidence

- `firebase/functions/src/http/courierJobCommands.ts`
- `apps/senderr-app/src/lib/v2/jobs.ts`
- `apps/senderr-app/src/screens/MapShellScreen.tsx`
- `apps/senderr-app/src/pages/dashboard/page.tsx`
- `apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx`
- `apps/senderr-app/src/features/jobs/customer/CustomerJobActions.tsx`
- `firebase/functions/src/http/logCommandFailure.ts`

## Validation

- `cd firebase/functions && pnpm build` ✅
- `pnpm --filter @gosenderr/senderr-app build` ✅
- `pnpm --filter @gosenderr/marketplace-app exec vitest run` ✅
- `pnpm --filter @gosenderr/admin-app build` ✅
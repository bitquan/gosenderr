# Jobs Schema Migration Path

This document defines how job payload changes move through the Senderr iOS app without breaking existing builds.

## Current boundary

- Firestore schema is translated in one place:
  - `apps/courieriosnativeclean/src/services/jobsService.ts` via `mapFirestoreJob(...)`
- UI and screen logic consume normalized model only:
  - `apps/courieriosnativeclean/src/types/jobs.ts`
- Access path is through the jobs repository port:
  - `apps/courieriosnativeclean/src/services/ports/jobsPort.ts`

## Rule for future schema changes

1. Add new Firestore fields behind optional reads in `mapFirestoreJob(...)`.
2. Extend normalized `Job` type only after mapping exists.
3. Keep old Firestore keys readable for at least one release window.
4. Add adapter-level tests that cover both old and new payload shapes.
5. Remove old key support only after backend rollout is complete.

## Example migration pattern

- Backend changes `pickup.label` to `pickup.displayName`.
- Migration steps:
  1. Update mapper to read `pickup.displayName ?? pickup.label`.
  2. Keep output field in normalized model stable (`pickupAddress`).
  3. Add tests for both payload variants.
  4. After rollout + verification, remove `pickup.label` fallback.

## Realtime sync safety notes

- Jobs listener should continue emitting normalized `Job[]` even when snapshots are cache-backed.
- Stale/reconnect state must be surfaced via `JobsSyncState`; no screen should infer network state from raw Firestore metadata.
- Production mode must not silently switch to seed jobs when Firestore reads fail.

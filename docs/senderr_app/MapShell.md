# MapShell (Courier iOS)

Summary

- The MapShell view provides a courier-facing route-focused workflow: accept/claim → pickup → en route → dropoff/delivered.
- This change improves job state transition reliability (transactional updates + queued offline updates), pickup/dropoff proof support, and reconnect/resync resilience.

Behavior

- Job status transitions use a strict finite-state-machine in `src/services/jobTransitionRules.ts` and are enforced in `jobsService.updateJobStatus`.
- When offline or on transient network failures updates are queued in local storage (`STATUS_UPDATE_QUEUE_KEY`) and flushed once connectivity is restored.
- Jobs that require proof are detected by `mapShellOverlayController` (notes containing `proof`, `photo`, or `signature`). The UI will present a `proof_required` state and guidance to capture proof.

Files touched

- `apps/courieriosnativeclean/src/services/jobsService.ts`
- `apps/courieriosnativeclean/src/screens/MapShellScreen.tsx`
- `apps/courieriosnativeclean/src/screens/mapShellOverlayController.ts`

Manual test checklist (handoff)

1. Start the emulator or device and sign in as a courier account.
2. Seed feature flags so `delivery.mapShell` is enabled (Admin Web or Firestore seed job).
3. Observe an assigned job in MapShell, then perform: claim → pickup → delivered.
   - At each step ensure status transitions succeed and UI shows confirmation.
4. Test proof-required flow: create a job with notes containing "Photo proof required" and attempt to complete delivery; the app should request photo proof and block completion until proof is captured.
5. Test offline resilience: toggle network off during a status update, ensure update is queued, then re-enable network and verify queued update is flushed to Firestore.

Notes

- If lint fails locally for the courier app due to ESLint toolchain mismatch, run `pnpm install` from the repo root to update the lockfile, then rerun `pnpm --filter courieriosnativeclean run lint`.

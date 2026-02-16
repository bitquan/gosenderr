# Jobs System

## Purpose
- Track available, assigned, and in-progress courier jobs, including optimistic state changes and retry logic when Firestore transactions or network links fail.
- Surface status change flows (arrive pickup/dropoff, start/complete, proof upload) through the shared `jobsService` clients and view models.

## Architecture & Flow
1. `jobsService` (`src/services/jobsService.ts#L1-L400`) orchestrates optimistic status updates, Firestore transactions, offline queueing under `STATUS_UPDATE_QUEUE_KEY`, and watchers for user-specific job lists.
2. Job data flows into view models (`jobsViewState`, `mapShellOverlayController`) which normalize customer/profile info before reaching screens like `MapShellScreen` and `JobDetailScreen`.
3. Status transitions honor `NEXT_STATUS` defined in `src/types/jobs.ts`, and feature flags gate UI actions such as job status shortcuts.

## Key entry points
- `jobsService.updateJobStatus` – accepts a job ID plus target status, tries Firestore transaction, then enqueues on connectivity failure; used by `JobDetailScreen` and the job queue (`src/screens/JobDetailScreen.tsx`).
- Real-time subscriptions: `jobsService.subscribeJobs` keeps job arrays up to date for the dashboard (`JobsScreen`) and map shell.
- Local overrides stored in `MapShellScreen` (`localStatusOverrides`) ensure the UI reflects optimistic changes even while background updates arrive.

## Dependencies
- Firestore adapters in `src/services/adapters` for persistence.
- `featureFlagsService` to toggle job actions (e.g., jobStatusActions flag).
- `JobsSyncState` to show sync indicators when Firestore reconnect/retry occurs.

## Testing
- Unit tests under `src/services/__tests__/jobsService.test.ts` cover queue flushing and retry semantics.
- Emulator integration tests (`src/services/__integration__/jobs.emulator.integration.test.ts`) validate Firestore behavior when targeting Firebase emulators.

## Current implementation notes
- Offline resilience is handled via `STATUS_UPDATE_QUEUE_KEY` and helper `enqueueStatusUpdate`, so even when transactions fail the queued updates run later.
- `jobsService` exposes `setLocalStatusOverride` for UI components to display in-progress states before Firestore confirms.
- Job arrays consumed by screens keep `activeJob` at index 0, with `swipableJobs` enabling manual focus switching in `MapShellScreen` when multiple jobs exist.
# Backend Stabilization Plan

## Goal
Create a reliable backend foundation for Senderr so the mobile UI can work against predictable, tested services without being blocked by flaky or missing behavior.

## Scope
- Ensure Firebase services (Auth, Firestore, Storage) are initialized and mocked consistently.
- Harden the jobs/status pipelines (transactions, retry queue). 
- Provide easy local tooling (emulator commands, seeds, mocks) so front-end work can iterate without backend regressions.

## Technical Objectives
1. **Firebase Initialization & Adapter Consistency**
   - Confirm `initializeFirebase` is idempotent and reachable from `App.tsx`, `authService`, and shared helpers.
   - Update adapters in `src/services/adapters` to share a common pattern for injecting Firebase handles; document required env/runtime overrides.
   - Expand runtime flags (`config/runtime.ts`) with backend feature toggles (e.g., `allowMockAuth`, `useEmulator`) and surface them to all services.

2. **Jobs Transaction Pipeline**
   - Review `jobsService.updateJobStatus` for proper error handling/fallbacks (`STATUS_UPDATE_QUEUE_KEY` queue). Add logging or metrics to detect repeated failures.
   - Add tests (unit or integration) that spin up Firestore emulator, seed sample job, and simulate `updateJobStatus`. Ensure queue drain works.
   - Document the expected Firestore rules/collections (jobs, status queue) so contributors know how data is structured.

3. **Authentication Flow**
   - Centralize mock vs Firebase auth logic inside `authService` and ensure `AuthContext` only depends on the abstract contract. 
   - Add a local dev path where mock auth tokens are rotated via runtime config, and document how to seed `/config/env` for emulator usage.
   - Validate `LoginScreen` fallback credentials and provide guidance for switching to real Firebase once backend is unblocked.

4. **Local Emulator & Seed Workflows**
   - Document existing emulator commands (tasks `1) Firebase Emu (Demo)`/`2) Firebase Emu (Gosenderr)`) in `docs/emulators.md` (or this plan). Provide cheat sheet for starting/stopping/reseting, seeding jobs, and pointing app at emulator.
   - Ensure `scripts/seed-courier-emulator.js` (or equivalent) seeds consistent jobs, and the plan outlines how to re-run seeds after schema changes.
   - Provide a checklist for backend readiness: (1) emulator up, (2) jobs seeded, (3) runtime config pointing to emulator, (4) mock auth disabled/enabled as needed.

## Testing & Validation
- Add unit/integration coverage for `jobsService` and `authService` that run against emulator wiring.
- Build a `pnpm test:backend` script if needed with `FIREBASE_PROJECT_ID=gosenderr-6773f pnpm test` filtering backend suites.
- Run `pnpm test src/services/__integration__/jobs.emulator.integration.test.ts` after seeds to ensure backend logic works.

## Next Steps for UI Team
- Once backend stability is confirmed, track accepted change list for frontend (manual map gestures, panel UX, job detail flow).
- Keep `docs/v1-systemdocs` updated with any new backend endpoints/collections the UI depends on.
- Schedule a handoff review after this backend plan is implemented so the front-end team can consume the improved services without guessing.
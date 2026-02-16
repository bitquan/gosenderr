# GitHub Copilot instructions for Senderr (mobile courier)

Purpose: give an AI coding agent the minimal, high‑value knowledge to be productive immediately in this repo.

## Big picture (what this app is)
- React Native (TypeScript) courier app for Senderr. Entry: `App.tsx` → UI screens in `src/screens/` → components in `src/components/`.
- Domain/service split: UI + viewModels → `src/services/*` (Firebase adapters, jobs logic, feature flags, auth). ServiceRegistry wires implementations.
- Data layer: Firestore via `src/services/firebase.ts` and adapters (`src/services/adapters/*`). Offline/queue fallbacks live in `src/services/jobsService.ts`.
- Native integrations: iOS native code in `ios/Senderrappios/` (notifications module + `GoogleService-Info.plist`).

## Primary hotspots (start here for features/bugs)
- Job accept / status flow: `src/screens/JobDetailScreen.tsx`, `src/screens/MapShellScreen.tsx`, `src/services/jobsService.ts` (transaction + queue fallback), `src/types/jobs.ts` (`NEXT_STATUS`).
- Auth & session: `src/context/AuthContext.tsx`, `src/services/authService.ts` (mock auth controlled by runtime config).
- Feature flags: `src/services/featureFlagsService.ts` (flags used to gate UI like `jobStatusActions`).
- Firebase setup & emulators: `src/services/firebase.ts`; runtime config in `src/config/runtime.ts`.
- Service wiring: `src/services/serviceRegistry.ts` (how implementations are injected).

## Important repo conventions & patterns
- Use `pnpm` scripts (see `package.json`). Prefer existing service adapters (don't bypass `serviceRegistry`).
- Feature flags are authoritative for UI gating (check `featureFlagsService` before UI logic).
- jobsService uses optimistic/local persistence + Firestore transaction + queued retry on connectivity errors — look for `STATUS_UPDATE_QUEUE_KEY`.
- Tests: unit tests under `src/**/__tests__`; integration under `src/services/__integration__` (emulator-backed).
- Mock auth: enabled via runtime (`SENDERR_ALLOW_MOCK_AUTH` / `runtimeConfig.allowMockAuth`). Default login in `LoginScreen.tsx` uses `courier@example.com / DemoPass123!` when mock auth is on.

## Exact commands & VS Code tasks (run these)
- Start Metro (reset cache): `npx react-native start --reset-cache` (VS Code task: **4) iOS Metro (Reset Cache)**)
- Run iOS app (simulator/device): `pnpm ios` or `npx react-native run-ios --scheme Senderr` (task **5) iOS Run (Senderr)** / **6) Open Xcode Workspace**)
- Firebase emulators (gosenderr or demo): use VS Code tasks **1) Firebase Emu (Gosenderr)** or **2) Firebase Emu (Demo)** — equivalent CLI: `pnpm exec firebase emulators:start --project gosenderr-6773f --only firestore,auth,storage,functions`.
- Seed emulator data: run task **3) Seed 25 Jobs (Gosenderr VA/DC)** or from monorepo root (example):
  - FIREBASE_PROJECT_ID=gosenderr-6773f SEED_REPLACE=1 SEED_JOBS_COUNT=25 pnpm run seed:emulator:replace
- Lint / tests:
  - `pnpm lint`
  - `pnpm test` (unit), `pnpm test:unit`, `pnpm test:integration` (emulator integration)

## How to reproduce and debug the courier "accept job" flow
1. Start Firebase emulator (task **1**) and seed jobs (task **3**).
2. Start Metro and run iOS simulator (`pnpm ios`).
3. Sign in (mock auth possible): `courier@example.com / DemoPass123!`.
4. Inspect flow: UI button → `JobDetailScreen` calls `jobsService.updateJobStatus` → service attempts Firestore transaction → falls back to enqueueing (`STATUS_UPDATE_QUEUE_KEY`) on connectivity.

Key places to inspect for a broken accept flow:
- `NEXT_STATUS` mapping in `src/types/jobs.ts` (invalid mapping can disable transitions)
- `featureFlagsService` value `jobStatusActions` (if false UI disables the button)
- `jobsService.updateJobStatus` transaction & queue logic (see `STATUS_UPDATE_QUEUE_KEY`, queue enqueue/dequeue and `isLikelyConnectivityError`)
- Unit/integration tests in `src/services/__tests__` and `src/services/__integration__` for expected behavior

## Testing & where to add coverage
- Unit tests: `src/screens/__tests__` and `src/services/__tests__` — mock `serviceRegistry` when testing UI.
- Integration tests that exercise Firestore/emulator: `src/services/__integration__/*` (use `jobs.emulator.integration.test.ts`).
- When changing job status logic, add tests to `jobsService.test.ts` and an emulator integration covering `updateJobStatus` readback/transaction fallbacks.

## Quick search keywords for common tasks
- updateJobStatus, NEXT_STATUS, jobStatusActions, STATUS_UPDATE_QUEUE_KEY, JobsSubscription, subscribeJobs, serviceRegistry, isMockAuthEnabled

## Do / Don't (project-specific)
- ✅ Do use `serviceRegistry` adapters for cross-cutting concerns (auth, jobs, notifications)
- ✅ Do run emulator + seed before running integration tests
- ❌ Don’t edit generated iOS Pod files or `Pods/` directly
- ❌ Don’t assume production Firebase credentials are present — use emulators for development

---
Feedback? Tell me which section is unclear or needs more examples and I’ll refine this file. 🙋‍♂️

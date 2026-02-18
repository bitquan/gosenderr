Summary (what changed):
- Stabilize MapShell lifecycle for courier iOS: reliable job state transitions, offline status queueing/flush, pickup/dropoff proof flow, reconnect/resync hardening.

Why:
- Fixes flaky job status sync and proof-required flows; improves resilience to intermittent connectivity and ensures customer-visible status sync.

How to test:
1. Manual: follow docs/senderr_app/MapShell.md for step-by-step checks (start route, simulate offline, complete pickup with proof, reconnect and verify status sync).
2. Automated: run pnpm --filter ./apps/courieriosnativeclean run test:unit (6 suites, 28 tests, all passed locally).

Risks / Rollback:
- Low risk (isolated to courier iOS). Rollback: revert branch commits.

Handoff:
- [x] `handoff: updated` (ran bash scripts/dev-handoff.sh and committed docs/dev/SESSION_STATE.md & docs/dev/WORKLOG.md)

Files changed (high level):
- apps/courieriosnativeclean/src/services/jobsService.ts
- apps/courieriosnativeclean/src/screens/MapShellScreen.tsx
- docs/senderr_app/MapShell.md
- apps/senderr-app/src/pages/AdminFeatureFlags.tsx
- apps/courieriosnativeclean/package.json & pnpm-lock.yaml

Summary:
- Stabilize MapShell lifecycle: reliable job state transitions, offline queueing/flush, pickup/dropoff proof flow, reconnect/resync hardening.

Changes:
- courier iOS: `jobsService` (queueing, flush, connectivity handling), `MapShellScreen` UI & route handling, overlay controller proof detection.
- Added `docs/senderr_app/MapShell.md` with QA checklist.
- Lint fixes and config adjustments scoped to `apps/courieriosnativeclean`.

Tests:
- Unit tests: courier iOS unit tests passed locally (6 suites, 23 tests).
- Lint: courier iOS lint runs without errors (warnings only) after aligning ESLint and @typescript-eslint versions.

Why:
- Fixes flaky job status sync and proof-required flows; improves resilience to intermittent connectivity and ensures customer-visible status sync.

Notes:
- Updated `pnpm-lock.yaml` since dev deps required lockfile changes.

Risks / Rollback:
- Low risk (isolated to courier iOS). Rollback: revert branch commits.

Handoff:
- [x] `handoff: updated` (I ran `bash scripts/dev-handoff.sh --summary "stabilize MapShell" --next "Open PR: codex/issue-265-turn-by-turn-camera -> senderr_app" --status in_progress --issue "#265" --files "apps/courieriosnativeclean/src/services/jobsService.ts,apps/courieriosnativeclean/src/screens/MapShellScreen.tsx,docs/senderr_app/MapShell.md"` and updated `docs/dev/SESSION_STATE.md` + `docs/dev/WORKLOG.md`)

Manual QA:
- See `docs/senderr_app/MapShell.md` for step-by-step verification.

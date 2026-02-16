# Branch Profile: `codex/issue-266-bg-tracking-6h`

## Intent

- Branch mode: `issue`
- Product area: `senderr-ios` (apps/courieriosnativeclean)

## Scope

- Primary paths:
  - `apps/courieriosnativeclean/src/services/locationUploadService.ts`
  - `apps/courieriosnativeclean/src/services/__tests__/*`
  - `apps/courieriosnativeclean/src/services/__integration__/*`
- Avoid touching unrelated apps or packaging behavior unless necessary.

## Canonical references

- `docs/DEVELOPER_PLAYBOOK.md`
- `docs/senderr_app/BRANCHING.md`
- `docs/BLUEPRINT.md`

## Branch deltas (this branch only)

- Add **persistent location upload queue** to handle background location uploads.
- Add **telemetry + analytics adapter integration** for location upload lifecycle events.
- Add **exponential backoff + retry scheduling** for failed uploads and a retry policy configuration.
- Add **unit tests** + **emulator integration test** for upload flush behavior and a retry test (service-level).
- Add a **nightly CI job** that runs Firestore-emulator-based integration tests on schedule.

Target cleanup date: **before merge to `senderr_app`** (remove or promote deltas into canonical docs as needed).

## Build and test commands

- Unit tests: `pnpm --filter courieriosnativeclean test:unit`
- Integration: `pnpm --filter courieriosnativeclean test:integration`

## Git workflow for this branch

- Start from the latest `senderr_app` branch.
- Keep a single focused issue branch; one PR to `senderr_app`.
- Use conventional commit messages and squash merge into `senderr_app` when ready.

## Done criteria

- Unit + integration tests are green in CI (including emulator job).
- PR merged to `senderr_app` and branch removed.
- Behavior changes with lasting impact promoted to canonical docs in `docs/`.

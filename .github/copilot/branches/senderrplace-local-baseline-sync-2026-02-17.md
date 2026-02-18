# Branch Profile: `senderrplace/local/baseline-sync-2026-02-17`

## Intent

- Branch mode: `feature`
- Product area: `Senderr Web + Senderrplace + Admin`

## Scope

- Primary paths:
  - `apps/senderr-app`
  - `apps/marketplace-app`
  - `apps/admin-app`
  - `packages/shared` (only when required by the three apps)
  - `firebase/functions` (only when required by the three apps)

- Out of scope for this branch (defer to V2 unless explicitly requested):
  - `apps/courieriosnativeclean`
  - iOS-native simulator/build workflows
  - non-launch surfaces outside Senderr Web, Senderrplace, and Admin

## Build and test commands

- `pnpm --filter @gosenderr/senderr-app build`
- `pnpm --filter @gosenderr/marketplace-app exec vitest run`
- `pnpm --filter @gosenderr/admin-app build`

## Git workflow for this branch

- Work only in this branch unless explicitly requested to switch.
- Keep commits scoped to this branch purpose.
- Use conventional commit messages with a clear scope.
- Push back to the same branch by default.

## Done criteria

- Changes touch only in-scope surfaces unless explicitly approved.
- Senderr Web, Senderrplace, and Admin lanes remain build/test green.
- This profile stays current when branch purpose changes.

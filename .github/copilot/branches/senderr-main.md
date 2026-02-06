# Branch Profile: `senderr/main`

## Intent

- Branch mode: `mainline`
- Product area: `Senderr Courier App`
- Role: stable delivery branch for senderr web courier workflows.

## Scope

- Primary paths:
  - `apps/courier-app`
  - `packages/shared` (only when needed by senderr features)
- Keep iOS-native work in `senderr-ios/*` unless requested.

## Build and test commands

- `pnpm --filter @gosenderr/courier-app dev`
- `pnpm --filter @gosenderr/courier-app build`
- `pnpm --filter @gosenderr/courier-app preview`

## Git workflow for this branch

- Branch-scoped commits only.
- Example commit:
  - `fix(senderr): resolve courier job list loading state`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "fix(senderr): <summary>"`

## Done criteria

- Courier workflow changes are verified locally.
- Branch stays focused on senderr web app scope.


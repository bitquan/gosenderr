# Branch Profile: `senderr/main`

## Intent

- Branch mode: `mainline`
- Product area: `Senderr Web App`
- Role: stable delivery branch for the Senderr web app.

## Scope

- Primary paths:
  - `apps/senderr-app`
  - `packages/shared` (only when needed by senderr features)
- Keep iOS-native work in `senderr-ios/*` unless requested.

## Build and test commands

- `pnpm --filter @gosenderr/senderr-app dev`
- `pnpm --filter @gosenderr/senderr-app build`
- `pnpm --filter @gosenderr/senderr-app preview`

## Git workflow for this branch

- Branch-scoped commits only.
- Example commit:
  - `fix(senderr): resolve courier job list loading state`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "fix(senderr): <summary>"`

## Done criteria

- Senderr workflow changes are verified locally.
- Branch stays focused on senderr web app scope.

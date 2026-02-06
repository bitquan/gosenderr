# Branch Profile: `marketplace/main`

## Intent

- Branch mode: `mainline`
- Product area: `Marketplace`
- Role: stable implementation branch for marketplace deliverables.

## Scope

- Primary paths:
  - `apps/marketplace-app`
  - `packages/shared` (only when marketplace needs shared updates)
- Avoid unrelated senderr and senderr-ios changes unless requested.

## Build and test commands

- `pnpm --filter @gosenderr/marketplace-app dev`
- `pnpm --filter @gosenderr/marketplace-app build`
- `pnpm --filter @gosenderr/marketplace-app test:e2e`

## Git workflow for this branch

- Start by checking state: `bash scripts/git-branch-assist.sh status`
- Commit with marketplace scope, for example:
  - `feat(marketplace): add product filter chips`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "feat(marketplace): <summary>"`

## Done criteria

- Marketplace feature works and is tested.
- No unrelated app breakage introduced.


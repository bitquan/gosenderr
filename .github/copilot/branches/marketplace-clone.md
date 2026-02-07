# Branch Profile: `marketplace/clone`

## Intent

- Branch mode: `clone / experimental`
- Product area: `Marketplace`
- Role: safe experimentation branch for marketplace prototypes.

## Scope

- Primary paths:
  - `apps/marketplace-app`
  - `docs/` (experiment notes)
- Prefer feature flags for risky behavior changes.

## Build and test commands

- `pnpm --filter @gosenderr/marketplace-app dev`
- `pnpm --filter @gosenderr/marketplace-app build`
- `pnpm --filter @gosenderr/marketplace-app test:e2e`

## Git workflow for this branch

- Keep experiments isolated in this branch.
- Commit messages should indicate prototype intent, for example:
  - `feat(marketplace-clone): prototype quick checkout flow`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "feat(marketplace-clone): <summary>"`

## Done criteria

- Experimental behavior is documented.
- Clear notes exist for promotion to `marketplace/main` if approved.


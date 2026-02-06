# Branch Profile: `senderr/clone`

## Intent

- Branch mode: `clone / experimental`
- Product area: `Senderr Web App`
- Role: testing branch for senderr web ideas before promotion.

## Scope

- Primary paths:
  - `apps/senderr-app`
  - `docs/` (experiment notes and migration notes)
- Keep experiments isolated and easy to diff against `senderr/main`.

## Build and test commands

- `pnpm --filter @gosenderr/senderr-app dev`
- `pnpm --filter @gosenderr/senderr-app build`
- `pnpm --filter @gosenderr/senderr-app preview`

## Git workflow for this branch

- Use explicit clone scope in commits, for example:
  - `feat(senderr-clone): prototype multi-stop route timeline`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "feat(senderr-clone): <summary>"`

## Done criteria

- Experimental changes are documented.
- Promotion path to `senderr/main` is clear when features are approved.

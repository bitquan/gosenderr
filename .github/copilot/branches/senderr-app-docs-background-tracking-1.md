# Branch Profile: `senderr-app/docs-background-tracking-1`

## Intent

- Branch mode: `docs`
- Product area: `Senderr iOS`

## Scope

- Primary paths:
  - `docs/senderr_app`
  - `docs/dev`
  - `.github/copilot/branches`

## Canonical references

- `docs/BLUEPRINT.md`
- `docs/senderr_app/README.md`
- `docs/senderr_app/MAP_SHELL_ACCEPTANCE_MATRIX.md`
- `docs/senderr_app/SMOKE_CHECKLIST.md`
- `docs/senderr_app/ROADMAP.md`

## Build and test commands

- `bash scripts/git-branch-assist.sh status`
- `pnpm run verify:docs`

## Git workflow for this branch

- Work only in this branch unless explicitly requested to switch.
- Keep commits scoped to this branch purpose.
- Use conventional commit messages with a clear scope.
- Push back to the same branch by default.

## Done criteria

- Background tracking acceptance criteria and smoke checks are updated.
- Roadmap snapshot reflects current `scope:courier` open issues.
- Docs verification passes when run.

# Branch Profile: `<branch-name>`

## Intent

- Branch mode: `main` or `clone`
- Product area: `<marketplace | senderr | senderr-ios | other>`

## Scope

- Primary paths:
  - `<path-1>`
  - `<path-2>`
- Avoid touching unrelated app areas unless explicitly requested.

## Canonical references

- `docs/BLUEPRINT.md`
- `docs/apps/README.md`
- `<app-doc-1>`
- `<app-doc-2>`

## Branch deltas (this branch only)

- `<delta-1>`
- `<delta-2>`
- Target cleanup date: `<yyyy-mm-dd or before-merge>`

## Build and test commands

- `<command-1>`
- `<command-2>`

## Git workflow for this branch

- Stay on current branch unless user asks to switch.
- Keep commits small and scoped.
- Use conventional commit messages.
- Push back to the same branch by default.

## Done criteria

- Changes are implemented and validated for this branch scope.
- Branch profile remains accurate when scope or workflow changes.
- Any lasting behavior/process changes are promoted into canonical docs in `docs/`.

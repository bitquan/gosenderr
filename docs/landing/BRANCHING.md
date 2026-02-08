# Landing App Branching Template

This template standardizes branch and PR workflow for Landing app work.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `weekly`

## Base branch

- `senderr_app`

## Branch naming

- `landing/feature/<short-task-name>`
- `landing/fix/<short-task-name>`
- `landing/docs/<short-task-name>`

## Pull request rules

- Target branch: `senderr_app`
- Link issue in PR body (`Closes #NNN`)
- Keep PR scope to one issue or one tightly coupled batch
- Select exactly one handoff checkbox:
  - `handoff: updated`
  - `handoff: not needed`

## Required checks before merge

- Lint/type/build checks are green
- Changed docs are updated in same PR
- Branch profile exists in `.github/copilot/branches/`


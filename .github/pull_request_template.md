## Description

Please include a summary of the change and which issue is fixed. Include any relevant motivation and context.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation change
- [ ] CI / tooling change

## Docs impact

- [ ] `docs-impact: yes` (canonical docs updated in this PR)
- [ ] `docs-impact: no` (no docs updates required)
- [ ] Branch delta doc updated when behavior differs from canonical docs (`.github/copilot/branches/*`)

## Session handoff

Select exactly one:

- [ ] `handoff: updated` (I ran `bash scripts/dev-handoff.sh ...` with current issue/PR context and updated `docs/dev/SESSION_STATE.md` + `docs/dev/WORKLOG.md`)
- [ ] `handoff: not needed` (docs-only or metadata-only PR with no behavior/process/setup impact)

## Lifecycle milestone

Set the GitHub milestone for this PR to the appropriate Lifecycle milestone if applicable (options: `Lifecycle M1: Freeze Canonical Vocabulary`, `Lifecycle M2: Enforce Transition Guards`, `Lifecycle M3: Server Lifecycle Commands`, `Lifecycle M4: Data Migration + Compatibility`, `Lifecycle M5: Lifecycle Test Gate`). You may also include `Lifecycle: Mx` in the PR body and the automation will attempt to assign the milestone.

## Checklist

- [ ] PR is targeted at `senderr_app`
- [ ] Lifecycle milestone set (if applicable)
- [ ] Related issue is referenced
- [ ] Tests added/updated where relevant
- [ ] Lint and type checks pass locally
- [ ] CI checks (lint/type/test) are passing
- [ ] Docs updated if behavior changed (`docs/*` or README)
- [ ] If the change affects developer setup or onboarding, update `docs/dev/MINIMAL-SETUP.md` and relevant `apps/*/copilot-instructions.md`
- [ ] For workspace-sized changes, confirm `pnpm -w turbo run type-check` and `pnpm -w turbo run lint` pass locally
- [ ] At least one reviewer assigned

## How to test

Describe the steps required to test the changes.

## Notes

Add any additional information for reviewers (migration notes, backward-incompatibility, etc.).

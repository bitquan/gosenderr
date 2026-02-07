# Copilot Instructions for GoSenderr

## Purpose

This file defines repo-wide Copilot behavior for active GoSenderr development.

Use canonical docs from `/docs/BLUEPRINT.md` as operational truth.

## Active Repo Topology

Active apps:

- `apps/marketplace-app`
- `apps/senderr-app` (Senderr web)
- `apps/courieriosnativeclean` (Senderr iOS native)
- `apps/admin-app`
- `apps/admin-desktop`
- `apps/landing`

Support areas:

- `packages/shared`
- `packages/ui`
- `firebase/`
- `scripts/`
- `docs/`

Legacy/archive:

- `apps/_archive/*`

Do not modify archived paths unless explicitly requested.

## Branch-Aware Workflow (Required)

Always detect branch first:

- `git rev-parse --abbrev-ref HEAD`

Load branch profile:

- `.github/copilot/branches/<branch-name-with-slashes-replaced-by-dashes>.md`

If missing, initialize:

- `bash scripts/setup-branch-copilot.sh`

Keep changes scoped to current branch purpose. Do not mix app domains in one PR unless asked.

Before finishing work on a branch:

- `bash scripts/git-branch-assist.sh status`
- `bash scripts/git-branch-assist.sh save "<type(scope): summary>"`

## Senderr Stream Branch Model

Base branch for active stream work:

- `senderr_app`

Preferred sub-branches:

- `senderr-app/feature/<short-name>`
- `senderr-app/fix/<short-name>`
- `senderr-app/upgrade/<short-name>`
- `senderr-app/docs/<short-name>` or `senderr-app/docs`

PR target for this stream:

- `senderr_app`

Use squash merges to keep history compact.

## Developer Command Baseline

From repo root:

- Install: `pnpm install --frozen-lockfile`
- Lint: `pnpm lint`
- Type-check: `pnpm type-check`
- Build: `pnpm build`
- Docs verification: `pnpm run verify:docs`

iOS Senderr setup/build:

- `pnpm run ios:senderr`
- `pnpm run ios:clean:install`
- `pnpm run ios:build:verify`

Admin desktop full dev stack:

- `pnpm dev:admin-desktop`
- `pnpm stop:admin-desktop`

## Docs and Handoff Discipline

When behavior changes, update docs in the same PR.

Persistent session memory files:

- `docs/dev/SESSION_STATE.md` (current state)
- `docs/dev/WORKLOG.md` (append-only history)

Update with:

- `bash scripts/dev-handoff.sh --summary "<what changed>" --next "<next step>" --status in_progress --issue "#NNN" --pr "#PPP" --files "path/a,path/b"`

Run handoff update before branch switch, before PR, and at end of session.

## Guardrails

- Do not rewrite branch history on shared branches.
- Do not commit generated artifacts unless explicitly required.
- Treat security, CI, and docs drift as blocking for merge readiness.
- Keep changes minimal and verifiable with concrete commands.

## Related Canonical Docs

- `/README.md`
- `/docs/BLUEPRINT.md`
- `/docs/apps/README.md`
- `/docs/DEVELOPER_PLAYBOOK.md`
- `/docs/senderr_app/BRANCHING.md`

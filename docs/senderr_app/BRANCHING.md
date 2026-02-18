<<<<<<< HEAD
# Senderr App — Branching & Git Workflow

This document describes the branch strategy, naming conventions, and PR workflow for the Senderr app work.

## Goals

- Keep `senderr_app` as a safe main branch for the app (feature branch for the app’s lifecycle).
- Use short-lived sub-branches for fixes, upgrades, features, and docs.
- Make changes via PRs with review, CI, and tests before merging.

## Branch names

- Main work branch (base for Senderr): `senderr_app` (already created)
- Sub-branches (use one of these prefixes):
  - `senderr-app/feature/*` — new features (e.g. `senderr-app/feature/auth-flow`)
  - `senderr-app/fix/*` — bug fixes (e.g. `senderr-app/fix/login-crash`)
  - `senderr-app/upgrade/*` — dependency or platform upgrades (e.g. `senderr-app/upgrade/react-native`)
  - `senderr-app/docs` — documentation changes

> Note: We used `senderr-app/*` for sub-branches because Git disallows nested refs when a branch name is exactly a prefix (e.g., `senderr_app` prevents `senderr_app/*`). Prefer `senderr-app/*` for clarity.

## Workflow

1. Create a sub-branch from `senderr_app` (always branch from latest `senderr_app`).
2. Commit small focused changes and push branch to `origin`.
3. Open a PR against `senderr_app` with a clear summary, testing notes, and checklist.
4. Assign reviewers and wait for CI to pass (lint, type checks, tests, e2e if applicable).
5. After approvals and green CI, merge (prefer squash merging to keep history clean) and delete the sub-branch.

## PR Checklist (to include in template)

- [ ] PR is targeted at `senderr_app`
- [ ] Tests added/updated
- [ ] Lint and type checks pass
- [ ] Changes are documented (if applicable)
- [ ] At least one reviewer approved

## Branch Protection & Repo Settings (manual steps)

- Make `senderr_app` a protected branch in GitHub (require PR reviews, require status checks like lint/test, prevent direct pushes).
- Create a GitHub issue/PR to set `senderr_app` as the default branch for senderr-related CI if needed (this may be a repo-wide change).

## Review policy modes

- Solo-maintainer mode (use when only one write collaborator exists):
  - `required_approving_review_count = 0`
  - `require_code_owner_reviews = false`
- Team mode (use when at least two write collaborators exist):
  - `required_approving_review_count = 1`
  - `require_code_owner_reviews = true`
  - Enable dual-approval lines in `.github/CODEOWNERS`

## Next steps I can take for you

- Add a PR template and checklist file (`.github/pull_request_template.md`).
- Create a `CODEOWNERS` entry for the Senderr app directories.
- Open PRs to add CI checks targeting `senderr_app`.

---

If you'd like, I can now add a PR template and a basic `.github/workflows` job scaffold for `senderr_app` (CI checks). Tell me which you'd like me to add next.
=======
# Senderr App Branching & PR Workflow

This document defines the required branch and PR workflow for the Senderr app stream.

## Goals

- Keep `senderr_app` stable and merge-ready.
- Use short-lived sub-branches for focused changes.
- Require issue-linked PRs, CI checks, docs updates, and handoff state discipline.

## Branch strategy

- Base branch for stream work: `senderr_app`
- Use one issue-focused branch at a time.
- Preferred branch naming:
  - `senderr-app/feature/<short-task-name>`
  - `senderr-app/fix/<short-task-name>`
  - `senderr-app/upgrade/<short-task-name>`
  - `senderr-app/docs/<short-task-name>`

Note: Use `senderr-app/*` (with hyphen), not `senderr_app/*` (with underscore), because `senderr_app` is an existing branch name.

## Standard flow

1. Sync and branch from latest `senderr_app`.
2. Commit focused changes and push branch.
3. Open PR targeting `senderr_app`.
4. Link the issue in PR body and confirm CI is green.
5. Merge with squash and delete feature branch.

## PR requirements

- PR target is `senderr_app`.
- Related issue is linked and closed on merge.
- Behavior/process/setup changes update canonical docs in same PR.
- PR template sets exactly one handoff checkbox:
  - `handoff: updated` for behavior/setup/config/process changes.
  - `handoff: not needed` only for docs-only or metadata-only changes.
- If `handoff: updated`, run:

```bash
bash scripts/dev-handoff.sh \
  --summary "what changed" \
  --next "next action" \
  --status in_progress \
  --issue "#NNN" \
  --pr "#PPP" \
  --files "path/a,path/b"
```

## Branch protection

- Protect `senderr_app`.
- Require pull requests for merges.
- Require status checks to pass before merge.
- Require at least one reviewer when team policy is enabled.

## Review policy modes

- Solo-maintainer mode:
  - `required_approving_review_count = 0`
  - `require_code_owner_reviews = false`
- Team mode:
  - `required_approving_review_count = 1`
  - `require_code_owner_reviews = true`
>>>>>>> senderr_app

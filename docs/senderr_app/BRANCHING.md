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

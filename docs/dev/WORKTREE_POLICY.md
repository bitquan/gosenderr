# Worktree Policy

This repo uses lane-based baseline branches and one-feature-per-worktree isolation.

## Production rule

- `main` is production-only.
- Do not do feature development directly on `main`.

## Branch model

- Baseline branches (long-lived):
  - `V1/base-senderrapp`
  - `V1/base-senderrplace`
  - `V1/base-admin`
- Feature branches (short-lived, one concern each):
  - `V1/senderrapp/<feature-slug>`
  - `V1/senderrplace/<feature-slug>`
  - `V1/admin/<feature-slug>`

## Worktree model

- One branch = one worktree = one PR.
- Worktree directory format:
  - `.../worktrees/senderrapp-<feature-slug>`
  - `.../worktrees/senderrplace-<feature-slug>`
  - `.../worktrees/admin-<feature-slug>`
- Never mix unrelated concerns in the same worktree.
  - Example: no navigation refactors inside a food-pickup worktree.

## Commands

- Create a new lane-scoped worktree:
  - `bash scripts/wt-new.sh senderrapp map-shell-nav`
  - `bash scripts/wt-new.sh senderrplace food-market-v1`
  - `bash scripts/wt-new.sh admin feature-flags-audit`
- Validate current branch scope:
  - `bash scripts/wt-check.sh`
- Sync base branches:
  - `bash scripts/wt-sync.sh all`

## Workflow

1. Sync baselines with `bash scripts/wt-sync.sh all`.
2. Create a feature worktree with `bash scripts/wt-new.sh <lane> <feature>`.
3. Implement only in that lane's allowed paths.
4. Run `bash scripts/wt-check.sh` before push/PR.
5. Merge feature into `V1/base-<lane>`.
6. Promote baseline into `main` only when production-ready.

## Hook setup

- Enable repo hooks once per clone/worktree root:
  - `bash scripts/enable-git-hooks.sh`
- Hooks enforce production/main protection and run worktree checks on push.

## Legacy branches

- Legacy prefixes (`senderr-app/feature/*`, `senderrplace/feature/*`, cleanup/salvage branches) are still recognized in `.worktrees.json` so existing PRs keep working.
- New work should always use the `V1/*` model above.

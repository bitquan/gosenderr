#!/usr/bin/env bash
set -euo pipefail

# safe-merge.sh
# Usage: ./safe-merge.sh [--dry-run] [--feature BRANCH]

DRY_RUN=true
FEATURE=${2:-feature/courier-turn-by-turn-navigation}

if [ "${1:-}" = "--no-dry-run" ]; then
  DRY_RUN=false
fi

echo "SAFE MERGE: feature=$FEATURE dry_run=$DRY_RUN"

# 1) fetch
git fetch origin --prune

# 2) ensure clean
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

# 3) ensure main up-to-date
git checkout main
git pull origin main

# 4) backup main
BACKUP=backup/main-before-merge-$(date -u +%Y%m%dT%H%M%SZ)
git branch "$BACKUP"
git push origin "$BACKUP"

echo "Created backup branch $BACKUP"

# 5) dry-merge check
echo "Running dry-merge to detect conflicts..."
set +e
git merge --no-commit --no-ff origin/$FEATURE
MERGE_EXIT=$?
set -e

if [ $MERGE_EXIT -ne 0 ]; then
  echo "Merge produced conflicts or failed (exit=$MERGE_EXIT). Use 'git status' and 'git diff' to inspect, then run 'git merge --abort' to cancel.";
  git merge --abort || true
  exit 1
fi

# List files changed by the feature branch
echo "Files introduced/changed by feature branch:";
git diff --name-status --diff-filter=ACMR origin/main..origin/$FEATURE | sed -n '1,200p'

# Abort the no-commit merge
git merge --abort || true

if [ "$DRY_RUN" = true ]; then
  echo "Dry-run complete. No changes made. Re-run with --no-dry-run to perform merge (after manual review)."
  exit 0
fi

# 6) perform merge for real
read -p "Are you sure you want to perform the merge now? (type YES to continue) " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborting merge.";
  exit 0
fi

# do the merge
git merge --no-ff origin/$FEATURE -m "Merge feature/courier-turn-by-turn-navigation into main"

echo "Merge successful. Run the test matrix and push when ready."

echo "To push to origin: git push origin main"

# End

#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <branch> [--dry-run]"
  exit 2
fi
BRANCH="$1"
DRY_RUN=false
if [ "${2:-}" = "--dry-run" ]; then
  DRY_RUN=true
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_BASE="/tmp/gosenderr-cleanup"
mkdir -p "$TMP_BASE"
SAFE_NAME="$(echo "$BRANCH" | sed 's|/|-|g')"
WORKTREE_DIR="$TMP_BASE/$SAFE_NAME"
CLEANUP_BRANCH="worktree/cleanup/$SAFE_NAME"

echo "Branch: $BRANCH"
echo "Cleanup branch: $CLEANUP_BRANCH"

echo "Fetching origin..."
git -C "$REPO_ROOT" fetch --no-tags --quiet origin

# Ensure remote branch exists
if ! git -C "$REPO_ROOT" ls-remote --heads origin "$BRANCH" | grep -q .; then
  echo "Remote branch origin/$BRANCH not found. Aborting." >&2
  exit 3
fi

# Create temporary worktree with new branch based on remote branch
if [ -d "$WORKTREE_DIR" ]; then
  echo "Worktree dir $WORKTREE_DIR already exists. Reusing it (be careful)."
else
  git -C "$REPO_ROOT" worktree add -b "$CLEANUP_BRANCH" "$WORKTREE_DIR" "origin/$BRANCH"
fi

# Run validator to generate per-branch report and extract violations
echo "Generating violation list for $BRANCH..."
BRANCH="$BRANCH" node "$REPO_ROOT/scripts/validate-worktrees.js" >/dev/null 2>&1 || true
REPORT="$REPO_ROOT/worktrees-report.md"
if [ ! -f "$REPORT" ]; then
  echo "Report $REPORT not found. Aborting." >&2
  exit 4
fi

# Extract the Violations section for this branch's report
viols=$(awk -v br="$BRANCH" 'BEGIN{p=0;v=0} $0=="# Worktrees Validation Report - " br {p=1} p && /^## Violations/{v=1; next} v && /^## /{exit} v{print}' "$REPORT" | sed -n '1,1000p' | sed 's/^- //g' | sed '/^$/d')

if [ -z "$viols" ]; then
  echo "No violations found for $BRANCH (nothing to clean)."
  exit 0
fi

# Print summary
echo "Found $(echo "$viols" | wc -l) violating files (top 40):"
echo "$viols" | sed -n '1,40p'

# Prepare list of origin/main files for quick lookup
MAIN_FILES_FILE="$(mktemp)"
git -C "$REPO_ROOT" ls-tree -r --name-only origin/main > "$MAIN_FILES_FILE"

changed=false
cd "$WORKTREE_DIR"

for file in $(echo "$viols"); do
  # Ensure directories exist
  dir=$(dirname "$file")
  if [ -n "$dir" ] && [ ! -d "$dir" ]; then
    mkdir -p "$dir"
  fi
  # Check if file exists in origin/main
  if grep -xF -- "$file" "$MAIN_FILES_FILE" >/dev/null; then
    if [ "$DRY_RUN" = true ]; then
      echo "[dry-run] would reset $file to origin/main"
    else
      echo "Resetting $file to origin/main"
      git checkout origin/main -- "$file"
      changed=true
    fi
  else
    # File doesn't exist in main -> it was added on the branch; remove it
    if [ "$DRY_RUN" = true ]; then
      echo "[dry-run] would remove $file (added on branch)"
    else
      if [ -f "$file" ] || [ -d "$file" ]; then
        git rm -r --cached --ignore-unmatch "$file" || true
        rm -rf "$file" || true
        changed=true
      else
        echo "file $file not present in worktree; skipping"
      fi
    fi
  fi
done

if [ "$DRY_RUN" = true ]; then
  echo "Dry run complete. No commits will be made."
  echo "To apply changes, re-run: $0 $BRANCH"
  exit 0
fi

if [ "$changed" = false ]; then
  echo "No changes necessary after processing violations. Cleaning up worktree."
  git -C "$REPO_ROOT" worktree remove "$WORKTREE_DIR" --force || true
  exit 0
fi

# Commit and push the cleanup branch
cd "$WORKTREE_DIR"
msg="chore(worktree): restore files outside manifest for $BRANCH"
git add -A
git commit -m "$msg"

echo "Pushing cleanup branch $CLEANUP_BRANCH to origin..."
git push -u origin "$CLEANUP_BRANCH"

# Create a PR
PR_TITLE="worktree: cleanup — remove files outside manifest for $BRANCH"
PR_BODY="This PR restores files outside the allowed manifest for branch \\`$BRANCH\\` back to \\`origin/main\\` or removes new files added accidentally.\n\nSee the worktrees manifest (.worktrees.json) for allowed paths.\n\nFiles changed (top 50):\n\n"
PR_BODY+=$(echo "$viols" | sed -n '1,50p' | sed 's/^/- /')

if [ "${SKIP_PR:-}" = "1" ]; then
  echo "SKIP_PR set — not creating PR. Cleanup branch was pushed."
else
  if command -v gh >/dev/null 2>&1; then
    echo "Creating PR via gh..."
    gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base "$BRANCH" --head "$CLEANUP_BRANCH" --label "worktree/cleanup" || true
    echo "PR created (or failed but branch pushed)."
  else
    echo "gh CLI not available — cleanup branch pushed but PR not created. Create PR manually:" 
    echo "  base: $BRANCH" 
    echo "  head: $CLEANUP_BRANCH"
  fi
fi

echo "Cleanup complete for $BRANCH"

echo "Removing temporary worktree..."
git -C "$REPO_ROOT" worktree remove "$WORKTREE_DIR" --force || true
exit 0

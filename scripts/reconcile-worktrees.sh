#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT="$REPO_ROOT/worktrees-reconcile-report.md"
MANIFEST="$REPO_ROOT/.worktrees.json"

if [ ! -f "$MANIFEST" ]; then
  echo "Manifest $MANIFEST not found. Aborting." >&2
  exit 1
fi

echo "# Worktrees Reconcile Report" > "$REPORT"
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$REPORT"

echo "Fetching origin..."
git -C "$REPO_ROOT" fetch --no-tags --quiet origin

# Use node to extract prefixes. Prefer reconcilePrefixes when present so we can
# target active policy lanes first and avoid noisy legacy sweeps.
prefixes=$(
  node -e "
    const m=require('$MANIFEST');
    const values = Array.isArray(m.reconcilePrefixes) && m.reconcilePrefixes.length
      ? m.reconcilePrefixes
      : (m.worktrees || []).map(w => w.branchPrefix);
    console.log(values.join(' '));
  "
)

for prefix in $prefixes; do
  echo "" >> "$REPORT"
  echo "## Branches for prefix: $prefix" >> "$REPORT"
  # find remote branches matching the prefix
  refs=$(git -C "$REPO_ROOT" ls-remote --heads origin "${prefix}*" | awk '{print $2}' | sed 's|refs/heads/||')
  if [ -z "$refs" ]; then
    echo "(no remote branches for $prefix)" >> "$REPORT"
    continue
  fi
  for branch in $refs; do
    echo "### $branch" >> "$REPORT"
    echo "Running validation for $branch..." >> "$REPORT"
    if BRANCH="$branch" bash "$REPO_ROOT/scripts/wt-check.sh" >> "$REPORT" 2>&1; then
      echo "VALID: $branch" >> "$REPORT"
    else
      echo "INVALID: $branch (see details above)" >> "$REPORT"
    fi
    echo "" >> "$REPORT"
  done
done

echo "Report written to $REPORT"

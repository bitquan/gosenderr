#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_ROOT="$(dirname "$REPO_ROOT")"
WORKTREE_JSON="$REPO_ROOT/worktree.json"
SYNC_RUNTASKS_SCRIPT="$WORKSPACE_ROOT/V1-senderr-ios/scripts/wt-sync-runtasks.sh"
SYNC_TASKS_SCRIPT="$WORKSPACE_ROOT/V1-senderr-ios/scripts/wt-sync-tasks.sh"
SYNC_ROOT_TASKS_SCRIPT="$WORKSPACE_ROOT/V1-senderr-ios/scripts/wt-sync-root-tasks.sh"

if [[ ! -f "$SYNC_RUNTASKS_SCRIPT" || ! -f "$SYNC_TASKS_SCRIPT" ]]; then
  echo "❌ Missing sync scripts under: $WORKSPACE_ROOT/V1-senderr-ios/scripts"
  exit 1
fi

if [[ ! -f "$WORKTREE_JSON" ]]; then
  BRANCH_NAME="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  cat > "$WORKTREE_JSON" <<EOF
{
  "branch": "$BRANCH_NAME",
  "created_at": "$NOW_UTC",
  "original_path": "$REPO_ROOT"
}
EOF
  echo "→ created $WORKTREE_JSON"
fi

echo "→ syncing runtasks for lifecycle worktree"
bash "$SYNC_RUNTASKS_SCRIPT" "$REPO_ROOT"

echo "→ generating .vscode/tasks.json for lifecycle worktree"
bash "$SYNC_TASKS_SCRIPT" "$REPO_ROOT"

if [[ -f "$SYNC_ROOT_TASKS_SCRIPT" ]]; then
  echo "→ refreshing root picker tasks"
  bash "$SYNC_ROOT_TASKS_SCRIPT" "$WORKSPACE_ROOT" || true
fi

echo "✅ runtasks + VS Code tasks synced"

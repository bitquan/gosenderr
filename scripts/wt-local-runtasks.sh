#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VSCODE_DIR="$REPO_ROOT/.vscode"
WORKTREE_JSON="$REPO_ROOT/worktree.json"
DEFAULT_SOURCE_TREE="/Users/papadev/dev/worktrees/gosenderr/V1-senderr-ios-smoke"
SOURCE_TREE="${WT_RUNTASK_SOURCE:-$DEFAULT_SOURCE_TREE}"
SOURCE_WORKTREE_JSON="$SOURCE_TREE/worktree.json"
SOURCE_TASKS_JSON="$SOURCE_TREE/.vscode/tasks.json"

if [[ ! -f "$SOURCE_WORKTREE_JSON" ]]; then
  echo "❌ Missing source runtasks: $SOURCE_WORKTREE_JSON"
  echo "   Set WT_RUNTASK_SOURCE to a valid source worktree path."
  exit 1
fi

if [[ ! -f "$SOURCE_TASKS_JSON" ]]; then
  echo "❌ Missing source VS Code tasks: $SOURCE_TASKS_JSON"
  echo "   Run task sync in source tree first, then rerun this command."
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

node - "$WORKTREE_JSON" "$SOURCE_WORKTREE_JSON" "$SOURCE_TREE" <<'NODE'
const fs = require('fs');
const wtPath = process.argv[2];
const sourceWtPath = process.argv[3];
const sourceTree = process.argv[4];
const wt = JSON.parse(fs.readFileSync(wtPath, 'utf8'));
const sourceWt = JSON.parse(fs.readFileSync(sourceWtPath, 'utf8'));
if (!Array.isArray(sourceWt.runtasks) || sourceWt.runtasks.length === 0) {
  throw new Error(`Source worktree has no runtasks: ${sourceWtPath}`);
}
wt.runtasks = JSON.parse(JSON.stringify(sourceWt.runtasks));
wt.runtasks_source = sourceTree;
fs.writeFileSync(wtPath, JSON.stringify(wt, null, 2) + '\n');
NODE

mkdir -p "$VSCODE_DIR"
cp "$SOURCE_TASKS_JSON" "$VSCODE_DIR/tasks.json"

echo "✅ runtasks copied from source tree: $SOURCE_TREE"

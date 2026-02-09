#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/papadev/dev/apps/Gosenderr_local"
REPO="$ROOT/worktrees/senderr-live"

git -C "$REPO" worktree list --porcelain | awk '
  /^worktree /{path=$2}
  /^branch /{branch=$2; print path "|" branch}
' | while IFS='|' read -r path branch; do
  st=$(git -C "$path" status --short --branch | head -n 1)
  echo "$st :: $path"
done

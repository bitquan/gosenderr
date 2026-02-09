#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/papadev/dev/apps/Gosenderr_local"
REPO="$ROOT/gosenderr"
WT="$ROOT/worktrees"
BASE_REF="origin/senderr_app"

paths=(
  "$WT/senderr-live"
  "$WT/senderr-shell"
  "$WT/senderr-settings"
  "$WT/senderr-ops"
  "$WT/senderrplace-live"
  "$WT/senderrplace-ui"
  "$WT/senderrplace-settings"
  "$WT/senderrplace-ops"
  "$WT/admin-live"
  "$WT/admin-ui"
  "$WT/admin-settings"
  "$WT/admin-ops"
)

echo "[sync] fetch"
git -C "$REPO" fetch origin --prune

for p in "${paths[@]}"; do
  if [[ ! -d "$p/.git" && ! -f "$p/.git" ]]; then
    echo "[skip] missing worktree: $p"
    continue
  fi

  branch=$(git -C "$p" branch --show-current)
  if [[ -z "$branch" ]]; then
    echo "[skip] detached head: $p"
    continue
  fi

  echo "[sync] $p ($branch)"
  git -C "$p" merge --ff-only "$BASE_REF" || {
    echo "[warn] ff-only failed in $p (manual merge/rebase needed)"
  }
done

echo "[done]"

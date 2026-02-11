#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/wt-sync.sh [all|senderrapp|senderrplace|admin] [--push-missing]

Examples:
  scripts/wt-sync.sh all
  scripts/wt-sync.sh senderrplace --push-missing
USAGE
  exit 1
}

TARGET="${1:-all}"
if [ $# -gt 0 ]; then
  shift
fi

PUSH_MISSING=false
while [ $# -gt 0 ]; do
  case "$1" in
    --push-missing) PUSH_MISSING=true ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
  shift
done

REPO_ROOT="$(git rev-parse --show-toplevel)"

if [ "$TARGET" = "all" ]; then
  LANES=(senderrapp senderrplace admin)
else
  LANES=("$TARGET")
fi

lane_to_base() {
  case "$1" in
    senderrapp) echo "V1/base-senderrapp" ;;
    senderrplace) echo "V1/base-senderrplace" ;;
    admin) echo "V1/base-admin" ;;
    *) return 1 ;;
  esac
}

find_branch_worktree() {
  local branch="$1"
  git -C "$REPO_ROOT" worktree list --porcelain \
    | awk -v b="refs/heads/$branch" '
      BEGIN {wt=""}
      /^worktree / {wt=substr($0,10)}
      /^branch / {if ($2==b) {print wt; exit 0}}
    '
}

sync_branch() {
  local branch="$1"
  local wt=""
  local tmp=""

  if ! git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
    if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
      git -C "$REPO_ROOT" branch --track "$branch" "origin/$branch"
    else
      git -C "$REPO_ROOT" branch "$branch" "origin/main"
      echo "Created local $branch from origin/main"
      if [ "$PUSH_MISSING" = true ]; then
        git -C "$REPO_ROOT" push -u origin "$branch"
      else
        echo "Push once with: git push -u origin $branch"
      fi
    fi
  fi

  wt="$(find_branch_worktree "$branch" || true)"
  if [ -n "$wt" ]; then
    if [ -n "$(git -C "$wt" status --porcelain)" ]; then
      echo "Skip $branch: checked out in dirty worktree ($wt)"
      return 0
    fi
  else
    tmp="$(mktemp -d /tmp/gosenderr-base-sync-XXXXXX)"
    git -C "$REPO_ROOT" worktree add "$tmp" "$branch" >/dev/null
    wt="$tmp"
  fi

  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
    git -C "$wt" fetch --no-tags --prune --quiet origin || true
    git -C "$wt" merge --ff-only "origin/$branch" >/dev/null
  else
    git -C "$wt" fetch --no-tags --prune --quiet origin || true
    git -C "$wt" merge --ff-only "origin/main" >/dev/null
  fi

  local rel=""
  rel="$(git -C "$REPO_ROOT" rev-list --left-right --count "$branch"...origin/main)"
  echo "$branch synced (ahead/behind vs origin/main): $rel"

  if [ -n "$tmp" ]; then
    git -C "$REPO_ROOT" worktree remove "$tmp" --force >/dev/null
  fi
}

echo "Fetching remotes..."
git -C "$REPO_ROOT" fetch --no-tags --prune --quiet origin || true

for lane in "${LANES[@]}"; do
  if ! base="$(lane_to_base "$lane")"; then
    echo "Invalid lane '$lane'. Use: all|senderrapp|senderrplace|admin" >&2
    exit 2
  fi
  echo
  echo "== Sync $lane ($base) =="
  sync_branch "$base"
done

echo
echo "Done. Baselines are synced."

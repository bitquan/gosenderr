#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DO_INSTALL=0
if [[ "${1:-}" == "--install" ]]; then
  DO_INSTALL=1
fi

MANAGED_PREFIX="/Users/papadev/dev/apps/Gosenderr_local"

sync_worktree() {
  local wt_path="$1"
  local branch="$2"

  if [[ "$wt_path" != "$MANAGED_PREFIX"* ]]; then
    echo "[sync][skip] $wt_path (outside managed path)"
    return 0
  fi

  if [[ -n "$(git -C "$wt_path" status --porcelain)" ]]; then
    echo "[sync][skip] $wt_path ($branch) has local changes"
    return 0
  fi

  local upstream=""
  if upstream="$(git -C "$wt_path" rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null)"; then
    echo "[sync] pull --rebase $wt_path ($upstream)"
    if ! git -C "$wt_path" pull --rebase --autostash >/dev/null 2>&1; then
      git -C "$wt_path" rebase --abort >/dev/null 2>&1 || true
      echo "[sync][warn] pull/rebase failed for $wt_path ($branch)"
      return 0
    fi
  fi

  if [[ "$branch" != "senderr_app" && ( "$branch" == codex/* || "$branch" == merge-* ) ]]; then
    echo "[sync] rebase $wt_path ($branch) onto origin/senderr_app"
    if ! git -C "$wt_path" rebase origin/senderr_app >/dev/null 2>&1; then
      git -C "$wt_path" rebase --abort >/dev/null 2>&1 || true
      echo "[sync][warn] rebase conflict in $wt_path ($branch)"
      return 0
    fi
  fi

  if [[ $DO_INSTALL -eq 1 ]]; then
    if [[ ! -d "$wt_path/node_modules" ]]; then
      echo "[sync] pnpm install in $wt_path"
      (cd "$wt_path" && pnpm install --frozen-lockfile >/dev/null)
    fi
  fi

  echo "[sync][ok] $wt_path ($branch)"
}

echo "[sync] repo: $REPO_ROOT"
git fetch origin --prune

if git show-ref --verify --quiet refs/heads/senderr_app; then
  echo "[sync] fast-forwarding senderr_app"
  git checkout senderr_app >/dev/null 2>&1 || true
  git merge --ff-only origin/senderr_app || true
fi

echo "[sync] processing worktrees..."
current_path=""
current_branch=""
while IFS= read -r line; do
  if [[ -z "$line" ]]; then
    if [[ -n "$current_path" ]]; then
      sync_worktree "$current_path" "$current_branch"
    fi
    current_path=""
    current_branch=""
    continue
  fi

  case "$line" in
    worktree\ *)
      current_path="${line#worktree }"
      ;;
    branch\ refs/heads/*)
      current_branch="${line#branch refs/heads/}"
      ;;
  esac
done < <(git worktree list --porcelain)

if [[ -n "$current_path" ]]; then
  sync_worktree "$current_path" "$current_branch"
fi

echo "[sync] done"

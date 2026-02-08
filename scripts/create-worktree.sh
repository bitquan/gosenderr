#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/create-worktree.sh <branch> <path> [app-area]

Examples:
  bash scripts/create-worktree.sh codex/issue-300-senderrplace /abs/path/worktrees/issue-300 senderrplace
  bash scripts/create-worktree.sh codex/issue-301-senderr-web /abs/path/worktrees/issue-301 senderr-web
  bash scripts/create-worktree.sh codex/issue-302-backend-contracts /abs/path/worktrees/issue-302 backend
EOF
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

branch="$1"
target_path="$2"
app_area="${3:-}"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi
cd "${repo_root}"

bash scripts/verify-app-templates.sh

if git show-ref --verify --quiet "refs/heads/${branch}"; then
  git worktree add "${target_path}" "${branch}"
else
  git worktree add -b "${branch}" "${target_path}"
fi

if [[ -n "${app_area}" ]]; then
  (cd "${target_path}" && bash scripts/setup-branch-copilot.sh "${branch}" "${app_area}")
else
  (cd "${target_path}" && bash scripts/setup-branch-copilot.sh "${branch}")
fi

echo "worktree ready: ${target_path}"

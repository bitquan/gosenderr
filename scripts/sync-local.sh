#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[sync] repo: $REPO_ROOT"
git fetch origin --prune

if git show-ref --verify --quiet refs/heads/senderr_app; then
  echo "[sync] fast-forwarding senderr_app"
  git checkout senderr_app >/dev/null 2>&1 || true
  git merge --ff-only origin/senderr_app || true
fi

echo "[sync] branch status"
git branch -vv

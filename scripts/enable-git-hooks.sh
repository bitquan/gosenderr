#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi

cd "${repo_root}"

git config core.hooksPath .githooks
git config push.autoSetupRemote true

echo "enabled repo hooks path: .githooks"
echo "enabled push.autoSetupRemote=true"
echo "new branch setup is now auto-initialized on branch checkout"


#!/usr/bin/env bash
set -euo pipefail

HOOK_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../scripts/git-hooks" && pwd)/post-checkout"
# resolve actual git dir (handles worktrees where .git is a file)
GIT_DIR="$(git rev-parse --git-dir)"
HOOK_DST="$GIT_DIR/hooks/post-checkout"

if [[ ! -f "$HOOK_SRC" ]]; then
  echo "hook source not found: $HOOK_SRC"
  exit 1
fi

mkdir -p "$(dirname "$HOOK_DST")"
cp -f "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "installed post-checkout hook to: $HOOK_DST"
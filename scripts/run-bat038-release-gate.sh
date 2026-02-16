#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

run_step() {
  local title="$1"
  shift
  echo
  echo "==> ${title}"
  "$@"
}

run_step "Senderr app build" pnpm --dir "$ROOT_DIR" --filter @gosenderr/senderr-app build
run_step "Shared contracts build" pnpm --dir "$ROOT_DIR" --filter @gosenderr/shared build
run_step "Functions build" pnpm --dir "$ROOT_DIR/firebase/functions" build

echo
cat <<'EOM'
BAT-038 automated gate complete.

Manual release gate still required:
- Execute the BAT-038 manual smoke matrix
- Complete the rollback + deploy checklist

Reference:
- /Users/papadev/dev/worktrees/gosenderr/baseline-change-plans/2026-02-16-senderr-web-mvp-release-gate-checklist.md
EOM

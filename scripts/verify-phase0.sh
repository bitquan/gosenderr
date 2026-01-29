#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "Verifying Phase 0 workspace setup..."
FILES=(
  ".github/copilot-instructions.md"
  ".vscode/settings.json"
  ".copilotignore"
  ".vscode/tasks.json"
  "docs/IMPLEMENTATION_PLAN.md"
)
MISSING=0
for f in "${FILES[@]}"; do
  if [ -f "$ROOT/$f" ]; then
    echo "✅ $f"
  else
    echo "❌ Missing $f"
    MISSING=1
  fi
done

if [ "$MISSING" -ne 0 ]; then
  echo "One or more Phase 0 files are missing. Fix and retry."
  exit 2
fi

echo "\nRunning workspace lint..."
pnpm -w -s -C "$ROOT" run -w lint || { echo "Lint failed (see output above)."; exit 3; }

echo "\nRunning per-package type-checks..."
# Known package checks
if [ -f "$ROOT/packages/ui/package.json" ]; then
  echo "- packages/ui: type-check"
  pnpm -C "$ROOT/packages/ui" run type-check || { echo "packages/ui type-check failed"; exit 4; }
fi

# Run type-check if package has a "type-check" script (apps)
for pkg in "$ROOT"/apps/*; do
  if [ -f "$pkg/package.json" ]; then
    if grep -q '"type-check"' "$pkg/package.json"; then
      name=$(basename "$pkg")
      echo "- apps/$name: type-check"
      pnpm -C "$pkg" run type-check || { echo "type-check failed for apps/$name"; exit 5; }
    fi
  fi
done

if [ "${RUN_E2E:-false}" = "true" ]; then
  echo "\nRUN_E2E=true: Running E2E smoke test (emulators required)."
  # start emulators
  bash scripts/start-emulators.sh &
  EMU_PID=$!
  sleep 5

  # start dev server for customer app
  pnpm --filter @gosenderr/customer-app dev --silent -- --host 127.0.0.1 &
  DEV_PID=$!
  sleep 5

  echo "Running Playwright smoke test (single test)"
  pnpm --filter @gosenderr/customer-app exec -- playwright test tests/e2e/customer-app.spec.ts -g "redirects unauthenticated users to login" --reporter=list || {
    echo "E2E smoke failed"; kill "$EMU_PID" "$DEV_PID" 2>/dev/null || true; exit 6;
  }

  kill "$EMU_PID" "$DEV_PID" 2>/dev/null || true
fi

echo "\nPhase 0 verification complete ✔️"

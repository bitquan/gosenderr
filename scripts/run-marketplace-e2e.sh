#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MARKETPLACE_DIR="$REPO_ROOT/apps/marketplace-app"
SEED_READY_FILE="${TMPDIR:-/tmp}/gosenderr-marketplace-seed-ready"

cleanup() {
  if [ -n "${STARTER_PID:-}" ]; then
    kill "$STARTER_PID" 2>/dev/null || true
    wait "$STARTER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "🚀 Starting emulators in background for e2e..."
bash "$SCRIPT_DIR/start-emulators.sh" &
STARTER_PID=$!

echo "⏳ Waiting for emulator ports..."
READY=false
for i in {1..120}; do
  if lsof -ti:8080 >/dev/null 2>&1 && lsof -ti:9099 >/dev/null 2>&1 && lsof -ti:5000 >/dev/null 2>&1; then
    echo "✅ Emulator ports are ready (firestore, auth, hosting)"
    READY=true
    break
  fi
  if ! kill -0 "$STARTER_PID" >/dev/null 2>&1; then
    echo "❌ Emulator starter exited early"
    exit 1
  fi
  sleep 1
done

if [ "$READY" != "true" ]; then
  echo "❌ Timed out waiting for emulator ports"
  exit 1
fi

echo "⏳ Waiting for startup seed completion..."
SEED_DONE=false
for i in {1..120}; do
  if [ -f "$SEED_READY_FILE" ]; then
    SEED_DONE=true
    echo "✅ Seed completion marker detected"
    break
  fi
  if ! kill -0 "$STARTER_PID" >/dev/null 2>&1; then
    echo "❌ Emulator starter exited before seed completed"
    exit 1
  fi
  sleep 1
done

if [ "$SEED_DONE" != "true" ]; then
  echo "❌ Timed out waiting for seed completion"
  exit 1
fi

cd "$MARKETPLACE_DIR"
echo "🧪 Running Playwright e2e..."
pnpm exec playwright test tests/e2e --config=playwright.config.ts "$@"

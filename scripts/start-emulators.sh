#!/bin/bash

# Script to start Firebase emulators with proper cleanup on exit and auto-seed.

SEED_READY_FILE="${TMPDIR:-/tmp}/gosenderr-marketplace-seed-ready"
PROJECT_ID="${FIREBASE_PROJECT_ID:-gosenderr-6773f}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FUNCTIONS_DIR="$PROJECT_DIR/firebase/functions"

STARTED_OWN_EMULATORS=0
USING_EXISTING_EMULATORS=0
EMULATOR_PID=""

echo "🔥 Starting Firebase Emulators..."

cleanup() {
  echo ""
  if [ "$STARTED_OWN_EMULATORS" = "1" ] && [ -n "$EMULATOR_PID" ]; then
    echo "🛑 Shutting down Firebase Emulators (owned by this session)..."
    kill "$EMULATOR_PID" 2>/dev/null || true
    wait "$EMULATOR_PID" 2>/dev/null || true
    lsof -ti:5001,8080,9099,9199 2>/dev/null | xargs kill -9 2>/dev/null || true
    echo "✅ Emulator cleanup complete"
  else
    echo "ℹ️ No emulator cleanup needed (reused existing instance)."
  fi

  rm -f "$SEED_READY_FILE" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

has_port() {
  lsof -ti:"$1" >/dev/null 2>&1
}

REQUIRED_PORTS=(8080 9099 5001)
open_required=0
for port in "${REQUIRED_PORTS[@]}"; do
  if has_port "$port"; then
    open_required=$((open_required + 1))
  fi
done

if [ "$open_required" -eq "${#REQUIRED_PORTS[@]}" ]; then
  USING_EXISTING_EMULATORS=1
  echo "♻️ Reusing existing emulators on ports 8080/9099/5001."
elif [ "$open_required" -gt 0 ]; then
  echo "❌ Partial emulator ports already in use. Please stop stale emulator processes first."
  exit 1
fi

rm -f "$SEED_READY_FILE"

if [ -d "$FUNCTIONS_DIR" ] && {
  [ ! -d "$FUNCTIONS_DIR/node_modules/firebase-functions" ] || [ ! -d "$FUNCTIONS_DIR/node_modules/firebase-admin" ];
}; then
  echo "📦 Installing firebase/functions dependencies..."
  (cd "$FUNCTIONS_DIR" && npm install --no-audit --no-fund)
fi

cd "$PROJECT_DIR"

if [ "$USING_EXISTING_EMULATORS" = "0" ]; then
  firebase_only="auth,firestore,storage,functions"

  if has_port 4000; then
    echo "⚠️ UI port 4000 already in use. Starting emulators without UI."
  else
    firebase_only="$firebase_only,ui"
  fi

  if [ "${IN_DOCKER:-}" = "1" ] || [ -f "/.dockerenv" ]; then
    if [ "${ENABLE_STORAGE_IN_DOCKER:-0}" != "1" ]; then
      firebase_only="auth,firestore,functions"
      if ! has_port 4000; then
        firebase_only="$firebase_only,ui"
      fi
      echo "Using docker config without Storage emulator (set ENABLE_STORAGE_IN_DOCKER=1 to enable)."
    else
      echo "Using docker config with Storage emulator enabled."
    fi

    pnpm exec firebase emulators:start --config=firebase.docker.json --only "$firebase_only" --import=./firebase-emulator-data --export-on-exit &
  else
    pnpm exec firebase emulators:start --only "$firebase_only" --import=./firebase-emulator-data --export-on-exit &
  fi

  EMULATOR_PID=$!
  STARTED_OWN_EMULATORS=1
fi

echo "⏳ Waiting for emulators (Firestore/Auth/Functions) to be ready..."
for i in {1..90}; do
  if has_port 8080 && has_port 9099 && has_port 5001; then
    echo "✅ Emulators are ready!"
    sleep 2
    break
  fi
  sleep 1
done

if ! has_port 8080 || ! has_port 9099 || ! has_port 5001; then
  echo "❌ Emulators failed to become ready in time."
  if [ "$STARTED_OWN_EMULATORS" = "1" ] && [ -n "$EMULATOR_PID" ]; then
    wait "$EMULATOR_PID"
  fi
  exit 1
fi

export FIREBASE_PROJECT_ID="$PROJECT_ID"
export SENDERR_FIREBASE_PROJECT_ID="$PROJECT_ID"
export FIRESTORE_EMULATOR_HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
export FIREBASE_AUTH_EMULATOR_HOST="${FIREBASE_AUTH_EMULATOR_HOST:-127.0.0.1:9099}"

echo "🌱 Seeding emulator data..."

if [ -f "$SCRIPT_DIR/seed-role-simulation.js" ]; then
  echo "   • seed-role-simulation.js"
  node "$SCRIPT_DIR/seed-role-simulation.js"
fi

if [ -f "$SCRIPT_DIR/seed-admin-data.ts" ]; then
  echo "   • seed-admin-data.ts"
  npx --yes tsx "$SCRIPT_DIR/seed-admin-data.ts"
fi

if [ -f "$SCRIPT_DIR/seed-feature-flags.js" ]; then
  echo "   • seed-feature-flags.js"
  node "$SCRIPT_DIR/seed-feature-flags.js"
fi

if [ -f "$SCRIPT_DIR/seed-courier-emulator.js" ]; then
  echo "   • seed-courier-emulator.js"
  node "$SCRIPT_DIR/seed-courier-emulator.js"
fi

touch "$SEED_READY_FILE"

echo ""
echo "🎉 Seed complete."
echo "👤 Demo Users:"
echo "   customer@example.com / DemoPass123!"
echo "   seller@example.com / DemoPass123!"
echo "   admin@example.com / DemoPass123!"
if [ -f "$SCRIPT_DIR/seed-courier-emulator.js" ]; then
  echo "   courier@example.com / DemoPass123!"
fi
echo ""

if [ "$STARTED_OWN_EMULATORS" = "1" ] && [ -n "$EMULATOR_PID" ]; then
  echo "🟢 Emulators running."
  wait "$EMULATOR_PID"
else
  echo "🟢 Existing emulators were seeded and left running."
fi

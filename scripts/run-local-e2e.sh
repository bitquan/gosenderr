#!/usr/bin/env bash
set -euo pipefail

# Quick local runner for Playwright E2E against Firebase emulators
# Usage: ./scripts/run-local-e2e.sh
# This will:
#  - ensure pnpm (via corepack) is available
#  - install deps and Playwright browsers
#  - start auth + firestore emulators (on default ports)
#  - seed a test user and an item
#  - start the customer app dev server on port 5173
#  - run Playwright tests and write reports to apps/customer-app/test-results
#  - stop processes and print brief logs

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

echo "Checking for pnpm..."
if command -v pnpm >/dev/null 2>&1; then
  echo "pnpm found: $(pnpm -v)"
elif command -v corepack >/dev/null 2>&1; then
  echo "corepack found; preparing pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@8.15.1 --activate
elif command -v npm >/dev/null 2>&1; then
  echo "corepack not found; installing pnpm globally via npm (may require sudo)..."
  npm install -g pnpm@8.15.1
else
  echo "Neither pnpm nor corepack nor npm is available. Please install pnpm or corepack and re-run."
  exit 1
fi

pnpm install --frozen-lockfile

echo "Ensuring Playwright browsers are installed in package context..."
pnpm --filter @gosenderr/customer-app exec -- playwright install --with-deps

# Local firebase config file (default emulator ports are used so seed script works)
cat > firebase.local.json <<'EOF'
{
  "emulators": {
    "auth": { "host": "127.0.0.1", "port": 9099 },
    "firestore": { "host": "127.0.0.1", "port": 8080 }
  }
}
EOF

# Ensure emulator ports are free before starting
check_port() {
  local port=$1
  if lsof -Pn -i :$port -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is in use. Please stop the process using it (e.g., via 'lsof -Pn -i :$port' and kill PID) and re-run.";
    lsof -Pn -i :$port -sTCP:LISTEN || true
    exit 1
  fi
}


# Start emulators in background (set emulator env vars so admin SDK connects without ADC)
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

echo "Starting Firebase emulators (auth + firestore) ..."
(npx firebase emulators:start --config firebase.local.json --only auth,firestore --project gosenderr-6773f > emulators.log 2>&1) &
EMU_PID=$!
trap 'echo "Cleaning up..."; kill ${SERVER_PID:-} 2>/dev/null || true; kill ${VENDOR_PID:-} 2>/dev/null || true; kill ${EMU_PID:-} 2>/dev/null || true; exit 1' ERR INT TERM

# Wait for auth emulator to be ready
npx --yes wait-on --timeout 60000 http://127.0.0.1:9099 || { echo "Auth emulator not ready. Dumping log:"; tail -n +1 emulators.log; kill $EMU_PID || true; exit 1; }

# Seed a user using the auth emulator REST endpoint (safe idempotent)
echo "Seeding auth user..."
curl -s -X POST 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key' -H 'Content-Type: application/json' -d '{"email":"vender@sender.com","password":"admin123","returnSecureToken":true}' || true

# Run seed script which writes an item in Firestore via Admin SDK
echo "Seeding item in Firestore via admin script..."
node scripts/seed-item.js || (echo "Seeding script failed, dumping emulators log"; tail -n 200 emulators.log; kill $EMU_PID || true; exit 1)

# Start the customer app dev server
echo "Starting customer app dev server on port 5173..."
pnpm --filter @gosenderr/customer-app dev -- --port 5173 --host 127.0.0.1 > customer.log 2>&1 &
SERVER_PID=$!

echo "Waiting for dev server on localhost:5173 or 127.0.0.1:5173..."
for i in {1..24}; do
  if curl -sS -I http://localhost:5173 >/dev/null 2>&1 || curl -sS -I http://127.0.0.1:5173 >/dev/null 2>&1; then
    echo "Dev server reachable"
    break
  fi
  sleep 5
done

if ! curl -sS -I http://localhost:5173 >/dev/null 2>&1 && ! curl -sS -I http://127.0.0.1:5173 >/dev/null 2>&1; then
  echo "Dev server did not become available. Dumping logs:"; tail -n +1 customer.log; tail -n +1 emulators.log; kill ${SERVER_PID:-} 2>/dev/null || true; kill ${VENDOR_PID:-} 2>/dev/null || true; kill ${EMU_PID:-} 2>/dev/null || true; exit 1
fi

# Ensure Playwright browsers in package context (again for safety)
pnpm --filter @gosenderr/customer-app exec -- playwright install --with-deps || { echo "playwright install failed"; tail -n +1 customer.log; tail -n +1 emulators.log; kill $SERVER_PID 2>/dev/null || true; kill $EMU_PID 2>/dev/null || true; exit 1; }

# Make sure test-results directory exists
mkdir -p apps/customer-app/test-results

# Provide env vars used in CI so the app initializes (use a fake API key that starts with 'AIza' to pass sanity check)
export VITE_FIREBASE_API_KEY=AIza_FAKE_KEY_FOR_LOCAL
export VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
export VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
export VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.firebasestorage.app
export VITE_FIREBASE_MESSAGING_SENDER_ID=1045849821321
export VITE_FIREBASE_APP_ID=1:1045849821321:web:local
export NEXT_PUBLIC_MAPBOX_TOKEN=pk.testmapboxtoken

# Run Playwright tests (write HTML report to playwright-report for inspection)
echo "Running Playwright tests..."
pnpm --filter @gosenderr/customer-app exec -- playwright test tests/e2e --project=chromium --reporter=list --reporter=html || {
  echo "Playwright tests failed; preserving logs and artifacts..."
  tail -n 200 customer.log
  tail -n 200 emulators.log
  # Move any playwright-report generated in the package or workspace root to apps/customer-app/playwright-report
  if [ -d "playwright-report" ]; then
    mkdir -p apps/customer-app/playwright-report
    mv playwright-report/* apps/customer-app/playwright-report/ || true
  fi
  echo "You can open the report by running: npx playwright show-report apps/customer-app/playwright-report"
  kill ${SERVER_PID:-} 2>/dev/null || true
  kill ${VENDOR_PID:-} 2>/dev/null || true
  kill ${EMU_PID:-} 2>/dev/null || true
  exit 1
}

# On success, stop server and emulator
echo "Playwright tests passed (or completed). Stopping server and emulators..."
kill ${SERVER_PID:-} 2>/dev/null || true
kill ${VENDOR_PID:-} 2>/dev/null || true
kill ${EMU_PID:-} 2>/dev/null || true

# Print short logs
echo "--- Customer log (last 200 lines) ---"
tail -n 200 customer.log || true
echo "--- Emulators log (last 200 lines) ---"
tail -n 200 emulators.log || true

echo "Local E2E run finished. Playwright report available at apps/customer-app/test-results"
exit 0

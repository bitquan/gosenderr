#!/bin/bash

# Script to start Firebase emulators with proper cleanup on exit and auto-seed

echo "🔥 Starting Firebase Emulators..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Firebase Emulators..."
    
    # Kill all firebase processes
    pkill -f firebase 2>/dev/null
    
    # Kill any processes on Firebase ports
    lsof -ti:4000,5001,8080,9099,9199 2>/dev/null | xargs kill -9 2>/dev/null
    
    echo "✅ Cleanup complete"
    exit 0
}

# Set up trap to catch exit signals
trap cleanup EXIT INT TERM

# Start emulators in background
# Use docker-specific config when running inside the container (IN_DOCKER=1)
if [ "${IN_DOCKER:-}" = "1" ] || [ -f "/.dockerenv" ]; then
  echo "Using docker config: firebase.docker.json (starting without Storage emulator to avoid host rules issue)"
  # Storage emulator inside Docker can require additional project credentials / rules.
  # Start emulators without storage to avoid failures; storage is available when running locally.
  firebase emulators:start --config=firebase.docker.json --only auth,firestore,functions,hosting,ui --import=./firebase-emulator-data --export-on-exit &
else
  firebase emulators:start --import=./firebase-emulator-data --export-on-exit &
fi
EMULATOR_PID=$!

# Wait for emulators to be ready (check if Firestore port is open)
echo "⏳ Waiting for emulators to be ready..."
for i in {1..30}; do
    if lsof -ti:8080 > /dev/null 2>&1; then
        echo "✅ Emulators are ready!"
        sleep 2  # Give it a moment to fully initialize
        break
    fi
    sleep 1
done

# Check if there's any data already (simple check if port 8080 returns data)
echo "🔍 Checking for existing marketplace data..."
sleep 1

# Try to get documents, if it fails or returns empty, seed
SHOULD_SEED=true
if curl -s "http://127.0.0.1:8080/v1/projects/gosenderr-6773f/databases/(default)/documents/marketplaceItems" 2>/dev/null | grep -q "documents"; then
    echo "✓ Marketplace data found, skipping seed"
    SHOULD_SEED=false
fi

if [ "$SHOULD_SEED" = true ]; then
    echo "🌱 Seeding demo users..."
    FIREBASE_PROJECT_ID=gosenderr-6773f node scripts/seed-role-simulation.js
    echo "🌱 Seeding marketplace data..."
    npx tsx scripts/seed-marketplace.ts
fi

echo ""
echo "🎉 Ready! View Emulator UI at http://127.0.0.1:4000"
echo "📦 Customer App running at http://127.0.0.1:5173"
echo ""
echo "👤 Demo Users:"
echo "   customer@example.com / DemoPass123!"
echo "   vendor@example.com / DemoPass123!"
echo "   courier@example.com / DemoPass123!"
echo "   admin@example.com / DemoPass123!"
echo ""

# Wait for emulator process
wait $EMULATOR_PID

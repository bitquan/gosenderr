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

# Resolve script directory (so calling from subdirectories works)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start emulators in background
# Use docker-specific config when running inside the container (IN_DOCKER=1)
if [ "${IN_DOCKER:-}" = "1" ] || [ -f "/.dockerenv" ]; then
  # Allow enabling Storage emulator inside Docker via ENABLE_STORAGE_IN_DOCKER=1
  if [ "${ENABLE_STORAGE_IN_DOCKER:-0}" = "1" ]; then
    echo "Using docker config: firebase.docker.json (starting with Storage emulator enabled)"
    firebase emulators:start --config=firebase.docker.json --only auth,firestore,storage,functions,hosting,ui --import=./firebase-emulator-data --export-on-exit &
  else
    echo "Using docker config: firebase.docker.json (starting without Storage emulator to avoid host rules issue)"
    # Storage emulator inside Docker can require additional project credentials / rules.
    # Start emulators without storage to avoid failures; storage is available when running locally.
    firebase emulators:start --config=firebase.docker.json --only auth,firestore,functions,hosting,ui --import=./firebase-emulator-data --export-on-exit &
  fi
else
  firebase emulators:start --import=./firebase-emulator-data --export-on-exit &
fi
EMULATOR_PID=$!

# Wait for emulators to be ready (check if Firestore port is open)
echo "⏳ Waiting for emulators (Firestore & Auth) to be ready..."
for i in {1..60}; do
    if lsof -ti:8080 > /dev/null 2>&1 && lsof -ti:9099 > /dev/null 2>&1; then
        echo "✅ Emulators are ready!"
        sleep 2  # Give it a moment to fully initialize
        break
    fi
    sleep 1
done

echo "🌱 Seeding demo users and seller marketplace data..."
FIREBASE_PROJECT_ID=gosenderr-6773f node "$SCRIPT_DIR/seed-role-simulation.js"

echo ""
echo "🎉 Ready! View Emulator UI at http://127.0.0.1:4000"
echo "📦 Customer App running at http://127.0.0.1:5173"
echo ""
echo "👤 Demo Users:"
echo "   customer@example.com / DemoPass123!"
echo "   seller@example.com / DemoPass123!"
echo ""

# Wait for emulator process
wait $EMULATOR_PID

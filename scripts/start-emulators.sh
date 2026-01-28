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
firebase emulators:start --import=./firebase-emulator-data --export-on-exit &
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

# Check if there's any data already
COLLECTION_COUNT=$(curl -s "http://127.0.0.1:8080/v1/projects/gosenderr-6773f/databases/(default)/documents/marketplaceItems" 2>/dev/null | grep -c "documents" || echo "0")

if [ "$COLLECTION_COUNT" -lt "2" ]; then
    echo "🌱 Seeding marketplace data..."
    npx tsx scripts/seed-marketplace.ts
else
    echo "✓ Marketplace data already exists, skipping seed"
fi

echo ""
echo "🎉 Ready! View Emulator UI at http://127.0.0.1:4000"
echo "📦 Customer App running at http://127.0.0.1:5173"
echo ""

# Wait for emulator process
wait $EMULATOR_PID

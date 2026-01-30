#!/bin/bash

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down services..."
  
  # Kill background processes
  if [ ! -z "$FIREBASE_PID" ]; then
    kill $FIREBASE_PID 2>/dev/null
  fi
  if [ ! -z "$CUSTOMER_PID" ]; then
    kill $CUSTOMER_PID 2>/dev/null
  fi
  
  # Kill any processes on our ports
  echo "🧹 Cleaning up ports..."
  lsof -ti:3000,5173,5174,5175,5180,4000,8080,9099,9199 | xargs kill -9 2>/dev/null
  
  echo "✅ All services stopped"
  exit 0
}

# Set trap to catch exit signals
trap cleanup EXIT INT TERM

# Kill any existing processes on our ports
echo "🛑 Stopping any running apps..."
lsof -ti:3000,5173,5174,5175,5180,4000,8080,9099,9199 | xargs kill -9 2>/dev/null || echo "Ports cleared"

# Start Firebase Emulators in background
echo "🔥 Starting Firebase Emulators..."
firebase emulators:start --only firestore,auth,storage &
FIREBASE_PID=$!

# Wait for emulators to start
sleep 5

# Start Customer App
echo "🛍️ Starting Customer App (Marketplace)..."
pnpm --filter @gosenderr/marketplace-app dev &
CUSTOMER_PID=$!

echo ""
echo "✅ Marketplace Dev Environment Started!"
echo ""
echo "📱 Customer App: http://localhost:5173"
echo "🔥 Firebase UI: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait

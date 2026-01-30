#!/bin/bash

# Script to start Firebase emulators with network access (not just localhost)
# This allows iPhone to connect to emulators via Mac's IP address

echo "🔥 Starting Firebase Emulators with Network Access..."

# Check if socat is installed
if ! command -v socat &> /dev/null; then
    echo "📦 Installing socat for port forwarding..."
    brew install socat || echo "⚠️  Could not install socat, emulators will be localhost-only"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Firebase Emulators..."
    
    # Kill all socat processes (port forwarders)
    pkill -f socat 2>/dev/null
    
    # Kill all firebase processes
    pkill -f firebase 2>/dev/null
    
    # Kill any processes on Firebase ports
    lsof -ti:4000,4400,5001,5002,5007,5008,5009,5010,8080,9099,9150,9199 2>/dev/null | xargs kill -9 2>/dev/null
    
    echo "✅ Cleanup complete"
    exit 0
}

# Set up trap to catch exit signals
trap cleanup EXIT INT TERM

# Function to start port forwarder
forward_port() {
    local PORT=$1
    socat TCP-LISTEN:$PORT,reuseaddr,fork TCP:127.0.0.1:$PORT &
    echo "  ↔️  Port $PORT forwarded"
}

# Start emulators in background
firebase emulators:start --import=./firebase-emulator-data --export-on-exit &
EMULATOR_PID=$!

# Wait for emulators to be ready
echo "⏳ Waiting for emulators to be ready..."
for i in {1..30}; do
    if lsof -ti:8080 > /dev/null 2>&1; then
        echo "✅ Emulators are ready!"
        sleep 2
        break
    fi
    sleep 1
done

# Start port forwarders to make emulators accessible from network
echo "🌐 Setting up network access..."
forward_port 9099  # Auth
forward_port 8080  # Firestore
forward_port 5001  # Functions
forward_port 4400  # Emulator Hub

sleep 1

# Seed test data
echo "🌱 Seeding demo users..."
FIREBASE_PROJECT_ID=gosenderr-6773f node scripts/seed-role-simulation.js

echo ""
echo "🎉 Ready! Emulators running with network access:"
echo "📍 Mac IP: $(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')"
echo "   Auth:      192.168.0.76:9099"
echo "   Firestore: 192.168.0.76:8080"
echo "   Functions: 192.168.0.76:5001"
echo "   Hub:       192.168.0.76:4400"
echo ""
echo "🎁 Demo Users (password: admin123):"
echo "   admin@sender.com"
echo "   courier@sender.com"
echo ""

# Wait for emulator process
wait $EMULATOR_PID

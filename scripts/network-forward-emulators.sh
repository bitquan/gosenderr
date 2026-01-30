#!/bin/bash

# Simple port forwarding script to expose Firebase emulators on the network
# Run this after starting emulators

echo "🌐 Setting up network forwarding for Firebase emulators..."

# Forward Auth port (9099)
socat TCP-LISTEN:9099,reuseaddr,bind=0.0.0.0,fork TCP:127.0.0.1:9099 &
echo "   ✅ Auth: 0.0.0.0:9099 → 127.0.0.1:9099"

# Forward Firestore port (8080)
socat TCP-LISTEN:8080,reuseaddr,bind=0.0.0.0,fork TCP:127.0.0.1:8080 &
echo "   ✅ Firestore: 0.0.0.0:8080 → 127.0.0.1:8080"

# Forward Functions port (5001)
socat TCP-LISTEN:5001,reuseaddr,bind=0.0.0.0,fork TCP:127.0.0.1:5001 &
echo "   ✅ Functions: 0.0.0.0:5001 → 127.0.0.1:5001"

# Forward Emulator Hub port (4400)
socat TCP-LISTEN:4400,reuseaddr,bind=0.0.0.0,fork TCP:127.0.0.1:4400 &
echo "   ✅ Hub: 0.0.0.0:4400 → 127.0.0.1:4400"

MAC_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo ""
echo "✅ Network access enabled on $MAC_IP"
echo "   Make sure your iPhone is on the same WiFi network!"
echo ""

wait

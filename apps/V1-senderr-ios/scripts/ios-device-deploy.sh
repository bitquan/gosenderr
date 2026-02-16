#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"

DERIVED_DATA_DIR="${SENDERR_IOS_DERIVED_DATA:-/Volumes/projects/DerivedData/Gosenderr/Senderrappios-bfvgjahwwvpbjigzjilffcdbhtze}"
BUNDLE_ID="${SENDERR_IOS_BUNDLE_ID:-com.gosenderr.courier}"
DEVICE_ID="${SENDERR_DEVICE_ID:-}"
SKIP_BUILD="${SENDERR_SKIP_BUILD:-0}"

if [[ -z "$DEVICE_ID" ]]; then
  DEVICE_ID="$(xcrun devicectl list devices | awk -F '   +' 'NR>3 && $4=="connected" {print $3; exit}')"
fi

if [[ -z "$DEVICE_ID" ]]; then
  echo "No connected iOS device found."
  echo "Connect your iPhone, unlock it, trust this Mac, then retry."
  exit 1
fi

echo "Using connected device: $DEVICE_ID"
if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "Building iOS app (Debug)..."
  (
    cd "$IOS_DIR"
    xcodebuild \
      -workspace Senderrappios.xcworkspace \
      -scheme Senderr \
      -configuration Debug \
      -sdk iphoneos \
      -derivedDataPath "$DERIVED_DATA_DIR" \
      build
  )
else
  echo "Skipping build (SENDERR_SKIP_BUILD=1)."
fi

APP_PATH="$DERIVED_DATA_DIR/Build/Products/Debug-iphoneos/Senderr.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Build succeeded but app bundle was not found at:"
  echo "  $APP_PATH"
  exit 1
fi

echo "Installing app on device..."
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

echo "Launching app..."
xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID"

echo "Done."

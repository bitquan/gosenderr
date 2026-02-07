#!/usr/bin/env bash
set -euo pipefail

# ios-reset.sh
# - deintegrate pods
# - clear CocoaPods caches and DerivedData
# - reinstall pods
# - verify abseil/gRPC headers & libs exist
# - run a clean simulator build and collect logs

IOS_APP_DIR="${IOS_APP_DIR:-apps/courieriosnativeclean/ios}"
WORKSPACE="$IOS_APP_DIR/Senderr.xcworkspace"
SCHEME="Senderr"
CONFIG="Debug"
SIMULATOR="iPhone 17"
DERIVED_LOG_DIR="ios/build"
LOGFILE="$DERIVED_LOG_DIR/senderr-sim-build.log"

mkdir -p "$DERIVED_LOG_DIR"

echo "== iOS reset script starting =="

title() { echo "\n== $* ==\n"; }

# Helpers
command_exists() { command -v "$1" >/dev/null 2>&1; }

if [ -z "$WORKSPACE" ]; then
  echo "Workspace not set. Exiting."; exit 1
fi

# Ensure we are at repo root (script path relative to repo root)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Check prerequisites
if ! command_exists pod; then
  echo "CocoaPods (pod) not found in PATH. Install CocoaPods and retry."; exit 1
fi
if ! command_exists xcodebuild; then
  echo "xcodebuild not found in PATH. Make sure Xcode is installed."; exit 1
fi

# Deintegrate pods from the iOS project
title "Deintegrating Pods"
if [ -d "$IOS_APP_DIR/Pods" ]; then
  (cd "$IOS_APP_DIR" && pod deintegrate) || true
else
  echo "No Pods folder found, skipping deintegrate.";
fi

# Clear Pods and lockfile
title "Removing Pods directories & lockfiles"
rm -rf "$IOS_APP_DIR/Pods"
rm -f "$IOS_APP_DIR/Podfile.lock"

# Clear CocoaPods cache
title "Clearing CocoaPods caches"
pod cache clean --all || true
rm -rf ~/Library/Caches/CocoaPods || true

# Clear DerivedData for this project only (best-effort)
title "Clearing DerivedData for Senderr"
DERIVED_DIRS=("$HOME/Library/Developer/Xcode/DerivedData")
for d in "${DERIVED_DIRS[@]}"; do
  if [ -d "$d" ]; then
    echo "Searching DerivedData entries in $d for Senderr..."
    find "$d" -maxdepth 1 -type d -name "Senderr*" -print0 | xargs -0 -I{} rm -rf "{}" || true
  fi
done

# Reinstall pods
title "Running pod install"
(cd "$IOS_APP_DIR" && pod install --repo-update --ansi)

# Verify abseil / gRPC pods exist in Pods directory
title "Verifying Pods: abseil and gRPC-Core presence"
if [ -d "$IOS_APP_DIR/Pods/abseil" ]; then
  echo "Found abseil pod directory.";
else
  echo "Warning: abseil pod directory not found.";
fi
if [ -d "$IOS_APP_DIR/Pods/gRPC-Core" ]; then
  echo "Found gRPC-Core pod directory.";
else
  echo "Warning: gRPC-Core pod directory not found.";
fi

# Run a clean simulator build and capture log
title "Starting xcodebuild clean build for simulator ($SIMULATOR)"

set +e
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration "$CONFIG" -destination "platform=iOS Simulator,name=$SIMULATOR" clean build | tee "$LOGFILE"
XCODE_EXIT=${PIPESTATUS[0]}
set -e

if [ $XCODE_EXIT -ne 0 ]; then
  echo "xcodebuild failed. Log captured at $LOGFILE"
else
  echo "xcodebuild completed successfully. Log at $LOGFILE"
fi

# Try to locate built static libs in DerivedData
title "Searching for built libs"
ABSEIL_LIB="$(find ~/Library/Developer/Xcode/DerivedData -type f -path "*Debug-iphonesimulator*/libabseil.a" -print -quit || true)"
GRPC_LIB="$(find ~/Library/Developer/Xcode/DerivedData -type f -path "*Debug-iphonesimulator*/libgRPC-Core.a" -print -quit || true)"
RNFB_AUTH_LIB="$(find ~/Library/Developer/Xcode/DerivedData -type f -name "libRNFBAuth.a" -path "*Debug-iphonesimulator*" -print -quit || true)"

if [ -n "$ABSEIL_LIB" ]; then
  echo "Found abseil static lib at: $ABSEIL_LIB"
  echo "Checking for CHexEscape symbol (simple verification):"
  nm -g "$ABSEIL_LIB" | c++filt | grep -E "CHexEscape|CHexEscape\(" || echo "CHexEscape not found in abseil lib"
else
  echo "Could not find abseil static lib in DerivedData."
fi

if [ -n "$GRPC_LIB" ]; then
  echo "Found gRPC-Core static lib at: $GRPC_LIB"
else
  echo "Could not find gRPC-Core static lib in DerivedData."
fi

if [ -n "$RNFB_AUTH_LIB" ]; then
  echo "Found RNFBAuth static lib at: $RNFB_AUTH_LIB"
  echo "Checking for AuthErrorCode_toJSErrorCode symbol:"
  nm -g "$RNFB_AUTH_LIB" | grep AuthErrorCode_toJSErrorCode || echo "Auth symbol not found in libRNFBAuth.a"
else
  echo "Could not find libRNFBAuth.a in DerivedData."
fi

title "Done"

if [ $XCODE_EXIT -ne 0 ]; then
  exit $XCODE_EXIT
fi

exit 0

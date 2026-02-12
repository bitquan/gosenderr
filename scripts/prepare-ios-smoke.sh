#!/usr/bin/env bash
set -euo pipefail

# prepare-ios-smoke.sh
# Safely prepare a minimal smoke workspace for V1-senderr-ios.
# Usage: ./prepare-ios-smoke.sh [target-dir]
# Default target: /Users/papadev/dev/worktrees/gosenderr/V1-senderr-ios

TARGET=${1:-"/Users/papadev/dev/worktrees/gosenderr/V1-senderr-ios"}
ROOT=$(pwd)

echo "Preparing iOS smoke workspace: $TARGET"

# Safety check: ensure we're operating inside the centralized worktrees area
if [[ "$TARGET" != /Users/papadev/dev/worktrees/gosenderr/* ]]; then
  echo "Refusing to run outside /Users/papadev/dev/worktrees/gosenderr/" >&2
  exit 1
fi

# Confirm presence
if [[ ! -d "$TARGET" ]]; then
  echo "Target directory does not exist: $TARGET" >&2
  exit 1
fi

# 1) Backup key files (podfile, Podfile.lock, workspace) before cleaning
BACKUP_DIR="$TARGET/.smoke_backup_$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
cp -a "$TARGET/apps/V1-senderr-ios/ios/Podfile" "$BACKUP_DIR/" 2>/dev/null || true
cp -a "$TARGET/apps/V1-senderr-ios/ios/Podfile.lock" "$BACKUP_DIR/" 2>/dev/null || true
cp -a "$TARGET/apps/V1-senderr-ios/ios/Senderrappios.xcworkspace" "$BACKUP_DIR/" 2>/dev/null || true

# 2) Remove local per-target caches (safe to remove)
echo "Cleaning node_modules and pnpm store in $TARGET (this only affects the copy)"
rm -rf "$TARGET/node_modules"
rm -rf "$TARGET/.pnpm-store" 2>/dev/null || true
rm -rf "$TARGET/packages/*/node_modules" 2>/dev/null || true

# 3) Install dependencies only needed for app (filtered install)
echo "Running filtered pnpm install for v1-senderr-ios..."
cd "$TARGET"
pnpm --filter v1-senderr-ios install --no-frozen-lockfile --network-concurrency=1 --fetch-retries=5 --fetch-retry-factor=2

# 4) Ensure react_native_pods helper is available (create symlinks where needed)
echo "Ensuring react_native_pods helper is accessible..."
for d in node_modules/.pnpm/*/node_modules/react-native/scripts; do
  if [[ -f "$d/react_native_pods.rb" && ! -f "$d/react_native_pods" ]]; then
    ln -sf react_native_pods.rb "$d/react_native_pods"
    echo "Linked $d/react_native_pods -> react_native_pods.rb"
  fi
done

# 5) CocoaPods: run pod install inside the app ios folder
echo "Running CocoaPods in apps/V1-senderr-ios/ios ..."
cd "$TARGET/apps/V1-senderr-ios/ios"
# keep Podfile.lock and Pods as-is unless user requests full clean
pod install --repo-update

# 6) Final message
echo "Done: smoke workspace prepared at $TARGET"
echo "Backup of Podfile/Podfile.lock/workspace saved to $BACKUP_DIR"
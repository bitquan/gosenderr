#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="${IOS_DIR:-$REPO_ROOT/apps/V1-senderr-ios/ios}"
WORKSPACE="${WORKSPACE:-$IOS_DIR/Senderrappios.xcworkspace}"
SCHEME="${SCHEME:-Senderr}"
DERIVED_ROOT="${DERIVED_ROOT:-$HOME/Library/Developer/Xcode/DerivedData}"
CLEAN_POD_CACHE="${CLEAN_POD_CACHE:-1}"

if ! command -v pod >/dev/null 2>&1; then
  echo "error: CocoaPods not found (pod command missing)."
  exit 1
fi

if [[ ! -d "$IOS_DIR" ]]; then
  echo "error: iOS dir not found: $IOS_DIR"
  exit 1
fi

if [[ ! -f "$IOS_DIR/Podfile" ]]; then
  echo "error: Podfile missing: $IOS_DIR/Podfile"
  exit 1
fi

echo "== Senderr iOS clean install =="
echo "repo: $REPO_ROOT"
echo "ios : $IOS_DIR"

# 1) Clear project-local pod artifacts.
rm -rf "$IOS_DIR/Pods"
rm -rf "$IOS_DIR/build"

# 2) Clear Xcode derived data for this app only.
if [[ -d "$DERIVED_ROOT" ]]; then
  find "$DERIVED_ROOT" -maxdepth 1 -type d -name 'Senderrappios-*' -exec rm -rf {} + 2>/dev/null || true
  find "$DERIVED_ROOT" -maxdepth 1 -type d -name 'Senderr-*' -exec rm -rf {} + 2>/dev/null || true
fi

# 3) Optionally clear CocoaPods caches.
if [[ "$CLEAN_POD_CACHE" == "1" ]]; then
  pod cache clean --all || true
  rm -rf "$HOME/Library/Caches/CocoaPods" || true
fi

# 4) Install pods with retry for intermittent CocoaPods null-byte bug.
cd "$IOS_DIR"
attempt=1
max_attempts=3
while true; do
  set +e
  output="$(pod install 2>&1)"
  exit_code=$?
  set -e

  printf '%s\n' "$output"

  if [[ $exit_code -eq 0 ]]; then
    break
  fi

  if [[ $attempt -ge $max_attempts ]] || ! grep -qi "path name contains null byte" <<<"$output"; then
    exit $exit_code
  fi

  echo "warning: CocoaPods null-byte path bug hit (attempt $attempt/$max_attempts); retrying pod install..."
  attempt=$((attempt + 1))
done

# 5) Guardrail: Podfile.lock and Manifest.lock must match.
if [[ -f "Podfile.lock" && -f "Pods/Manifest.lock" ]]; then
  diff -u "Podfile.lock" "Pods/Manifest.lock" >/dev/null
fi

echo "== Done: clean pod install completed =="
echo "open \"$WORKSPACE\""
echo "build scheme: $SCHEME"

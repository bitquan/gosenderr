#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$REPO_ROOT/apps/courieriosnativeclean/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"
SCHEME="Senderr"

if [[ ! -d "$IOS_DIR" ]]; then
  echo "error: iOS directory not found: $IOS_DIR" >&2
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "error: CocoaPods not found (pod command missing)." >&2
  exit 1
fi

echo "== Bootstrapping Senderr iOS =="
echo "repo: $REPO_ROOT"
echo "ios : $IOS_DIR"

cd "$REPO_ROOT"
bash scripts/sync-ios-podfile.sh --sync --app-dir apps/courieriosnativeclean/ios

cd "$IOS_DIR"
pod_log="$(mktemp -t senderr-ios-pod-install.XXXXXX.log)"
set +e
pod install 2>&1 | tee "$pod_log"
pod_status=${PIPESTATUS[0]}
set -e

if [[ "$pod_status" -ne 0 ]]; then
  if grep -q 'path name contains null byte' "$pod_log"; then
    echo "warning: CocoaPods hit a known null-byte bug during pod install."
    if [[ -f "Podfile.lock" && -f "Pods/Manifest.lock" ]] && diff -u "Podfile.lock" "Pods/Manifest.lock" >/dev/null && [[ -d "$WORKSPACE" ]]; then
      echo "warning: existing Pods are already in sync; continuing with current workspace."
    else
      echo "error: pod install failed and no synced Pods workspace was found." >&2
      echo "Try: pnpm run ios:clean:install" >&2
      rm -f "$pod_log"
      exit 1
    fi
  else
    echo "error: pod install failed. See log: $pod_log" >&2
    exit "$pod_status"
  fi
fi

rm -f "$pod_log"

echo
echo "Done."
echo "Open workspace: $WORKSPACE"
echo "Use scheme   : $SCHEME"

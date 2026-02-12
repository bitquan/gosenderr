#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/V1-senderr-ios"
IOS_DIR="$APP_DIR/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"

usage() {
  cat <<'EOF'
Usage: bash scripts/ios-senderr.sh [command]

Commands:
  full          Clean pods + install + verify Debug/Release builds (default)
  clean-install Clean pod artifacts and run pod install
  build-verify  Run iOS build verification matrix
  testflight-archive Build Release archive + IPA for TestFlight handoff
  testflight-upload  Build Release archive + IPA, then upload to App Store Connect
  open-xcode    Open the canonical Senderr iOS workspace
  metro         Start Metro from the Senderr app directory (with cache reset)
  metro-reset   Kill stale Metro/Watchman state, then start Metro
  help          Show this help
EOF
}

run_clean_install() {
  bash "$ROOT_DIR/scripts/ios-clean-install.sh"
}

run_build_verify() {
  bash "$ROOT_DIR/scripts/ios-build-verify.sh"
}

run_testflight_archive() {
  bash "$ROOT_DIR/scripts/ios-testflight.sh" archive
}

run_testflight_upload() {
  bash "$ROOT_DIR/scripts/ios-testflight.sh" upload
}

run_open_xcode() {
  if [[ ! -d "$WORKSPACE" ]]; then
    echo "error: workspace not found: $WORKSPACE" >&2
    exit 1
  fi
  open "$WORKSPACE"
}

run_metro() {
  if [[ ! -d "$APP_DIR" ]]; then
    echo "error: app dir not found: $APP_DIR" >&2
    exit 1
  fi
  cd "$APP_DIR"
  npx react-native start --reset-cache
}

run_metro_reset() {
  # Avoid stale Metro resolver state across concurrent local sessions.
  pkill -f "react-native start" >/dev/null 2>&1 || true
  pkill -f "node.*metro" >/dev/null 2>&1 || true
  watchman watch-del-all >/dev/null 2>&1 || true
  rm -rf "${TMPDIR:-/tmp}/metro-*" >/dev/null 2>&1 || true
  run_metro
}

if [[ "${1:-}" == "--" ]]; then
  shift
fi

cmd="${1:-full}"
case "$cmd" in
  full)
    echo "== Senderr iOS canonical flow: clean-install + build-verify =="
    run_clean_install
    run_build_verify
    echo "== Senderr iOS flow complete =="
    ;;
  clean-install)
    run_clean_install
    ;;
  build-verify)
    run_build_verify
    ;;
  testflight-archive)
    run_testflight_archive
    ;;
  testflight-upload)
    run_testflight_upload
    ;;
  open-xcode)
    run_open_xcode
    ;;
  metro)
    run_metro
    ;;
  metro-reset)
    run_metro_reset
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "error: unknown command '$cmd'" >&2
    usage
    exit 1
    ;;
esac

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/courieriosnativeclean"
IOS_DIR="$APP_DIR/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"

usage() {
  cat <<'EOF'
Usage: bash scripts/ios-senderr.sh [command]

Commands:
  full          Clean pods + install + verify Debug/Release builds (default)
  clean-install Clean pod artifacts and run pod install
  build-verify  Run iOS build verification matrix
  open-xcode    Open the canonical Senderr iOS workspace
  metro         Start Metro from the Senderr app directory
  help          Show this help
EOF
}

run_clean_install() {
  bash "$ROOT_DIR/scripts/ios-clean-install.sh"
}

run_build_verify() {
  bash "$ROOT_DIR/scripts/ios-build-verify.sh"
}

run_open_xcode() {
  if [[ ! -d "$WORKSPACE" ]]; then
    echo "error: workspace not found: $WORKSPACE" >&2
    exit 1
  fi
  open "$WORKSPACE"
}

run_metro() {
  cd "$APP_DIR"
  npx react-native start --reset-cache
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
  open-xcode)
    run_open_xcode
    ;;
  metro)
    run_metro
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

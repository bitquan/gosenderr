#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/courieriosnativeclean"
IOS_DIR="$APP_DIR/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"
XCODEPROJ="$IOS_DIR/Senderrappios.xcodeproj"
PODFILE="$IOS_DIR/Podfile"
APP_README="$APP_DIR/README.md"
DOC_CHECKLIST="$ROOT_DIR/docs/senderr_app/SMOKE_CHECKLIST.md"
DOC_README="$ROOT_DIR/docs/senderr_app/README.md"
DOC_NAVIGATION_MAP="$ROOT_DIR/docs/senderr_app/NAVIGATION_MAP.md"
DOC_MAP_SHELL_MATRIX="$ROOT_DIR/docs/senderr_app/MAP_SHELL_ACCEPTANCE_MATRIX.md"
ROOT_PACKAGE_JSON="$ROOT_DIR/package.json"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

MODE="${1:-local}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

check_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing file: $path"
}

check_dir() {
  local path="$1"
  [[ -d "$path" ]] || fail "missing directory: $path"
}

echo "== Senderr iOS smoke checks ($MODE) =="

check_dir "$APP_DIR"
check_dir "$IOS_DIR"
check_dir "$WORKSPACE"
check_dir "$XCODEPROJ"
check_file "$PODFILE"
check_file "$APP_README"
check_file "$DOC_CHECKLIST"
check_file "$DOC_README"
check_file "$DOC_NAVIGATION_MAP"
check_file "$DOC_MAP_SHELL_MATRIX"
check_file "$ROOT_PACKAGE_JSON"
check_file "$ROOT_DIR/scripts/ios-senderr.sh"
check_file "$ROOT_DIR/scripts/ios-clean-install.sh"
check_file "$ROOT_DIR/scripts/ios-build-verify.sh"

grep -q "Senderrappios.xcworkspace" "$APP_README" || fail "app README missing canonical workspace reference"
grep -q "pnpm run ios:senderr" "$APP_README" || fail "app README missing canonical iOS setup command"
grep -q "SMOKE_CHECKLIST.md" "$DOC_README" || fail "senderr_app docs missing smoke checklist reference"
grep -q "map-shell-first UX" "$DOC_README" || fail "senderr_app README missing canonical map-shell statement"
grep -q 'Canonical surface: `MapShell`' "$DOC_NAVIGATION_MAP" || fail "navigation map missing MapShell canonical surface section"

node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const required = ["ios:senderr", "ios:clean:install", "ios:build:verify", "ios:smoke"];
  for (const key of required) {
    if (!pkg.scripts || !pkg.scripts[key]) {
      console.error("missing package script:", key);
      process.exit(1);
    }
  }
' "$ROOT_PACKAGE_JSON"

if [[ "$MODE" == "local" && "$(uname -s)" == "Darwin" ]]; then
  if command -v xcodebuild >/dev/null 2>&1; then
    echo "INFO: macOS detected. Run full iOS compile verification with:"
    echo "  pnpm run ios:build:verify"
  fi
fi

echo "PASS: Senderr iOS smoke checks"

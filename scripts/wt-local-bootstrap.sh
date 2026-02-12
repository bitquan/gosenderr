#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$REPO_ROOT/apps/senderr-app"
CHECK_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --check-only) CHECK_ONLY=1 ;;
    *)
      echo "Unknown arg: $arg"
      echo "Usage: bash scripts/wt-local-bootstrap.sh [--check-only]"
      exit 2
      ;;
  esac
done

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing required command: $1"
    return 1
  fi
  return 0
}

echo "== Senderrapp lifecycle local bootstrap =="
echo "repo: $REPO_ROOT"
echo "app : $APP_DIR"

need_cmd node
need_cmd pnpm

if [[ ! -d "$APP_DIR" ]]; then
  echo "❌ Missing app directory: $APP_DIR"
  exit 1
fi

if [[ "$CHECK_ONLY" == "1" ]]; then
  echo "-- check-only mode --"
  [[ -d "$REPO_ROOT/node_modules" ]] && echo "✅ root node_modules exists" || echo "⚠️  root node_modules missing"
  [[ -d "$APP_DIR/node_modules" ]] && echo "✅ app node_modules exists" || echo "⚠️  app node_modules missing"
  [[ -d "$APP_DIR/ios/App/App.xcodeproj" ]] && echo "✅ iOS project exists" || echo "⚠️  iOS project missing"
  [[ -d "$APP_DIR/android" ]] && echo "✅ Android project exists" || echo "⚠️  Android project missing"
  exit 0
fi

echo "→ Installing workspace dependencies"
cd "$REPO_ROOT"
pnpm install

echo "→ Building senderr app"
pnpm --filter @gosenderr/senderr-app build

echo "→ Syncing Capacitor iOS project"
cd "$APP_DIR"
IOS_SYNC_OK=1
if ! pnpm exec cap sync ios; then
  IOS_SYNC_OK=0
  echo "⚠️  iOS sync failed (known Capacitor template issue on some local setups)."
  echo "   Continue local web/lifecycle development; retry iOS sync later with:"
  echo "   cd $APP_DIR && pnpm exec cap sync ios"
fi

echo "→ Syncing Capacitor Android project (best effort)"
if ! pnpm exec cap sync android; then
  echo "⚠️  Android sync failed; iOS setup is still complete."
  echo "   You can retry later with: cd $APP_DIR && pnpm exec cap sync android"
fi

echo
if [[ "$IOS_SYNC_OK" == "1" ]]; then
  echo "✅ Local lifecycle setup complete"
else
  echo "✅ Local lifecycle dependency setup complete (native sync pending)"
fi
echo "Next:"
echo "  cd $APP_DIR"
echo "  pnpm dev"
echo "  pnpm cap:open:ios"

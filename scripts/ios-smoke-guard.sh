#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_APP_DIR="$ROOT_DIR/apps/V1-senderr-ios"
IOS_DIR="$IOS_APP_DIR/ios"
ROOT_PACKAGE_JSON="$ROOT_DIR/package.json"
APP_PACKAGE_JSON="$IOS_APP_DIR/package.json"
PODFILE_LOCK="$IOS_DIR/Podfile.lock"
TARGET_MAPS_VERSION="1.18.0"

MODE="fix"
if [[ "${1:-}" == "--check-only" ]]; then
  MODE="check"
elif [[ "${1:-}" == "--fix" || -z "${1:-}" ]]; then
  MODE="fix"
else
  echo "Usage: $0 [--fix|--check-only]" >&2
  exit 2
fi

log() {
  echo "[ios-smoke-guard] $*"
}

need_install=0
need_pod_install=0
need_fail=0

if [[ ! -f "$ROOT_PACKAGE_JSON" || ! -f "$APP_PACKAGE_JSON" ]]; then
  echo "error: expected package.json files not found under $ROOT_DIR" >&2
  exit 1
fi

if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git -C "$ROOT_DIR" config --bool core.sparseCheckout >/dev/null 2>&1; then
    # Keep the smoke worktree focused on the paths required by smoke scripts.
    expected=(
      ".github"
      "apps/V1-senderr-ios"
      "docs/senderr_app"
      "packages/shared"
      "packages/ui"
      "scripts"
    )
    sparse_out="$(git -C "$ROOT_DIR" sparse-checkout list || true)"
    missing=0
    for p in "${expected[@]}"; do
      if ! grep -Fxq "$p" <<<"$sparse_out"; then
        missing=1
        break
      fi
    done

    if grep -q '^worktrees/navigation/' <<<"$sparse_out"; then
      missing=1
    fi

    if [[ "$missing" -eq 1 ]]; then
      if [[ "$MODE" == "fix" ]]; then
        log "repairing sparse-checkout profile for smoke worktree"
        git -C "$ROOT_DIR" sparse-checkout set "${expected[@]}"
      else
        echo "error: sparse-checkout profile is not configured for smoke paths" >&2
        need_fail=1
      fi
    fi
  fi
fi

if node -e '
  const fs = require("fs");
  const p = process.argv[1];
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const expected = {
    "ios:senderr": "bash scripts/ios-senderr.sh",
    "ios:clean:install": "bash scripts/ios-clean-install.sh",
    "ios:build:verify": "bash scripts/ios-build-verify.sh",
    "ios:smoke": "bash scripts/prepare-ios-smoke.sh && bash scripts/ios-smoke-checks.sh"
  };
  let changed = false;
  j.scripts = j.scripts || {};
  for (const [key, val] of Object.entries(expected)) {
    if (j.scripts[key] !== val) {
      j.scripts[key] = val;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
    process.exit(10);
  }
' "$ROOT_PACKAGE_JSON"; then
  :
else
  rc=$?
  if [[ "$rc" -eq 10 ]]; then
    if [[ "$MODE" == "fix" ]]; then
      log "repaired root iOS scripts in package.json"
      need_install=1
    else
      echo "error: root package.json is missing required iOS smoke scripts" >&2
      need_fail=1
    fi
  else
    exit "$rc"
  fi
fi

if node -e '
  const fs = require("fs");
  const p = process.argv[1];
  const target = process.argv[2];
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.dependencies = j.dependencies || {};
  if (j.dependencies["react-native-maps"] !== target) {
    j.dependencies["react-native-maps"] = target;
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
    process.exit(10);
  }
' "$APP_PACKAGE_JSON" "$TARGET_MAPS_VERSION"; then
  :
else
  rc=$?
  if [[ "$rc" -eq 10 ]]; then
    if [[ "$MODE" == "fix" ]]; then
      log "pinned apps/V1-senderr-ios react-native-maps to $TARGET_MAPS_VERSION"
      need_install=1
    else
      echo "error: react-native-maps is not pinned to $TARGET_MAPS_VERSION" >&2
      need_fail=1
    fi
  else
    exit "$rc"
  fi
fi

if ! rg -q "/react-native-maps@${TARGET_MAPS_VERSION//./\\.}\\(" "$ROOT_DIR/pnpm-lock.yaml"; then
  if [[ "$MODE" == "fix" ]]; then
    need_install=1
  else
    echo "error: pnpm-lock.yaml does not resolve react-native-maps@$TARGET_MAPS_VERSION" >&2
    need_fail=1
  fi
fi

if [[ "$need_install" -eq 1 && "$MODE" == "fix" ]]; then
  log "running pnpm install to realign lockfile and node_modules"
  (
    cd "$ROOT_DIR"
    pnpm install --filter v1-senderr-ios... --no-frozen-lockfile
  )
fi

if [[ ! -f "$PODFILE_LOCK" ]] || ! rg -q "react-native-maps \\(${TARGET_MAPS_VERSION//./\\.}\\)" "$PODFILE_LOCK"; then
  if [[ "$MODE" == "fix" ]]; then
    need_pod_install=1
  else
    echo "error: ios/Podfile.lock is not aligned to react-native-maps@$TARGET_MAPS_VERSION" >&2
    need_fail=1
  fi
fi

if [[ "$need_pod_install" -eq 1 && "$MODE" == "fix" ]]; then
  log "running pod install to realign iOS pods"
  (
    cd "$IOS_DIR"
    pod install
  )
fi

if [[ "$need_fail" -eq 1 ]]; then
  exit 1
fi

if [[ "$MODE" == "fix" ]]; then
  log "environment looks healthy"
else
  log "checks passed"
fi

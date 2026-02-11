#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/templates/ios"
IOS_APP_DIR="apps/courieriosnativeclean/ios"
MODE="sync"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--sync|--check] [--app-dir <relative-path>]

Examples:
  bash scripts/sync-ios-podfile.sh --sync
  bash scripts/sync-ios-podfile.sh --check
  bash scripts/sync-ios-podfile.sh --sync --app-dir apps/courieriosnativeclean/ios

This command syncs/checks canonical iOS template files:
  - Podfile
  - .xcode.env
  - LocalDebug.xcconfig
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sync)
      MODE="sync"
      shift
      ;;
    --check)
      MODE="check"
      shift
      ;;
    --app-dir)
      IOS_APP_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "error: missing template dir: $TEMPLATE_DIR" >&2
  exit 1
fi

if [[ ! -d "$REPO_ROOT/$IOS_APP_DIR" ]]; then
  echo "error: iOS app directory not found: $REPO_ROOT/$IOS_APP_DIR" >&2
  exit 1
fi

TEMPLATE_MAP=(
  "Podfile.template:Podfile"
  ".xcode.env.template:.xcode.env"
  "LocalDebug.xcconfig.template:LocalDebug.xcconfig"
)

run_check() {
  local failed=0
  local entry src_rel dst_rel src dst

  for entry in "${TEMPLATE_MAP[@]}"; do
    src_rel="${entry%%:*}"
    dst_rel="${entry##*:}"
    src="$TEMPLATE_DIR/$src_rel"
    dst="$REPO_ROOT/$IOS_APP_DIR/$dst_rel"

    if [[ ! -f "$src" ]]; then
      echo "error: missing template: $src" >&2
      failed=1
      continue
    fi

    if [[ ! -f "$dst" ]]; then
      echo "error: target missing: $dst" >&2
      failed=1
      continue
    fi

    if cmp -s "$src" "$dst"; then
      echo "OK: $dst_rel is in sync"
    else
      echo "error: drift detected in $dst_rel" >&2
      diff -u "$dst" "$src" || true
      failed=1
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    echo "Run: bash scripts/sync-ios-podfile.sh --sync --app-dir $IOS_APP_DIR" >&2
    exit 1
  fi
}

run_sync() {
  local changed=0
  local entry src_rel dst_rel src dst

  for entry in "${TEMPLATE_MAP[@]}"; do
    src_rel="${entry%%:*}"
    dst_rel="${entry##*:}"
    src="$TEMPLATE_DIR/$src_rel"
    dst="$REPO_ROOT/$IOS_APP_DIR/$dst_rel"

    if [[ ! -f "$src" ]]; then
      echo "error: missing template: $src" >&2
      exit 1
    fi

    if [[ -f "$dst" ]] && cmp -s "$src" "$dst"; then
      echo "No changes needed: $dst_rel"
      continue
    fi

    cp "$src" "$dst"
    echo "Synced $src_rel -> $IOS_APP_DIR/$dst_rel"
    changed=1
  done

  if [[ "$changed" -eq 0 ]]; then
    echo "All iOS templates are already in sync."
  fi
}

if [[ "$MODE" == "check" ]]; then
  run_check
  exit 0
fi

run_sync

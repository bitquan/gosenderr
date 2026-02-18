#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_PODFILE="$REPO_ROOT/apps/courieriosnativeclean/ios/Podfile"
EXPECTED_IOS_DIR="$REPO_ROOT/apps/courieriosnativeclean/ios"
EXPECTED_WORKSPACE="$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios.xcworkspace"
EXPECTED_PROJECT="$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios.xcodeproj"
EXPECTED_SCHEME="$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios.xcodeproj/xcshareddata/xcschemes/Senderr.xcscheme"
TEMPLATE_PODFILE="$REPO_ROOT/templates/ios/Podfile.template"

PODFILES=()
while IFS= read -r podfile; do
  PODFILES+=("$podfile")
done < <(find "$REPO_ROOT/apps" -maxdepth 4 -type f -name Podfile | awk '!/\/apps\/_archive\//' | sort)

if [[ ! -d "$EXPECTED_IOS_DIR" ]]; then
  echo "error: missing canonical iOS directory: $EXPECTED_IOS_DIR" >&2
  exit 1
fi

if [[ ! -f "$EXPECTED_SCHEME" ]]; then
  echo "error: missing canonical scheme file: $EXPECTED_SCHEME" >&2
  exit 1
fi

if [[ ! -d "$EXPECTED_WORKSPACE" ]]; then
  echo "error: missing canonical workspace: $EXPECTED_WORKSPACE" >&2
  exit 1
fi

if [[ ! -d "$EXPECTED_PROJECT" ]]; then
  echo "error: missing canonical xcodeproj: $EXPECTED_PROJECT" >&2
  exit 1
fi

LEGACY_PATHS=(
  "$EXPECTED_IOS_DIR/courieriosnativeclean"
  "$EXPECTED_IOS_DIR/courieriosnativecleanTests"
  "$EXPECTED_IOS_DIR/courieriosnativeclean.xcodeproj"
  "$EXPECTED_IOS_DIR/courieriosnativeclean.xcworkspace"
)

for legacy_path in "${LEGACY_PATHS[@]}"; do
  if [[ -e "$legacy_path" ]]; then
    echo "error: legacy iOS path must not exist in active app tree: $legacy_path" >&2
    exit 1
  fi
done

WORKSPACES=()
while IFS= read -r ws; do
  WORKSPACES+=("$ws")
done < <(find "$EXPECTED_IOS_DIR" -maxdepth 1 -type d -name "*.xcworkspace" | sort)

if [[ "${#WORKSPACES[@]}" -ne 1 || "${WORKSPACES[0]}" != "$EXPECTED_WORKSPACE" ]]; then
  echo "error: expected exactly one committed workspace at canonical path" >&2
  printf ' - %s\n' "${WORKSPACES[@]}" >&2
  exit 1
fi

if [[ "${#PODFILES[@]}" -gt 1 ]]; then
  echo "error: expected at most one active iOS Podfile under apps/, found ${#PODFILES[@]}" >&2
  printf ' - %s\n' "${PODFILES[@]}" >&2
  exit 1
fi

if [[ "${#PODFILES[@]}" -eq 1 ]]; then
  if [[ "${PODFILES[0]}" != "$EXPECTED_PODFILE" ]]; then
    echo "error: unexpected canonical Podfile path" >&2
    echo "expected: $EXPECTED_PODFILE" >&2
    echo "actual  : ${PODFILES[0]}" >&2
    exit 1
  fi

  if [[ -f "$TEMPLATE_PODFILE" ]]; then
    bash "$REPO_ROOT/scripts/sync-ios-podfile.sh" --check --app-dir apps/courieriosnativeclean/ios
  else
    echo "info: Podfile template not present; skipping Podfile sync check."
  fi
else
  echo "info: no committed Podfile found under apps/ (template-only mode)."
fi

echo "OK: canonical Senderr iOS structure is valid."

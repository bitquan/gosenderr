#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_PODFILE="$REPO_ROOT/apps/courieriosnativeclean/ios/Podfile"
EXPECTED_IOS_DIR="$REPO_ROOT/apps/courieriosnativeclean/ios"
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

WORKSPACES=()
while IFS= read -r ws; do
  WORKSPACES+=("$ws")
done < <(find "$EXPECTED_IOS_DIR" -maxdepth 1 -type d -name "*.xcworkspace" | sort)

if [[ "${#WORKSPACES[@]}" -eq 0 ]]; then
  echo "info: no committed .xcworkspace found under canonical iOS dir."
else
  echo "info: detected committed workspace(s):"
  printf ' - %s\n' "${WORKSPACES[@]}"
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

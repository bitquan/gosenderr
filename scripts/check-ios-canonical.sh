#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_PODFILE="$REPO_ROOT/apps/courieriosnativeclean/ios/Podfile"
EXPECTED_WORKSPACE="$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios.xcworkspace"
EXPECTED_SCHEME="$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios.xcodeproj/xcshareddata/xcschemes/Senderr.xcscheme"

PODFILES=()
while IFS= read -r podfile; do
  PODFILES+=("$podfile")
done < <(find "$REPO_ROOT/apps" -maxdepth 4 -type f -name Podfile | awk '!/\/apps\/_archive\//' | sort)

if [[ "${#PODFILES[@]}" -ne 1 ]]; then
  echo "error: expected exactly one iOS Podfile under apps/, found ${#PODFILES[@]}" >&2
  printf ' - %s\n' "${PODFILES[@]}" >&2
  exit 1
fi

if [[ "${PODFILES[0]}" != "$EXPECTED_PODFILE" ]]; then
  echo "error: unexpected canonical Podfile path" >&2
  echo "expected: $EXPECTED_PODFILE" >&2
  echo "actual  : ${PODFILES[0]}" >&2
  exit 1
fi

if [[ ! -d "$EXPECTED_WORKSPACE" ]]; then
  echo "error: missing canonical workspace: $EXPECTED_WORKSPACE" >&2
  exit 1
fi

if [[ ! -f "$EXPECTED_SCHEME" ]]; then
  echo "error: missing canonical scheme file: $EXPECTED_SCHEME" >&2
  exit 1
fi

bash "$REPO_ROOT/scripts/sync-ios-podfile.sh" --check --app-dir apps/courieriosnativeclean/ios

echo "OK: canonical Senderr iOS structure is valid."

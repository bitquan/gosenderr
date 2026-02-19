#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SCRIPT_PHASES=(
  "Bundle React Native code and images"
  "[CP-User] [RNFB] Core Configuration"
  "Strip Bitcode (Release)"
  "Re-sign Modified Frameworks (Release)"
  "[CP-User] [Hermes] Replace Hermes for the right configuration, if needed"
)

DEFAULT_FILES=(
  "$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios.xcodeproj/project.pbxproj"
  "$REPO_ROOT/apps/courieriosnativeclean/ios/Pods/Pods.xcodeproj/project.pbxproj"
)

resolve_file_path() {
  local candidate="$1"
  if [[ -f "$candidate" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi
  if [[ -f "$REPO_ROOT/$candidate" ]]; then
    printf '%s\n' "$REPO_ROOT/$candidate"
    return 0
  fi
  return 1
}

phase_has_outputpaths() {
  local file_path="$1"
  local phase_name="$2"

  awk -v phase="$phase_name" '
    {
      if (index($0, "name = \"" phase "\";")) {
        in_block = 1
      }
      if (in_block && $0 ~ /outputPaths[[:space:]]*=/) {
        found_output = 1
      }
      if (in_block && $0 ~ /^[[:space:]]*};[[:space:]]*$/) {
        if (found_output) {
          exit 0
        }
        exit 1
      }
    }
    END {
      if (!in_block) {
        exit 2
      }
    }
  ' "$file_path"
}

echo "info: verifying Xcode script outputPaths in canonical Senderr iOS project files"

FILES_TO_CHECK=()
if [[ "$#" -gt 0 ]]; then
  for arg in "$@"; do
    if resolved="$(resolve_file_path "$arg")"; then
      FILES_TO_CHECK+=("$resolved")
    else
      echo "error: project file not found: $arg"
      exit 1
    fi
  done
else
  FILES_TO_CHECK=("${DEFAULT_FILES[@]}")
fi

errors=0
for pbx in "${FILES_TO_CHECK[@]}"; do
  if [[ ! -f "$pbx" ]]; then
    echo "error: missing file: $pbx"
    errors=$((errors + 1))
    continue
  fi

  echo "info: scanning $pbx"
  for phase in "${SCRIPT_PHASES[@]}"; do
    set +e
    phase_has_outputpaths "$pbx" "$phase"
    status=$?
    set -e

    if [[ "$status" -eq 0 ]]; then
      echo "ok:   '$phase' has outputPaths"
    elif [[ "$status" -eq 2 ]]; then
      echo "note: '$phase' not present (skipped)"
    else
      echo "error: '$phase' is missing outputPaths"
      errors=$((errors + 1))
    fi
  done
done

if [[ "$errors" -gt 0 ]]; then
  echo "error: verification failed with $errors issue(s)"
  exit 1
fi

echo "success: required script phases include outputPaths"

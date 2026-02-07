#!/usr/bin/env bash
# Test Pod targets quickly so we can triage which Pod targets are misconfigured
# Usage:
#   ./scripts/test-pods-targets.sh            # fast mode (showBuildSettings checks)
#   ./scripts/test-pods-targets.sh --build    # also attempt fast builds per target (faster flags)
#   ./scripts/test-pods-targets.sh --timeout 60 --build

set -u
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="${IOS_DIR:-$REPO_ROOT/apps/courieriosnativeclean/ios}"
PODS_PROJECT="$IOS_DIR/Pods/Pods.xcodeproj"
WORKSPACE="$IOS_DIR/Senderr.xcworkspace"
RESULTS_DIR="/tmp/pods-target-test-$(date +%s)"
mkdir -p "$RESULTS_DIR"
MODE="fast"
TIMEOUT=300

usage(){
  echo "Usage: $0 [--fast|--build] [--timeout SECONDS] [--targets comma,separated,list]"
  exit 1
}

# portable shell helper to run command with a timeout (returns 124 on timeout)
run_with_timeout(){
  local TO=$1; shift
  local CMD=("$@")

  # Run command in background
  ("${CMD[@]}") &
  local pid=$!

  local end_time=$((SECONDS + TO))
  while kill -0 "$pid" 2>/dev/null; do
    if (( SECONDS >= end_time )); then
      # attempt graceful termination
      kill -TERM "$pid" 2>/dev/null || true
      sleep 2
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 1
  done

  wait "$pid"
  return $?
}

# parse args
TARGETS_FILTER=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) MODE=build; shift ;;
    --fast) MODE=fast; shift ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --targets) IFS=',' read -r -a TARGETS_FILTER <<< "$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

if [[ ! -d "$IOS_DIR" ]]; then
  echo "Error: iOS app directory not found: $IOS_DIR" >&2
  exit 2
fi

if [[ ! -f "$PODS_PROJECT/project.pbxproj" ]]; then
  echo "Error: Pods project not found at $PODS_PROJECT" >&2
  exit 2
fi

# get list of targets from Pods project (portable for older bash)
TARGETS=()
while IFS= read -r line; do
  line="$(echo "$line" | sed -e 's/^[ 	]*//' -e 's/[ 	]*$//')"
  if [[ -n "$line" ]]; then
    TARGETS+=("$line")
  fi
done < <(cd "$IOS_DIR" && xcodebuild -project Pods/Pods.xcodeproj -list 2>/dev/null | awk '/Targets:/{f=1;next}/^$/{f=0}f{print}')
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  echo "No Pod targets found via xcodebuild -list. Exiting." >&2
  exit 1
fi

# filter: skip aggregate "Pods-Senderr" target and any empty lines
FILTERED=()
for t in "${TARGETS[@]}"; do
  if [[ -z "$t" ]]; then continue; fi
  if [[ "$t" =~ ^Pods- ]]; then continue; fi
  # skip user-facing aggregated targets
  if [[ "$t" == "Senderr" || "$t" == "Pods-Senderr" ]]; then continue; fi
  FILTERED+=("$t")
done

if [[ ${#FILTERED[@]} -eq 0 ]]; then
  echo "No non-aggregate Pod targets found to test.";
  exit 0
fi

# If --targets provided, restrict to those
if [[ ${#TARGETS_FILTER[@]} -gt 0 ]]; then
  TMP=()
  for want in "${TARGETS_FILTER[@]}"; do
    for t in "${FILTERED[@]}"; do
      if [[ "$t" == "$want" ]]; then
        TMP+=("$t")
      fi
    done
  done
  FILTERED=("${TMP[@]}")
  if [[ ${#FILTERED[@]} -eq 0 ]]; then
    echo "No matching targets found for requested --targets list."; exit 1
  fi
fi

echo "Testing ${#FILTERED[@]} pod targets (mode=$MODE, timeout=${TIMEOUT}s). Results: $RESULTS_DIR"

PASS=()
FAIL=()

for target in "${FILTERED[@]}"; do
  echo "---- $target ----"
  log="$RESULTS_DIR/$target.log"
  echo "Testing target: $target" > "$log"

  # Step 1: quick check - showBuildSettings
  echo -n "Checking settings... "
  if (cd "$IOS_DIR" && xcodebuild -project Pods/Pods.xcodeproj -target "$target" -configuration Debug -sdk iphonesimulator -showBuildSettings > /dev/null 2>>"$log"); then
    echo "OK"
  else
    echo "FAIL (showBuildSettings) -- see $log"
    FAIL+=("$target (settings)")
    continue
  fi

  if [[ "$MODE" == "fast" ]]; then
    PASS+=("$target")
    continue
  fi

  # MODE == build: attempt a fast build with safer flags
  echo -n "Attempting quick build... "
  BUILD_CMD=(xcodebuild -project Pods/Pods.xcodeproj -target "$target" -configuration Debug -sdk iphonesimulator build CODE_SIGNING_ALLOWED=NO ONLY_ACTIVE_ARCH=YES COMPILER_INDEX_STORE_ENABLE=NO ENABLE_BITCODE=NO)
  # set a per-target module cache to avoid collisions
  export CLANG_MODULE_CACHE_PATH="$HOME/Library/Caches/clang-module-cache/Pods-$target"

  # run with timeout (ensure command runs from the iOS project dir so relative paths like Pods/Pods.xcodeproj resolve)
  if run_with_timeout "$TIMEOUT" bash -lc "cd \"$IOS_DIR\" && ${BUILD_CMD[*]}" >>"$log" 2>&1; then
    echo "OK"
    PASS+=("$target")
  else
    rc=$?
    if [[ $rc -eq 124 ]]; then
      echo "TIMEOUT after ${TIMEOUT}s (see $log)"
      FAIL+=("$target (timeout)")
    else
      echo "FAIL (build) rc=$rc - see $log"
      FAIL+=("$target (build)")
    fi
  fi
  # small pause
  sleep 0.2
done

# summary
echo
echo "==== Summary ===="
echo "Passed: ${#PASS[@]}"
if [[ ${#PASS[@]} -gt 0 ]]; then
  for p in "${PASS[@]}"; do echo "  $p"; done
else
  echo "  (none)"
fi

echo "Failed: ${#FAIL[@]}"
if [[ ${#FAIL[@]} -gt 0 ]]; then
  for f in "${FAIL[@]}"; do echo "  $f"; done
else
  echo "  (none)"
fi

echo "Logs saved in $RESULTS_DIR" 
exit 0

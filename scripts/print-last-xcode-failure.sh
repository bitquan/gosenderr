#!/usr/bin/env bash
set -euo pipefail

# Prints a compact summary of the last Xcode build failure for Senderr
# Looks for .xcactivitylog (preferred) or .xcresult and prints relevant error/phase lines

DERIVED=~/Library/Developer/Xcode/DerivedData
PROJECT_PREFIX=Senderr

latest_log=$(ls -1dt "$DERIVED"/${PROJECT_PREFIX}-*/Logs/Build/*.xcactivitylog 2>/dev/null | head -n1 || true)
if [[ -n "$latest_log" && -f "$latest_log" ]]; then
  echo "Using xcactivitylog: $latest_log"
  echo "----- Relevant messages (first 400 lines) -----"
  strings "$latest_log" | egrep -in "error:|error |failed|PhaseScriptExecution|SwiftDriver|BUILD FAILED|\[CP\] Check Pods Manifest.lock" || true
  exit 0
fi

latest_xcresult=$(ls -1dt "$DERIVED"/${PROJECT_PREFIX}-*/Logs/Build/*.xcresult 2>/dev/null | head -n1 || true)
if [[ -n "$latest_xcresult" && -d "$latest_xcresult" ]]; then
  echo "Using xcresult: $latest_xcresult"
  echo "----- xcresult issues (JSON excerpt) -----"
  if command -v xcrun >/dev/null 2>&1; then
    xcrun xcresulttool get --path "$latest_xcresult" --format json | jq '.actions[][].issues' || true
  else
    echo "xcresulttool not found; cannot parse .xcresult"
  fi
  exit 0
fi

echo "No recent build logs found for ${PROJECT_PREFIX} in DerivedData."
exit 2

#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$REPO_ROOT/apps/V1-senderr-ios/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"
SCHEME="Senderr"
GOOGLE_PLIST="$IOS_DIR/Senderrappios/GoogleService-Info.plist"
DERIVED_DATA_ROOT="${IOS_DERIVED_DATA_ROOT:-/Volumes/projects/DerivedData/Gosenderr}"
RUN_STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_ID="${IOS_BUILD_RUN_ID:-verify-${RUN_STAMP}-$$}"
TEMP_PLIST_CREATED=0

bash "$REPO_ROOT/scripts/ios-smoke-guard.sh" --fix
mkdir -p "$DERIVED_DATA_ROOT"

is_generated_temp_plist() {
  [[ -f "$GOOGLE_PLIST" ]] && grep -q "<key>SENDERR_TEMP_PLIST</key>" "$GOOGLE_PLIST"
}

if [[ ! -d "$IOS_DIR" ]]; then
  echo "error: iOS directory not found: $IOS_DIR" >&2
  exit 1
fi

if [[ ! -d "$WORKSPACE" ]]; then
  echo "error: workspace not found: $WORKSPACE" >&2
  exit 1
fi

cleanup() {
  if [[ "$TEMP_PLIST_CREATED" == "1" && -f "$GOOGLE_PLIST" ]]; then
    rm -f "$GOOGLE_PLIST"
    echo "Removed temporary GoogleService-Info.plist"
    return
  fi

  if is_generated_temp_plist; then
    rm -f "$GOOGLE_PLIST"
    echo "Removed temporary GoogleService-Info.plist"
  fi
}
trap cleanup EXIT

if is_generated_temp_plist; then
  rm -f "$GOOGLE_PLIST"
  echo "Removed stale temporary GoogleService-Info.plist"
fi

if [[ ! -f "$GOOGLE_PLIST" ]]; then
  cat > "$GOOGLE_PLIST" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>SENDERR_TEMP_PLIST</key>
  <true/>
  <key>API_KEY</key>
  <string>AIzaSyD-TemporaryBuildVerifyOnly</string>
  <key>BUNDLE_ID</key>
  <string>com.gosenderr.courier</string>
  <key>GCM_SENDER_ID</key>
  <string>123456789012</string>
  <key>GOOGLE_APP_ID</key>
  <string>1:123456789012:ios:1111111111111111</string>
  <key>IS_ADS_ENABLED</key>
  <false/>
  <key>IS_ANALYTICS_ENABLED</key>
  <false/>
  <key>IS_APPINVITE_ENABLED</key>
  <false/>
  <key>IS_GCM_ENABLED</key>
  <false/>
  <key>IS_SIGNIN_ENABLED</key>
  <false/>
  <key>PLIST_VERSION</key>
  <string>1</string>
  <key>PROJECT_ID</key>
  <string>gosenderr-buildverify</string>
  <key>STORAGE_BUCKET</key>
  <string>gosenderr-buildverify.appspot.com</string>
</dict>
</plist>
EOF
  TEMP_PLIST_CREATED=1
  echo "Created temporary GoogleService-Info.plist for build verification"
fi

run_build() {
  local name="$1"
  shift
  local derived_data_path="${DERIVED_DATA_ROOT}/${RUN_ID}/${name}"
  mkdir -p "$derived_data_path"
  echo "=== START ${name} ==="
  echo "DerivedData: ${derived_data_path}"
  if RCT_NO_LAUNCH_PACKAGER=1 SKIP_BUNDLING=1 xcodebuild "$@" \
      -derivedDataPath "$derived_data_path" \
      -quiet \
      CLANG_WARN_DOCUMENTATION_COMMENTS=NO \
      GCC_WARN_INHIBIT_ALL_WARNINGS=YES \
      WARNING_CFLAGS='-w'; then
    echo "=== PASS ${name} ==="
  else
    echo "=== FAIL ${name} ===" >&2
    return 1
  fi
}

cd "$IOS_DIR"

run_build "DEBUG_SIMULATOR" \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  clean build \
  ONLY_ACTIVE_ARCH=YES \
  ARCHS=arm64 \
  CODE_SIGNING_ALLOWED=NO

run_build "DEBUG_DEVICE" \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  clean build \
  CODE_SIGNING_ALLOWED=NO

run_build "RELEASE_DEVICE" \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  clean build \
  CODE_SIGNING_ALLOWED=NO

echo "All iOS build verifications passed."

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/apps/courieriosnativeclean/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"
SCHEME="Senderr"
CONFIGURATION="${CONFIGURATION:-Release}"
BUILD_ROOT="${BUILD_ROOT:-$ROOT_DIR/.artifacts/ios-testflight}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_PATH="$BUILD_ROOT/$TIMESTAMP/Senderrappios.xcarchive"
EXPORT_PATH="$BUILD_ROOT/$TIMESTAMP/export"
EXPORT_OPTIONS="$BUILD_ROOT/$TIMESTAMP/ExportOptions.plist"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/ios-testflight.sh [archive|upload]

Commands:
  archive   Build archive + IPA for TestFlight handoff (default)
  upload    Build archive + IPA, then upload with iTMSTransporter/altool

Env vars:
  CONFIGURATION           Xcode config (default: Release)
  BUILD_ROOT              Output root (default: .artifacts/ios-testflight)
  APPLE_ID                Required for upload command
  APP_SPECIFIC_PASSWORD   Required for upload command
  APPLE_TEAM_ID           Optional for upload command

Notes:
  - Run from repo root or any subdirectory.
  - Requires Xcode command line tools and valid signing setup.
EOF
}

ensure_requirements() {
  if [[ ! -d "$WORKSPACE" ]]; then
    echo "error: workspace not found: $WORKSPACE" >&2
    exit 1
  fi

  if [[ ! -f "$IOS_DIR/Senderrappios/GoogleService-Info.plist" ]]; then
    echo "error: missing GoogleService-Info.plist at $IOS_DIR/Senderrappios/GoogleService-Info.plist" >&2
    exit 1
  fi

  if ! command -v xcodebuild >/dev/null 2>&1; then
    echo "error: xcodebuild not found" >&2
    exit 1
  fi
}

write_export_options() {
  mkdir -p "$(dirname "$EXPORT_OPTIONS")"
  cat >"$EXPORT_OPTIONS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>
EOF
}

archive_and_export() {
  ensure_requirements
  write_export_options
  mkdir -p "$EXPORT_PATH"

  echo "==> Archiving $SCHEME ($CONFIGURATION)"
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    clean archive

  echo "==> Exporting IPA"
  xcodebuild \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS"

  IPA_PATH="$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' | head -n 1)"
  if [[ -z "${IPA_PATH:-}" ]]; then
    echo "error: export did not produce an IPA at $EXPORT_PATH" >&2
    exit 1
  fi

  echo "==> Archive ready"
  echo "Archive: $ARCHIVE_PATH"
  echo "IPA: $IPA_PATH"
}

upload_build() {
  if [[ -z "${APPLE_ID:-}" || -z "${APP_SPECIFIC_PASSWORD:-}" ]]; then
    echo "error: APPLE_ID and APP_SPECIFIC_PASSWORD are required for upload." >&2
    exit 1
  fi

  IPA_PATH="$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' | head -n 1)"
  if [[ -z "${IPA_PATH:-}" ]]; then
    echo "error: IPA not found. Run archive first." >&2
    exit 1
  fi

  if command -v iTMSTransporter >/dev/null 2>&1; then
    echo "==> Uploading IPA via iTMSTransporter"
    iTMSTransporter \
      -m upload \
      -assetFile "$IPA_PATH" \
      -u "$APPLE_ID" \
      -p "$APP_SPECIFIC_PASSWORD" \
      ${APPLE_TEAM_ID:+-itc_provider "$APPLE_TEAM_ID"}
    return
  fi

  echo "==> Uploading IPA via xcrun altool"
  xcrun altool \
    --upload-app \
    --type ios \
    --file "$IPA_PATH" \
    --username "$APPLE_ID" \
    --password "$APP_SPECIFIC_PASSWORD" \
    ${APPLE_TEAM_ID:+--asc-provider "$APPLE_TEAM_ID"}
}

command="${1:-archive}"
case "$command" in
  archive)
    archive_and_export
    ;;
  upload)
    archive_and_export
    upload_build
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "error: unknown command '$command'" >&2
    usage
    exit 1
    ;;
esac

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/apps/V1-senderr-ios/ios"
WORKSPACE="$IOS_DIR/Senderrappios.xcworkspace"
SCHEME="Senderr"

ENV_NAME="${1:-}"
CONFIGURATION="${2:-}"
SDK="${3:-iphoneos}"

if [[ -z "$ENV_NAME" ]]; then
  echo "Usage: bash scripts/ios-build-env.sh <dev|staging|prod> [Debug|Release] [iphoneos|iphonesimulator]"
  exit 1
fi

case "$ENV_NAME" in
  dev|staging|prod) ;;
  *)
    echo "Invalid env '$ENV_NAME'. Expected dev, staging, or prod."
    exit 1
    ;;
esac

if [[ -z "$CONFIGURATION" ]]; then
  if [[ "$ENV_NAME" == "prod" ]]; then
    CONFIGURATION="Release"
  else
    CONFIGURATION="Debug"
  fi
fi

ENV_FILE="$IOS_DIR/config/env/${ENV_NAME}.xcconfig"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env config: $ENV_FILE"
  exit 1
fi

echo "Building Senderr iOS with env=$ENV_NAME config=$CONFIGURATION sdk=$SDK"
cd "$IOS_DIR"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -sdk "$SDK" \
  -xcconfig "$ENV_FILE" \
  build
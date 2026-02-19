#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

IOS_PLIST="$REPO_ROOT/apps/courieriosnativeclean/ios/Senderrappios/GoogleService-Info.plist"
COURIER_CONFIG="$REPO_ROOT/apps/courieriosnativeclean/src/config/firebase.ts"
MARKETPLACE_ENV="$REPO_ROOT/apps/marketplace-app/.env.local"
SENDERR_ENV="$REPO_ROOT/apps/senderr-app/.env.local"

require_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    echo "error: required file missing: $file_path"
    exit 1
  fi
}

plist_value() {
  local key="$1"
  /usr/libexec/PlistBuddy -c "Print :$key" "$IOS_PLIST" 2>/dev/null || true
}

ts_value() {
  local key="$1"
  sed -n "s/.*$key:[[:space:]]*'\([^']*\)'.*/\1/p" "$COURIER_CONFIG" | head -n1
}

env_value() {
  local key="$1"
  local file_path="$2"
  sed -n "s/^$key=\(.*\)$/\1/p" "$file_path" | head -n1
}

check_equal() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "error: $label mismatch"
    echo "  expected: $expected"
    echo "  actual  : $actual"
    return 1
  fi
  echo "ok: $label => $actual"
  return 0
}

require_file "$IOS_PLIST"
require_file "$COURIER_CONFIG"
require_file "$MARKETPLACE_ENV"
require_file "$SENDERR_ENV"

echo "info: validating Firebase parity for MVP sign-in"

IOS_PROJECT_ID="$(plist_value PROJECT_ID)"
IOS_SENDER_ID="$(plist_value GCM_SENDER_ID)"

COURIER_PROJECT_ID="$(ts_value projectId)"
COURIER_AUTH_DOMAIN="$(ts_value authDomain)"
COURIER_STORAGE_BUCKET="$(ts_value storageBucket)"
COURIER_SENDER_ID="$(ts_value messagingSenderId)"

MARKETPLACE_PROJECT_ID="$(env_value VITE_FIREBASE_PROJECT_ID "$MARKETPLACE_ENV")"
MARKETPLACE_AUTH_DOMAIN="$(env_value VITE_FIREBASE_AUTH_DOMAIN "$MARKETPLACE_ENV")"
MARKETPLACE_STORAGE_BUCKET="$(env_value VITE_FIREBASE_STORAGE_BUCKET "$MARKETPLACE_ENV")"
MARKETPLACE_SENDER_ID="$(env_value VITE_FIREBASE_MESSAGING_SENDER_ID "$MARKETPLACE_ENV")"

SENDERR_PROJECT_ID="$(env_value VITE_FIREBASE_PROJECT_ID "$SENDERR_ENV")"
SENDERR_AUTH_DOMAIN="$(env_value VITE_FIREBASE_AUTH_DOMAIN "$SENDERR_ENV")"
SENDERR_STORAGE_BUCKET="$(env_value VITE_FIREBASE_STORAGE_BUCKET "$SENDERR_ENV")"
SENDERR_SENDER_ID="$(env_value VITE_FIREBASE_MESSAGING_SENDER_ID "$SENDERR_ENV")"

EXPECTED_PROJECT_ID="$MARKETPLACE_PROJECT_ID"
EXPECTED_AUTH_DOMAIN="$MARKETPLACE_AUTH_DOMAIN"
EXPECTED_STORAGE_BUCKET="$MARKETPLACE_STORAGE_BUCKET"
EXPECTED_SENDER_ID="$MARKETPLACE_SENDER_ID"

errors=0

check_equal "projectId (iOS plist vs marketplace)" "$EXPECTED_PROJECT_ID" "$IOS_PROJECT_ID" || errors=$((errors + 1))
check_equal "projectId (courier config vs marketplace)" "$EXPECTED_PROJECT_ID" "$COURIER_PROJECT_ID" || errors=$((errors + 1))
check_equal "projectId (senderr-app env vs marketplace)" "$EXPECTED_PROJECT_ID" "$SENDERR_PROJECT_ID" || errors=$((errors + 1))

check_equal "authDomain (courier config vs marketplace)" "$EXPECTED_AUTH_DOMAIN" "$COURIER_AUTH_DOMAIN" || errors=$((errors + 1))
check_equal "authDomain (senderr-app env vs marketplace)" "$EXPECTED_AUTH_DOMAIN" "$SENDERR_AUTH_DOMAIN" || errors=$((errors + 1))

check_equal "storageBucket (courier config vs marketplace)" "$EXPECTED_STORAGE_BUCKET" "$COURIER_STORAGE_BUCKET" || errors=$((errors + 1))
check_equal "storageBucket (senderr-app env vs marketplace)" "$EXPECTED_STORAGE_BUCKET" "$SENDERR_STORAGE_BUCKET" || errors=$((errors + 1))

check_equal "senderId (iOS plist vs marketplace)" "$EXPECTED_SENDER_ID" "$IOS_SENDER_ID" || errors=$((errors + 1))
check_equal "senderId (courier config vs marketplace)" "$EXPECTED_SENDER_ID" "$COURIER_SENDER_ID" || errors=$((errors + 1))
check_equal "senderId (senderr-app env vs marketplace)" "$EXPECTED_SENDER_ID" "$SENDERR_SENDER_ID" || errors=$((errors + 1))

if [[ "$errors" -gt 0 ]]; then
  echo "error: Firebase parity check failed with $errors mismatch(es)"
  exit 1
fi

echo "success: Firebase parity verified for iOS + senderr-app + marketplace"

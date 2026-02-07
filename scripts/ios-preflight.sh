#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="${IOS_DIR:-$REPO_ROOT/apps/courieriosnativeclean/ios}"
PODFILE="$IOS_DIR/Podfile"
PODS_DIR="$IOS_DIR/Pods"
XCDEBUG="$PODS_DIR/Target Support Files/Pods-Senderrappios/Pods-Senderrappios.debug.xcconfig"
GRPC_XC="$PODS_DIR/Target Support Files/gRPC-Core/gRPC-Core.debug.xcconfig"
BORING_XC="$PODS_DIR/Target Support Files/BoringSSL-GRPC/BoringSSL-GRPC.debug.xcconfig"
DERIVED_ROOT="$HOME/Library/Developer/Xcode/DerivedData"
ERR=0

echo "⚙️  Preflight checks (repo root: $REPO_ROOT)"

# Helpers
cmd_exists() { command -v "$1" >/dev/null 2>&1; }

check_tool() {
  if ! cmd_exists "$1"; then
    echo "❌ Required tool missing: $1"
    ERR=1
  else
    echo "✅ Tool: $1"
  fi
}

check_file() {
  if [ ! -f "$1" ]; then
    echo "❌ Missing file: $1"
    ERR=1
  else
    echo "✅ Found file: $1"
  fi
}

check_dir() {
  if [ ! -d "$1" ]; then
    echo "❌ Missing dir: $1"
    ERR=1
  else
    echo "✅ Found dir: $1"
  fi
}

check_tool pod
check_tool xcodebuild
check_tool nm
check_tool grep
check_tool c++filt

echo
check_file "$PODFILE" || true
check_dir "$PODS_DIR" || true

# Pod-specific checks
for p in abseil gRPC-Core BoringSSL-GRPC; do
  if [ -d "$PODS_DIR/$p" ]; then
    echo "✅ Pod present: $p"
  else
    echo "⚠️  Pod missing: $p"
    ERR=1
  fi
done

# xcconfig checks
if [ -f "$XCDEBUG" ]; then
  echo "🔎 Inspecting OTHER_LDFLAGS in Pods-Senderrappios.debug.xcconfig"
  LDFLAGS=$(grep 'OTHER_LDFLAGS' "$XCDEBUG" || true)
  # Accept both quoted and unquoted -l tokens (e.g. -l"abseil" or -labseil)
  if echo "$LDFLAGS" | grep -E -q '\-l"?abseil"?' && echo "$LDFLAGS" | grep -E -q '\-l"?gRPC-Core"?'; then
    # tokenized check for ordering
    tokens=($LDFLAGS)
    idx_ab=-1; idx_grpc=-1
    for i in "${!tokens[@]}"; do
      t="${tokens[$i]}"
      [[ "$t" =~ -l\"?abseil\"? ]] && idx_ab=$i
      [[ "$t" =~ -l\"?gRPC-Core\"? ]] && idx_grpc=$i
    done
    if [ "$idx_ab" -lt "$idx_grpc" ]; then
      echo "⚠️  -labseil appears before -lgRPC-Core in OTHER_LDFLAGS (may cause unresolved absl symbols)"
      ERR=1
    else
      echo "✅ -abseil ordering OK relative to gRPC in OTHER_LDFLAGS"
    fi
  else
    echo "⚠️  Could not find -labseil or -lgRPC-Core tokens in OTHER_LDFLAGS"
  fi
else
  echo "⚠️  Pods debug xcconfig not found: $XCDEBUG"
fi

# gRPC xcconfig flags
if [ -f "$GRPC_XC" ]; then
  echo "🔎 Inspecting gRPC-Core xcconfig flags"
  if grep -q 'CLANG_ENABLE_MODULES' "$GRPC_XC"; then
    grep -n 'CLANG_ENABLE_MODULES' "$GRPC_XC"
  fi
  if grep -q 'OTHER_CFLAGS' "$GRPC_XC"; then
    grep -n 'OTHER_CFLAGS' "$GRPC_XC"
  fi
else
  echo "⚠️  gRPC-Core xcconfig not present"
fi

# BoringSSL - check for -G tokens left
if [ -f "$BORING_XC" ]; then
  if grep -q '\-G' "$BORING_XC"; then
    echo "⚠️  BoringSSL xcconfig contains -G flags (should be removed)"
    ERR=1
  else
    echo "✅ BoringSSL xcconfig: no -G flags found"
  fi
fi

# Firebase headers/modulemap
if [ -f "$PODS_DIR/Headers/Private/Firebase/Firebase.h" ] || [ -f "$PODS_DIR/Headers/Public/Firebase/Firebase.h" ]; then
  echo "✅ Firebase umbrella header present"
else
  echo "⚠️  Firebase umbrella header missing from Pods headers"
  ERR=1
fi
if [ -f "$PODS_DIR/Target Support Files/gRPC-Core/gRPC-Core.modulemap" ]; then
  echo "✅ gRPC modulemap present"
fi

# Simple DerivedData library symbol checks (best-effort)
echo "🔎 Checking DerivedData for built libs (best-effort - may not exist until a successful build)"
AB_LIB="$(find "$DERIVED_ROOT" -type f -name 'libabseil.a' -path '*Debug-iphonesimulator*' -print -quit || true)"
GRPC_LIB="$(find "$DERIVED_ROOT" -type f -name 'libgRPC-Core.a' -path '*Debug-iphonesimulator*' -print -quit || true)"
RNFB_LIB="$(find "$DERIVED_ROOT" -type f -name 'libRNFBAuth.a' -path '*Debug-iphonesimulator*' -print -quit || true)"

if [ -n "$AB_LIB" ]; then
  echo "✅ Found abseil lib at: $AB_LIB"
  if nm -g "$AB_LIB" 2>/dev/null | c++filt | grep -E -q 'CHexEscape|Utf8SafeCHexEscape|BytesToHexString'; then
    echo "✅ abseil hex helper symbol(s) present in abseil lib"
  else
    echo "⚠️  CHexEscape (or related hex helpers) not found in abseil lib (may be missing or strip/architectures mismatch)"
    # Don't fail the whole preflight for this (best-effort check); keep it as a warning
  fi
else
  echo "⚠️  libabseil.a not found in DerivedData (build may not have run)"
fi

if [ -n "$GRPC_LIB" ]; then
  echo "✅ Found gRPC-Core lib at: $GRPC_LIB"
else
  echo "⚠️  libgRPC-Core.a not found in DerivedData"
  ERR=1
fi

if [ -n "$RNFB_LIB" ]; then
  echo "✅ Found RNFBAuth lib at: $RNFB_LIB"
  if nm -g "$RNFB_LIB" 2>/dev/null | grep -q 'AuthErrorCode_toJSErrorCode'; then
    echo "✅ Auth symbol found in libRNFBAuth.a"
  else
    echo "⚠️  Auth symbol NOT found in libRNFBAuth.a"
    ERR=1
  fi
else
  echo "⚠️  libRNFBAuth.a not found in DerivedData"
fi

echo
if [ $ERR -ne 0 ]; then
  echo "❌ Preflight checks detected issues (exit code 1). Fix the noted items and re-run."
  exit 1
else
  echo "✅ Preflight passed (no obvious issues detected)."
  exit 0
fi
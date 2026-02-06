#!/usr/bin/env bash
set -euo pipefail

pass=true

check() {
  local name="$1"
  local cmd="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "✅ ${name}"
  else
    echo "❌ ${name} (missing: ${cmd})"
    pass=false
  fi
}

check "Node.js" node
check "pnpm" pnpm
check "Ruby" ruby
check "Bundler" bundle
check "CocoaPods" pod

echo ""
if [[ -f "ios/Podfile" ]]; then
  echo "✅ ios/Podfile"
else
  echo "❌ ios/Podfile missing"
  pass=false
fi

if [[ "$pass" == "true" ]]; then
  echo "\nAll checks passed."
  exit 0
fi

echo "\nOne or more checks failed."
exit 1

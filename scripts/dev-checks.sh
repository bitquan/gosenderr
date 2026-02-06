#!/usr/bin/env bash
set -euo pipefail

echo "Running dev environment checks"

# check pnpm install
if ! pnpm -v >/dev/null 2>&1; then
  echo "pnpm not found"
  exit 1
fi

# check @babel/runtime helper resolvable from courier RN app
pushd apps/courieriosnativeclean >/dev/null
node -e "try { console.log(require.resolve('@babel/runtime/helpers/interopRequireDefault')); process.exit(0); } catch(e) { console.error('Resolve failed:', e.message); process.exit(2); }"
popd >/dev/null

# check metro.config.js exists in courier RN app
if [ ! -f apps/courieriosnativeclean/metro.config.js ]; then
  echo "metro.config.js missing in courieriosnativeclean"
  exit 1
fi

echo "Dev checks passed"

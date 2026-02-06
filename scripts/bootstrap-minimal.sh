#!/usr/bin/env bash
set -euo pipefail

# Bootstrap minimal development environment for a large monorepo.
# - Intended for new clones or when you want a minimal local footprint.
# - Usage: ./scripts/bootstrap-minimal.sh <path-to-clone> [apps you need]

REPO_URL="git@github.com:bitquan/gosenderr.git"
CLONE_DIR="${1:-./gosenderr-minimal}"
shift || true
APPS_TO_CHECKOUT=("${@:-apps/marketplace-app packages/shared}")

echo "Bootstrapping minimal checkout into: $CLONE_DIR"

# Clone shallow & sparse
git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$CLONE_DIR"
cd "$CLONE_DIR"

echo "Initializing sparse-checkout for: ${APPS_TO_CHECKOUT[*]}"
git sparse-checkout init --cone
for p in "${APPS_TO_CHECKOUT[@]}"; do
  git sparse-checkout set "$p" || true
done

# Install only the workspace packages needed by the checked-out apps
if command -v pnpm >/dev/null 2>&1; then
  echo "Installing pnpm workspace (only needed packages)..."
  # Filter installs for listed apps - this will fetch their transitive deps
  for app in "${APPS_TO_CHECKOUT[@]}"; do
    # Allow package filter using name or path
    pnpm --filter "$app" install || true
  done
else
  echo "Warning: pnpm not found. Please install pnpm to continue (https://pnpm.io/installation)"
fi

cat <<EOF
Done. You have a minimal sparse clone at $CLONE_DIR.
Useful next steps:
 - cd $CLONE_DIR
 - pnpm --filter @gosenderr/marketplace-app install
 - pnpm --filter @gosenderr/marketplace-app build
 - Use git sparse-checkout set to add more folders when required
EOF

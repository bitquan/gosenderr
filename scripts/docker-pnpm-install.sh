#!/usr/bin/env bash
set -euo pipefail

LOCK_DIR="/workspace/.pnpm-install-lock"
MODULES_MARKER="/workspace/node_modules/.modules.yaml"
PNPM_STORE_DIR="/workspace/node_modules/.pnpm"

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

echo "[docker-pnpm-install] waiting for install lock..."
until mkdir "$LOCK_DIR" 2>/dev/null; do
  sleep 1
done

trap cleanup EXIT INT TERM

echo "[docker-pnpm-install] lock acquired, running pnpm install"
if [[ -d "$PNPM_STORE_DIR" && -f "$MODULES_MARKER" ]]; then
  echo "[docker-pnpm-install] node_modules already initialized, skipping install"
  exit 0
fi

pnpm install --frozen-lockfile --force
echo "[docker-pnpm-install] install complete"

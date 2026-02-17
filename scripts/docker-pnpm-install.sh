#!/usr/bin/env bash
set -euo pipefail

LOCK_DIR="/workspace/.pnpm-install-lock"

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

echo "[docker-pnpm-install] waiting for install lock..."
until mkdir "$LOCK_DIR" 2>/dev/null; do
  sleep 1
done

trap cleanup EXIT INT TERM

echo "[docker-pnpm-install] lock acquired, running pnpm install"
pnpm install --frozen-lockfile --force
echo "[docker-pnpm-install] install complete"

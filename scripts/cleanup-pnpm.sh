#!/usr/bin/env bash
set -euo pipefail

# Prune pnpm store and optional clean of node_modules (dry-run by default)
# Usage: ./scripts/cleanup-pnpm.sh [--prune] [--clear] [--yes]

prune=false
clear=false
yes=false
for arg in "$@"; do
  case "$arg" in
    --prune) prune=true ;;
    --clear) clear=true ;;
    --yes) yes=true ;;
    -h|--help) echo "Usage: $0 [--prune] [--clear] [--yes]"; exit 0 ;;
  esac
done

if [ "$prune" = true ]; then
  echo "Running: pnpm store prune"
  pnpm store prune
fi

if [ "$clear" = true ]; then
  echo "About to clear pnpm store (~/.pnpm-store). This is destructive and will remove cached packages."
  if [ "$yes" != true ]; then
    read -p "Proceed? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      echo "Aborting."; exit 1
    fi
  fi
  rm -rf ~/.pnpm-store
  echo "pnpm store cleared."
fi

# list current store size
du -sh ~/.pnpm-store 2>/dev/null || echo "pnpm store not present"

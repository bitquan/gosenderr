#!/usr/bin/env bash
set -euo pipefail

# Safely remove Xcode DerivedData for the Senderr project (or all DerivedData with --all)
# Usage: ./scripts/ios-clean-deriv.sh [--all] [--yes]

PROJECT_NAME="Senderr"
DERIVED_ROOT="$HOME/Library/Developer/Xcode/DerivedData"

all=false
yes=false
for arg in "$@"; do
  case "$arg" in
    --all) all=true ;;
    --yes) yes=true ;;
    -h|--help) echo "Usage: $0 [--all] [--yes]"; exit 0 ;;
  esac
done

if [ "$all" = true ]; then
  echo "About to remove ALL DerivedData under $DERIVED_ROOT"
  if [ "$yes" != true ]; then
    read -p "Are you sure? This will remove build caches for all projects (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      echo "Aborting."; exit 1
    fi
  fi
  rm -rf "$DERIVED_ROOT"/*
  echo "All DerivedData removed."
  exit 0
fi

# Remove only project-specific DerivedData
candidates=("$DERIVED_ROOT/${PROJECT_NAME}-*" "$DERIVED_ROOT/${PROJECT_NAME}*" )
found=false
for p in "${candidates[@]}"; do
  for dir in $p; do
    if [ -d "$dir" ]; then
      if [ "$yes" != true ]; then
        du -sh "$dir" || true
        read -p "Remove $dir? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
          echo "Skipped $dir"; continue
        fi
      fi
      rm -rf "$dir"
      echo "Removed $dir"
      found=true
    fi
  done
done

if [ "$found" = false ]; then
  echo "No DerivedData matching $PROJECT_NAME found in $DERIVED_ROOT"
fi

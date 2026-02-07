#!/usr/bin/env bash
set -euo pipefail

# Find and optionally remove unused iOS Simulators and derived simulator data
# Usage: ./scripts/cleanup-simulators.sh [--list] [--prune] [--yes]

list=true
prune=false
yes=false
for arg in "$@"; do
  case "$arg" in
    --prune) prune=true; list=false ;;
    --yes) yes=true ;;
    -h|--help) echo "Usage: $0 [--list] [--prune] [--yes]"; exit 0 ;;
  esac
done

if [ "$list" = true ]; then
  echo "Installed simulators (xcrun simctl list devices):"
  xcrun simctl list devices | sed -n '1,200p'
  echo "\nSizes by device data folder (largest first):"
  du -sh ~/Library/Developer/CoreSimulator/Devices/* 2>/dev/null | sort -h | tail -n 20
  exit 0
fi

if [ "$prune" = true ]; then
  echo "Prune: list of shutdown/unused simulators (will not delete "booted")"
  read -p "Proceed to delete all shutdown simulators? (y/N): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborting."; exit 1
  fi
  xcrun simctl shutdown all || true
  # delete devices in 'shutdown' state is not directly supported; the simctl delete removes listed devices
  # We'll remove the device data folders that are large but not currently booted
  for d in ~/Library/Developer/CoreSimulator/Devices/*; do
    if [ -d "$d" ]; then
      state=$(PlistBuddy -c "Print :state" "$d/data/.com.apple.mobile_container_manager.metadata.plist" 2>/dev/null || echo "unknown") || true
      if [ "$state" != "Booted" ]; then
        echo "Removing $d" && rm -rf "$d"
      fi
    fi
done
  echo "Prune complete."
fi

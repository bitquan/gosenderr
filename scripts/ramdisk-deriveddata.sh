#!/usr/bin/env bash
set -euo pipefail

# RAM disk helper for Xcode DerivedData
# Usage: ./scripts/ramdisk-deriveddata.sh start [SIZE_GB]
#        ./scripts/ramdisk-deriveddata.sh stop
#        ./scripts/ramdisk-deriveddata.sh status
# Default SIZE_GB = 6 (recommend 4-12 depending on RAM)

PROJ_NAME="Senderr"
RAM_LABEL="RDX-DerivedData"
MOUNT_POINT="/Volumes/$RAM_LABEL"
BACKUP_DIR="$HOME/.ramdisk_backups"
PREV_SETTING_FILE="$HOME/.ramdisk_prev_deriveddata"

function bytes_to_gb() {
  awk "BEGIN{printf \"%.0f\", $1/1024/1024/1024}"
}

function start_ramdisk() {
  SIZE_GB=${1:-6}

  # Check memory
  MEM_BYTES=$(sysctl -n hw.memsize)
  MEM_GB=$(bytes_to_gb $MEM_BYTES)
  MAX_SAFE=$(( MEM_GB / 2 ))
  if (( SIZE_GB > MAX_SAFE )); then
    echo "Requested size ${SIZE_GB}GB > half of RAM (${MAX_SAFE}GB). Aborting unless --force passed." >&2
    exit 1
  fi

  echo "Creating ${SIZE_GB}G RAM disk at $MOUNT_POINT..."
  BLOCKS=$(( SIZE_GB * 1024 * 2048 )) # 512-byte blocks
  DEVICE=$(hdiutil attach -nomount ram://$BLOCKS)
  diskutil erasevolume HFS+ "$RAM_LABEL" $DEVICE >/dev/null

  mkdir -p "$MOUNT_POINT/DerivedData"
  echo "RAM disk mounted at $MOUNT_POINT"

  # Save current DerivedData location
  OLD=$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)
  if [[ -n "$OLD" ]]; then
    echo "$OLD" > "$PREV_SETTING_FILE"
    echo "Saved previous DerivedData location: $OLD"
  else
    echo "" > "$PREV_SETTING_FILE"
  fi

  # Optionally sync existing DerivedData to RAM disk
  mkdir -p "$BACKUP_DIR"
  echo "Syncing existing DerivedData into RAM disk (this can take a while) ..."
  rsync -a --delete "$HOME/Library/Developer/Xcode/DerivedData/" "$MOUNT_POINT/DerivedData/" || true

  # Set Xcode to use RAM disk as DerivedData
  defaults write com.apple.dt.Xcode IDECustomDerivedDataLocation -string "$MOUNT_POINT/DerivedData"
  echo "Xcode DerivedData location set to $MOUNT_POINT/DerivedData"
}

function stop_ramdisk() {
  if [[ ! -d "$MOUNT_POINT/DerivedData" ]]; then
    echo "RAM disk not mounted at $MOUNT_POINT; nothing to do."
    exit 0
  fi

  echo "Syncing DerivedData back to home (this may take some time) ..."
  rsync -a --delete "$MOUNT_POINT/DerivedData/" "$HOME/Library/Developer/Xcode/DerivedData/"

  # Restore previous DerivedData setting
  if [[ -f "$PREV_SETTING_FILE" ]]; then
    OLD=$(cat "$PREV_SETTING_FILE")
    if [[ -n "$OLD" ]]; then
      defaults write com.apple.dt.Xcode IDECustomDerivedDataLocation -string "$OLD"
      echo "Restored previous DerivedData location: $OLD"
    else
      defaults delete com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true
      echo "Removed custom DerivedData location (using default)."
    fi
    rm -f "$PREV_SETTING_FILE"
  fi

  # Unmount RAM disk
  echo "Detaching RAM disk at $MOUNT_POINT..."
  diskutil unmount force "$MOUNT_POINT" || true
  DEVICE_INFO=$(mount | grep "$MOUNT_POINT" || true)
  if [[ -z "$DEVICE_INFO" ]]; then
    echo "RAM disk unmounted."
  else
    echo "Warning: device still mounted: $DEVICE_INFO"
  fi
}

function status_ramdisk() {
  if [[ -d "$MOUNT_POINT/DerivedData" ]]; then
    echo "RAM disk mounted at $MOUNT_POINT"
    du -sh "$MOUNT_POINT/DerivedData" || true
    defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || echo 'Xcode using default DerivedData location'
  else
    echo "RAM disk not mounted."
  fi
}

case "${1:-}" in
  start)
    start_ramdisk "${2:-6}"
    ;;
  stop)
    stop_ramdisk
    ;;
  status)
    status_ramdisk
    ;;
  *)
    echo "Usage: $0 {start [SIZE_GB]|stop|status}"
    exit 1
    ;;
esac

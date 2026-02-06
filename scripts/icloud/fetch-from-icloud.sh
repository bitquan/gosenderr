#!/usr/bin/env bash
set -euo pipefail

# Fetch an archived tarball from iCloud Drive and extract it to destination.
# Usage: fetch-from-icloud.sh <archive-name> [dest_dir]

ARCHIVE_NAME="$1"
DEST_DIR="${2:-apps/_archive}"
ICLOUD_DIR="${3:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/gosenderr-archives}"

SRC_PATH="$ICLOUD_DIR/$ARCHIVE_NAME"
if [[ ! -f "$SRC_PATH" ]]; then
  echo "Archive not found in iCloud: $SRC_PATH" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

echo "Extracting $SRC_PATH -> $DEST_DIR"
# Extract into destination (strip leading directories if necessary)
 tar -xzf "$SRC_PATH" -C "$(dirname "$DEST_DIR")"

# If tar created the original folder name, ensure contents are moved to DEST_DIR
ORIG_BASENAME="${ARCHIVE_NAME%.tar.gz}"
if [[ -d "$(dirname "$DEST_DIR")/$ORIG_BASENAME" && "$(dirname "$DEST_DIR")/$ORIG_BASENAME" != "$DEST_DIR" ]]; then
  mv "$(dirname "$DEST_DIR")/$ORIG_BASENAME"/* "$DEST_DIR/" || true
  rmdir "$(dirname "$DEST_DIR")/$ORIG_BASENAME" || true
fi

echo "Restore complete. Files available at: $DEST_DIR"

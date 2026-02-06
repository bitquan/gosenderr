#!/usr/bin/env bash
set -euo pipefail

# Archive a folder into iCloud Drive and remove the original to free local space.
# Usage: archive-to-icloud.sh [source_dir] [dest_dir] [-y]

SOURCE_DIR="${1:-apps/_archive}"
ICLOUD_DIR="${2:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/gosenderr-archives}"
AUTO_YES=false
if [[ "${3:-}" == "-y" ]]; then
  AUTO_YES=true
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source folder '$SOURCE_DIR' not found or not a directory. Exiting." >&2
  exit 1
fi

mkdir -p "$ICLOUD_DIR"
TIMESTAMP=$(date +"%F_%H%M%S")
ARCHIVE_NAME="gosenderr-_archive-${TIMESTAMP}.tar.gz"
DEST_PATH="$ICLOUD_DIR/$ARCHIVE_NAME"

echo "About to archive '$SOURCE_DIR' -> '$DEST_PATH'"
if ! $AUTO_YES; then
  read -r -p "Proceed to archive and remove the original folder? [y/N] " answer || true
  case "$answer" in
    [Yy]*) ;;
    *) echo "Aborted by user."; exit 0;;
  esac
fi

# Create tar archive directly into iCloud drive
echo "Creating archive (this may take a while)..."
tar -czf "$DEST_PATH" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"

# Verify archive exists and has non-zero size
if [[ ! -s "$DEST_PATH" ]]; then
  echo "Archive failed or is empty at $DEST_PATH" >&2
  exit 1
fi

# Remove original folder to free space
echo "Archive created successfully at $DEST_PATH"
rm -rf "$SOURCE_DIR"

# Create a lightweight placeholder with instructions
mkdir -p "$SOURCE_DIR"
cat > "$SOURCE_DIR/README.md" <<EOF
This folder was archived to iCloud Drive by scripts/icloud/archive-to-icloud.sh
Archive: $DEST_PATH
To restore, run: scripts/icloud/fetch-from-icloud.sh "$ARCHIVE_NAME" "$SOURCE_DIR"
EOF

echo "Original folder removed and placeholder created at $SOURCE_DIR"
echo "Archive is available at: $DEST_PATH"

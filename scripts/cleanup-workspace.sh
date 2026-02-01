#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_DIR="${HOME}/gosenderr-cleanup-archives/$(date +%F_%H%M%S)"
DRY_RUN=false
NO_ARCHIVE=false

usage() {
  cat <<EOF
Usage: $0 [--dry-run] [--no-archive]

Interactive workspace cleanup script. Prompts before removing each candidate and
archives to $ARCHIVE_DIR by default.

Options:
  --dry-run    Show what would be done but don't delete or archive anything
  --no-archive Delete without creating archives (irreversible)
EOF
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --no-archive) NO_ARCHIVE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

confirm() {
  # prompt with default Yes
  local prompt="$1"
  local reply
  read -r -p "$prompt [Y/n] " reply || true
  case "$reply" in
    ""|[Yy]* ) return 0 ;;
    * ) return 1 ;;
  esac
}

print_size() {
  if [[ -e "$1" ]]; then
    du -sh "$1" 2>/dev/null || true
  else
    echo "0B\t$1"
  fi
}

archive_and_remove() {
  local path="$1"
  mkdir -p "$ARCHIVE_DIR"
  local name
  name="$(basename "$path")-$(date +%F_%H%M%S).tar.gz"
  echo "Archiving $path -> $ARCHIVE_DIR/$name"
  if $DRY_RUN; then
    echo "(dry-run) tar -czf $ARCHIVE_DIR/$name -C $(dirname "$path") $(basename "$path")"
  else
    tar -czf "$ARCHIVE_DIR/$name" -C "$(dirname "$path")" "$(basename "$path")"
    rm -rf "$path"
  fi
}

delete_path() {
  local path="$1"
  echo "Deleting $path"
  if $DRY_RUN; then
    echo "(dry-run) rm -rf $path"
  else
    rm -rf "$path"
  fi
}

safe_remove() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    echo "Skipped: $path not found"
    return
  fi
  echo
  echo "Candidate: $path"
  print_size "$path"

  # Git safety checks
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
      echo "Note: $path is tracked by git. Deleting it will require a commit or may remove tracked files."
      git status --short -- "$path"
      if ! confirm "Proceed to remove tracked files under $path? (this will NOT auto-commit)"; then
        echo "Skipping $path"
        return
      fi
    fi

    # check for uncommitted changes inside path
    if [[ -n "$(git status --porcelain -- "$path")" ]]; then
      echo "Warning: Uncommitted changes detected in $path. Aborting removal unless you confirm."
      git status --short -- "$path"
      if ! confirm "You have uncommitted changes under $path. Continue and delete anyway?"; then
        echo "Skipping $path"
        return
      fi
    fi
  fi

  # Ask whether to archive or delete directly
  if $NO_ARCHIVE; then
    if confirm "Delete $path permanently (no archive)?"; then
      delete_path "$path"
    else
      echo "Skipping $path"
    fi
  else
    if confirm "Archive and remove $path? (archive saved to $ARCHIVE_DIR)"; then
      archive_and_remove "$path"
    else
      if confirm "Delete $path permanently without archiving?"; then
        delete_path "$path"
      else
        echo "Skipping $path"
      fi
    fi
  fi
}

echo "Workspace cleanup script"
if $DRY_RUN; then
  echo "*** DRY RUN mode - no files will be removed ***"
fi
if $NO_ARCHIVE; then
  echo "*** NO ARCHIVE mode - files will be deleted directly ***"
else
  echo "Archives will be stored under: $ARCHIVE_DIR"
fi

# Show current disk usage summary
echo
echo "Current top-level disk usage:" 
du -sh * | sort -hr | sed -n '1,20p'

# Candidates list (only if they exist)
CANDIDATES=(
  "node_modules"
  "apps/_archive/shifter-app"
  "firebase/functions/node_modules"
  "apps/*/dist"
  "apps/*/.next"
  "apps/*/out"
  "firebase-export-*"
  "firebase-emulator-data"
)

for pattern in "${CANDIDATES[@]}"; do
  # Expand pattern
  matches=( $pattern )
  for p in "${matches[@]}"; do
    # Skip literal pattern if no match
    if [[ ! -e $p ]]; then
      continue
    fi
    safe_remove "$p"
  done
done

# Final summary
echo
echo "Final top-level disk usage:" 
du -sh * | sort -hr | sed -n '1,20p'

echo "Cleanup complete. If archives were created, you can remove them manually when you are confident they are not needed: rm -rf $ARCHIVE_DIR"


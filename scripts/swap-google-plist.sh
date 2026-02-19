#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_PLIST="$ROOT_DIR/apps/courieriosnativeclean/ios/Senderrappios/GoogleService-Info.plist"

usage() {
  cat <<'EOF'
Usage: swap-google-plist.sh <command> [args]

Commands:
  install <path-to-plist>   Install a production GoogleService-Info.plist (backs up existing)
  restore                   Restore the most recent backup (if any)
  status                    Show current plist PROJECT_ID / source

Notes:
  - This copies the plist into apps/courieriosnativeclean/ios/Senderrappios/
  - It will NOT commit changes; do NOT add the production plist to git.
  - If the target plist is tracked by git you will receive a warning.
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

command="$1"; shift || true

is_tracked_by_git() {
  git -C "$ROOT_DIR" ls-files --error-unmatch "${IOS_PLIST#/}" >/dev/null 2>&1 || return 1
}

show_status() {
  if [[ -f "$IOS_PLIST" ]]; then
    echo "Target plist: $IOS_PLIST"
    plutil -p "$IOS_PLIST" 2>/dev/null | grep -E "PROJECT_ID|API_KEY|GOOGLE_APP_ID" || echo "(plist present but key parsing failed)"
    if is_tracked_by_git; then
      echo "WARNING: $IOS_PLIST is tracked by git — do not commit a production plist"
    fi
  else
    echo "No plist found at $IOS_PLIST"
  fi
  echo "Available backups:"
  ls -1t "${IOS_PLIST}.dev-backup"* 2>/dev/null || echo "  (none)"
}

case "$command" in
  install)
    if [[ $# -ne 1 ]]; then
      echo "install requires a source plist path" >&2
      usage
      exit 1
    fi
    src="$1"
    if [[ ! -f "$src" ]]; then
      echo "error: source plist not found: $src" >&2
      exit 1
    fi

    mkdir -p "$(dirname "$IOS_PLIST")"

    if [[ -f "$IOS_PLIST" ]]; then
      backup="${IOS_PLIST}.dev-backup.$(date +%s)"
      cp "$IOS_PLIST" "$backup"
      echo "Backed up existing plist -> $backup"
    fi

    cp "$src" "$IOS_PLIST"
    chmod 600 "$IOS_PLIST"
    echo "Installed production plist into $IOS_PLIST"
    plutil -p "$IOS_PLIST" | grep -E "PROJECT_ID|API_KEY|GOOGLE_APP_ID" || true
    if is_tracked_by_git; then
      echo "WARNING: $IOS_PLIST is tracked by git — be careful not to commit it." >&2
    fi
    ;;

  restore)
    backups=("${IOS_PLIST}.dev-backup"*)
    if [[ ${#backups[@]} -eq 0 || ! -f "${backups[0]}" ]]; then
      echo "No backups found to restore." >&2
      exit 1
    fi
    # pick the newest
    newest=$(ls -1t "${IOS_PLIST}.dev-backup"* | head -n1)
    cp "$newest" "$IOS_PLIST"
    echo "Restored $IOS_PLIST from $newest"
    plutil -p "$IOS_PLIST" | grep -E "PROJECT_ID|API_KEY|GOOGLE_APP_ID" || true
    ;;

  status)
    show_status
    ;;

  *)
    echo "Unknown command: $command" >&2
    usage
    exit 1
    ;;
esac

#!/usr/bin/env bash
set -euo pipefail

# cleanup-mac.sh
# Safe, idempotent cleanup for macOS development artifacts used by this repo.
# Dry-run by default. Use --yes to actually delete.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRY_RUN=true
ERASE_SIMULATORS=false
PRUNE_PNPM=false
AUTO_INSTALL_LAUNCHD=false
LAUNCHD_PLIST_DEST="$HOME/Library/LaunchAgents/com.gosenderr.cleanup.plist"
SCRIPT_INSTALL_PATH="$HOME/.local/bin/gosenderr-cleanup.sh"

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --yes                 Apply the cleanup (default is dry-run)
  --simulators          Erase all iOS simulators (destructive)
  --pnpm-prune          Run 'pnpm store prune' where available
  --install-launchd     Install weekly launchd job (copies script to $SCRIPT_INSTALL_PATH)
  --uninstall-launchd   Uninstall the launchd job
  -h, --help            Show this help and exit

Examples:
  # Dry-run (default)
  $0

  # Apply cleanup and prune pnpm store
  $0 --yes --pnpm-prune

  # Install a weekly job (will suggest enabling via launchctl)
  $0 --install-launchd

Note: the script avoids sudo operations and won't touch external volumes.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) DRY_RUN=false; shift ;;
      --simulators) ERASE_SIMULATORS=true; shift ;;
      --pnpm-prune) PRUNE_PNPM=true; shift ;;
      --install-launchd) AUTO_INSTALL_LAUNCHD=true; shift ;;
      --uninstall-launchd) echo "Uninstalling launchd plist..."; rm -f "$LAUNCHD_PLIST_DEST" && launchctl unload "$LAUNCHD_PLIST_DEST" 2>/dev/null || true; exit 0 ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown arg: $1"; usage; exit 2 ;;
    esac
  done
}

sz() {
  # Human-readable du for a path, prints '-' when missing
  if [[ -e "$1" ]]; then du -sh "$1" 2>/dev/null | awk '{print $1 "\t" $2}'; else echo "-\t$1"; fi
}

report_sizes_before() {
  echo "\n== Sizes before cleanup =="
  echo "Repo pnpm store:"; sz "$REPO_ROOT/.pnpm-store"
  echo "CocoaPods cache:"; sz "$HOME/Library/Caches/CocoaPods"
  echo "Xcode DerivedData:"; sz "$HOME/Library/Developer/Xcode/DerivedData"
  echo "CoreSimulator devices:"; sz "$HOME/Library/Developer/CoreSimulator/Devices"
  echo "Project ios DerivedData/build (per app):"
  for d in "$REPO_ROOT"/apps/*/ios/DerivedData "$REPO_ROOT"/apps/*/ios/build; do
    [[ -d $d ]] && du -sh "$d" 2>/dev/null || true
  done
}

perform_cleanup() {
  echo "\n== Performing cleanup (apply=${DRY_RUN}) =="

  # 1) Project DerivedData/build
  for d in "$REPO_ROOT"/apps/*/ios/DerivedData "$REPO_ROOT"/apps/*/ios/build; do
    if [[ -d $d ]]; then
      if $DRY_RUN; then echo "DRY: rm -rf $d"; else echo "Removing $d"; rm -rf "$d"; fi
    fi
  done

  # 2) Repo pnpm store
  if [[ -d "$REPO_ROOT/.pnpm-store" ]]; then
    if $DRY_RUN; then echo "DRY: rm -rf $REPO_ROOT/.pnpm-store"; else rm -rf "$REPO_ROOT/.pnpm-store"; fi
  fi

  # 3) CocoaPods cache
  if [[ -d "$HOME/Library/Caches/CocoaPods" ]]; then
    if $DRY_RUN; then echo "DRY: rm -rf $HOME/Library/Caches/CocoaPods"; else rm -rf "$HOME/Library/Caches/CocoaPods"; fi
  fi

  # 4) Xcode DerivedData
  if [[ -d "$HOME/Library/Developer/Xcode/DerivedData" ]]; then
    if $DRY_RUN; then echo "DRY: rm -rf $HOME/Library/Developer/Xcode/DerivedData/*"; else rm -rf "$HOME/Library/Developer/Xcode/DerivedData/*"; fi
  fi

  # 5) CoreSimulator erase
  if $ERASE_SIMULATORS; then
    if $DRY_RUN; then echo "DRY: xcrun simctl erase all"; else xcrun simctl shutdown all || true; xcrun simctl erase all; fi
  fi

  # 6) pnpm prune
  if $PRUNE_PNPM && command -v pnpm >/dev/null; then
    if $DRY_RUN; then echo "DRY: pnpm store prune"; else pnpm store prune || true; fi
  fi

  echo "\n== Done cleanup step =="
}

install_launchd() {
  echo "\n== Install launchd weekly job =="
  mkdir -p "$(dirname "$SCRIPT_INSTALL_PATH")"
  # copy script itself to stable path
  if $DRY_RUN; then echo "DRY: copy $0 -> $SCRIPT_INSTALL_PATH"; else cp "$0" "$SCRIPT_INSTALL_PATH" && chmod +x "$SCRIPT_INSTALL_PATH"; fi

  cat > /tmp/com.gosenderr.cleanup.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.gosenderr.cleanup</string>
  <key>ProgramArguments</key>
  <array>
    <string>$SCRIPT_INSTALL_PATH</string>
    <string>--yes</string>
    <string>--pnpm-prune</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>0</integer>
    <key>Weekday</key>
    <integer>1</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/gosenderr-cleanup.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/gosenderr-cleanup.err</string>
</dict>
</plist>
PLIST

  if $DRY_RUN; then echo "DRY: Would install plist to $LAUNCHD_PLIST_DEST and load it"; else mv /tmp/com.gosenderr.cleanup.plist "$LAUNCHD_PLIST_DEST" && launchctl load -w "$LAUNCHD_PLIST_DEST"; echo "Installed and loaded $LAUNCHD_PLIST_DEST"; fi
}

main() {
  parse_args "$@"
  report_sizes_before
  if $AUTO_INSTALL_LAUNCHD; then install_launchd; exit 0; fi
  perform_cleanup
  echo "\n== Sizes after cleanup =="
  report_sizes_before
  echo "\nAudit finished. Review results above."
}

main "$@"

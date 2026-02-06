# Automated Cleanup (macOS)

This project contains a small maintenance script to keep developer machines tidy by removing common dev caches and build artifacts.

Files:

- `scripts/cleanup-mac.sh` — main script (dry-run by default). Supports `--yes`, `--pnpm-prune`, `--simulators`, `--install-launchd`.
- `scripts/launchd/com.gosenderr.cleanup.plist` — example launchd plist (edit username and intended paths before loading).

Usage examples:

- Dry-run (safe, shows what would be removed):

  ```bash
  ./scripts/cleanup-mac.sh
  ```

- Apply cleanup and prune pnpm store:

  ```bash
  ./scripts/cleanup-mac.sh --yes --pnpm-prune
  ```

- Erase all iOS simulators (destructive):

  ```bash
  ./scripts/cleanup-mac.sh --yes --simulators
  ```

- Install a weekly launchd job (will copy the script to `~/.local/bin` and install plist):

  ```bash
  ./scripts/cleanup-mac.sh --install-launchd
  # then edit ~/Library/LaunchAgents/com.gosenderr.cleanup.plist to correct paths if needed
  launchctl load -w ~/Library/LaunchAgents/com.gosenderr.cleanup.plist
  ```

Notes & Safety:

- The script avoids using `sudo` and does not touch external mounts by default.
- Dry-run is the default mode and strongly recommended for verification.
- The project’s `.pnpm-store` is removed (will be regenerated on the next `pnpm install`).

If you'd like, I can also add a small GitHub Action to run the script on a schedule and report repository disk usage in CI (non-destructive by default).

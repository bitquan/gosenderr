#!/usr/bin/env bash
set -euo pipefail

PROJECT=${1:-gosenderr-6773f}
TIMEOUT_SECONDS=${2:-20}
START_TS=$(date +%s)

# Shortcut: allow skipping the wait entirely (useful for fast dev)
if [[ "${SKIP_EMU_WAIT:-0}" == "1" ]]; then
  echo "⚠ Skipping emulator wait because SKIP_EMU_WAIT=1"
  exit 0
fi

# Increase default timeout (was 20s) — Docker + emulator startup can take longer.
# Can still be overridden via the second positional arg.
TIMEOUT_SECONDS=${2:-60}

echo "⏳ Waiting for Firebase emulators to become ready (project=${PROJECT})..."

while true; do
  # quick port checks
  nc -z 127.0.0.1 8080 >/dev/null 2>&1 || { sleep 1; continue; }
  nc -z 127.0.0.1 9099 >/dev/null 2>&1 || { sleep 1; continue; }
  nc -z 127.0.0.1 5001 >/dev/null 2>&1 || { sleep 1; continue; }

  # UI available (optional)
  curl -sSf http://127.0.0.1:4000/ >/dev/null 2>&1 || { sleep 1; continue; }

  # Prefer the admin endpoint when available; fall back to a known HTTP function (getPublicConfig)
  # Some emulator versions/configurations don't expose the admin endpoint — probe a public function instead.
  if curl -sSf "http://127.0.0.1:5001/emulator/v1/projects/${PROJECT}/functions" >/dev/null 2>&1 || \
     curl -sSf "http://127.0.0.1:5001/${PROJECT}/us-central1/getPublicConfigHttp" >/dev/null 2>&1; then
    echo "✅ Firebase emulators ready"
    break
  fi

  if [ $(( $(date +%s) - START_TS )) -ge ${TIMEOUT_SECONDS} ]; then
    echo "❌ Timed out waiting for emulators after ${TIMEOUT_SECONDS}s (elapsed=$(( $(date +%s) - START_TS ))s)"
    echo "▶ Tip: rerun with SKIP_EMU_WAIT=1 to skip, or call 'pnpm emu:wait <project> <seconds>' to increase timeout."
    exit 1
  fi
  sleep 1
done

# If a command was provided after --, run it
if [ "$#" -gt 2 ]; then
  shift 2 || true
  echo "▶ Running post-ready command: $*"
  exec "$@"
fi

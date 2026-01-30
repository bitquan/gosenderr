#!/usr/bin/env bash
set -euo pipefail

# Poll loop to wait for emulator UI and functions endpoint
UI_URL="http://127.0.0.1:4000/"
FUNCTIONS_PING="http://127.0.0.1:5001/gosenderr-6773f/us-central1/seedHubs"

TIMEOUT=${1:-60}
SLEEP=${2:-2}

echo "Waiting up to ${TIMEOUT}s for emulators..."

start=$(date +%s)
end=$((start + TIMEOUT))

while [ $(date +%s) -le $end ]; do
  ok_ui=0
  ok_fn=0

  if curl -sSf "$UI_URL" >/dev/null 2>&1; then
    ok_ui=1
  fi

  if curl -sSf "$FUNCTIONS_PING" >/dev/null 2>&1; then
    ok_fn=1
  fi

  if [ "$ok_ui" -eq 1 ] && [ "$ok_fn" -eq 1 ]; then
    echo "Emulators ready."
    exit 0
  fi

  echo "Waiting... (UI: $ok_ui, Functions: $ok_fn)"
  sleep "$SLEEP"
done

echo "Timed out waiting for emulators after ${TIMEOUT}s."
exit 2

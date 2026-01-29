#!/usr/bin/env bash
set -euo pipefail

REQUIRED=("ARCHITECTURE.md" "DEVELOPMENT.md" "DEPLOYMENT.md" "API_REFERENCE.md")
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MISSING=()

for f in "${REQUIRED[@]}"; do
  if [[ ! -f "$ROOT_DIR/docs/$f" ]]; then
    MISSING+=("$f")
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "Missing required docs: ${MISSING[*]}"
  exit 2
fi

# Basic TODO check (encourage not leaving TODOs in canonical docs)
if grep -R --exclude-dir=archive -n "TODO" "$ROOT_DIR/docs"; then
  echo "Found TODO markers in docs — please clean them up or mark them as drafts." || true
fi

echo "Docs check passed ✔️"

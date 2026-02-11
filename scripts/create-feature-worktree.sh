#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <feature-slug>"
  echo "Deprecated: use scripts/wt-new.sh <lane> <feature-slug>"
  exit 1
fi

feature="$1"
shift || true

echo "Deprecated helper detected. Redirecting to V1 senderrapp lane."
exec bash "$(cd "$(dirname "$0")" && pwd)/wt-new.sh" senderrapp "$feature" "$@"

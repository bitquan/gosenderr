#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi
cd "${repo_root}"

required=(
  "docs/apps/README.md"
  "docs/senderr_app/README.md"
  "docs/senderr_app/BRANCHING.md"
  "docs/senderr_app/ROADMAP.md"
  "docs/senderrplace/README.md"
  "docs/senderrplace/BRANCHING.md"
  "docs/senderrplace/ROADMAP.md"
  "docs/senderr_web/README.md"
  "docs/senderr_web/BRANCHING.md"
  "docs/senderr_web/ROADMAP.md"
  "docs/admin_app/README.md"
  "docs/admin_app/BRANCHING.md"
  "docs/admin_app/ROADMAP.md"
  "docs/admin_desktop/README.md"
  "docs/admin_desktop/BRANCHING.md"
  "docs/admin_desktop/ROADMAP.md"
  "docs/landing/README.md"
  "docs/landing/BRANCHING.md"
  "docs/landing/ROADMAP.md"
  "docs/backend/README.md"
  "docs/backend/BRANCHING.md"
  "docs/backend/ROADMAP.md"
  "docs/senderrplace_v2/AUDIT.md"
  "docs/senderrplace_v2/V2_PLANNING_TEMPLATE.md"
)

missing=()
for f in "${required[@]}"; do
  if [[ ! -f "${f}" ]]; then
    missing+=("${f}")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "missing canonical app templates:"
  printf ' - %s\n' "${missing[@]}"
  exit 2
fi

echo "app template verification passed"

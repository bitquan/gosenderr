#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/wt-check.sh [--branch=<name>] [--base=<name>] [--allow-main]

Behavior:
  - Enforces production-only main policy by default
  - Auto-selects base branch for V1 lanes
  - Runs scripts/validate-worktrees.js
USAGE
  exit 1
}

BRANCH=""
BASE=""
ALLOW_MAIN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --branch=*) BRANCH="${1#--branch=}" ;;
    --base=*) BASE="${1#--base=}" ;;
    --allow-main) ALLOW_MAIN=true ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
  shift
done

REPO_ROOT="$(git rev-parse --show-toplevel)"

if [ -z "$BRANCH" ]; then
  BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)"
fi

if [ "$BRANCH" = "main" ] && [ "$ALLOW_MAIN" = false ]; then
  echo "Blocked: main is production-only by policy." >&2
  echo "Create or switch to a feature branch under V1/<lane>/<feature>." >&2
  exit 4
fi

if [ -z "$BASE" ]; then
  case "$BRANCH" in
    V1/senderrapp/*) BASE="V1/base-senderrapp" ;;
    V1/senderrplace/*) BASE="V1/base-senderrplace" ;;
    V1/admin/*) BASE="V1/base-admin" ;;
    V1/base-*) BASE="main" ;;
    *) BASE="main" ;;
  esac
fi

echo "Branch: $BRANCH"
echo "Base:   $BASE"
BRANCH="$BRANCH" BASE_BRANCH="$BASE" node "$REPO_ROOT/scripts/validate-worktrees.js"

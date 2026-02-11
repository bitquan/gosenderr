#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/wt-new.sh <lane> <feature-slug> [options]

Lanes:
  senderrapp | senderrplace | admin

Options:
  --base=<branch>          Override default base branch
  --worktrees-root=<path>  Override worktrees root folder
  --sparse=<csv-paths>     Override default sparse checkout paths
  --no-sparse              Do not enable sparse checkout
  -h, --help               Show this help

Examples:
  scripts/wt-new.sh senderrapp map-shell-nav
  scripts/wt-new.sh senderrplace food-market --base=V1/base-senderrplace
USAGE
  exit 1
}

if [ $# -lt 2 ]; then
  usage
fi

LANE_RAW="$1"
FEATURE_RAW="$2"
shift 2

LANE="$(echo "$LANE_RAW" | tr '[:upper:]' '[:lower:]')"
FEATURE="$(echo "$FEATURE_RAW" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g')"

BASE_BRANCH=""
WORKTREES_ROOT=""
SPARSE_OVERRIDE=""
ENABLE_SPARSE=true

while [ $# -gt 0 ]; do
  case "$1" in
    --base=*) BASE_BRANCH="${1#--base=}" ;;
    --worktrees-root=*) WORKTREES_ROOT="${1#--worktrees-root=}" ;;
    --sparse=*) SPARSE_OVERRIDE="${1#--sparse=}" ;;
    --no-sparse) ENABLE_SPARSE=false ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
  shift
done

case "$LANE" in
  senderrapp)
    BASE_DEFAULT="V1/base-senderrapp"
    FEATURE_PREFIX="V1/senderrapp"
    SPARSE_DEFAULT="apps/senderr-app,apps/courieriosnativeclean,packages/shared,packages/ui,docs,scripts,.github"
    ;;
  senderrplace)
    BASE_DEFAULT="V1/base-senderrplace"
    FEATURE_PREFIX="V1/senderrplace"
    SPARSE_DEFAULT="apps/marketplace-app,apps/senderr-app,packages/shared,packages/ui,firebase/functions/src/senderrplace,docs,scripts,.github"
    ;;
  admin)
    BASE_DEFAULT="V1/base-admin"
    FEATURE_PREFIX="V1/admin"
    SPARSE_DEFAULT="apps/admin-app,apps/admin-desktop,packages/shared,packages/ui,firebase/functions,docs,scripts,.github"
    ;;
  *)
    echo "Invalid lane '$LANE'. Use: senderrapp | senderrplace | admin" >&2
    exit 2
    ;;
esac

if [ -z "$BASE_BRANCH" ]; then
  BASE_BRANCH="$BASE_DEFAULT"
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
if [ -z "$WORKTREES_ROOT" ]; then
  case "$REPO_ROOT" in
    */worktrees/*) WORKTREES_ROOT="$(dirname "$REPO_ROOT")" ;;
    *) WORKTREES_ROOT="$REPO_ROOT/worktrees" ;;
  esac
fi

mkdir -p "$WORKTREES_ROOT"

BRANCH_NAME="${FEATURE_PREFIX}/${FEATURE}"
WORKTREE_PATH="${WORKTREES_ROOT}/${LANE}-${FEATURE}"

echo "Repo root:      $REPO_ROOT"
echo "Lane:           $LANE"
echo "Feature branch: $BRANCH_NAME"
echo "Base branch:    $BASE_BRANCH"
echo "Worktree path:  $WORKTREE_PATH"

git -C "$REPO_ROOT" fetch --no-tags --prune --quiet origin || true

if ! git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/remotes/origin/$BASE_BRANCH"; then
    git -C "$REPO_ROOT" branch --track "$BASE_BRANCH" "origin/$BASE_BRANCH"
  else
    git -C "$REPO_ROOT" branch "$BASE_BRANCH" "origin/main"
    echo "Created local $BASE_BRANCH from origin/main"
    echo "Push it once with: git push -u origin $BASE_BRANCH"
  fi
fi

if ! git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  git -C "$REPO_ROOT" branch "$BRANCH_NAME" "$BASE_BRANCH"
fi

if [ -e "$WORKTREE_PATH" ]; then
  echo "Worktree path already exists: $WORKTREE_PATH" >&2
  exit 3
fi

git -C "$REPO_ROOT" worktree add "$WORKTREE_PATH" "$BRANCH_NAME"

if [ "$ENABLE_SPARSE" = true ]; then
  SPARSE_CSV="${SPARSE_OVERRIDE:-$SPARSE_DEFAULT}"
  IFS=',' read -r -a SPARSE_DIRS <<< "$SPARSE_CSV"
  git -C "$WORKTREE_PATH" sparse-checkout init --cone >/dev/null 2>&1 || true
  git -C "$WORKTREE_PATH" sparse-checkout set "${SPARSE_DIRS[@]}"
fi

cat > "$WORKTREE_PATH/.worktree-meta" <<META
lane=$LANE
feature=$FEATURE
branch=$BRANCH_NAME
base=$BASE_BRANCH
created_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
META

echo
echo "Done."
echo "Open:  $WORKTREE_PATH"
echo "Check: (cd $WORKTREE_PATH && bash scripts/wt-check.sh)"

#!/usr/bin/env bash
set -euo pipefail

# create-feature-worktree.sh
# Usage: scripts/create-feature-worktree.sh <feature-slug> [--apps="apps/senderr-app,apps/courieriosnativeclean"] [--base=<base-branch>] [--target-root=<absolute-path>]
# Example: ./scripts/create-feature-worktree.sh navigation --apps="apps/senderr-app,apps/courieriosnativeclean" --base=senderr_app --target-root=/Users/papadev/dev/apps/Gosenderr_local/worktrees/senderrplace-local

usage() {
  echo "Usage: $0 <feature-slug> [--apps=comma,separated,paths] [--base=base-branch] [--target-root=/abs/path]"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

FEATURE_SLUG="$1"
shift

# Defaults
APPS="apps/senderr-app,apps/courieriosnativeclean,packages/shared,packages/ui,docs/senderr_app,scripts,.vscode"
BASE_BRANCH="senderr_app"
TARGET_ROOT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --apps=*) APPS="${1#--apps=}"; shift ;;
    --base=*) BASE_BRANCH="${1#--base=}"; shift ;;
    --target-root=*) TARGET_ROOT="${1#--target-root=}"; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

# Determine repo root to base worktree placement on
# If --target-root provided, use that. Otherwise use git rev-parse top-level.
if [ -n "$TARGET_ROOT" ]; then
  REPO_ROOT="$TARGET_ROOT"
else
  REPO_ROOT="$(git rev-parse --show-toplevel)"
fi

if [ -z "$REPO_ROOT" ]; then
  echo "Error: not in a git repository and no --target-root provided" >&2
  exit 1
fi

# If the script was run from inside another feature worktree, warn user if they didn't pass --target-root
if [[ "$REPO_ROOT" == *"/worktrees/"* ]] && [ -z "$TARGET_ROOT" ]; then
  echo "Warning: you appear to be inside an existing worktree path: ${REPO_ROOT}" >&2
  echo "This will create the new worktree under the current worktree's root. If you intended to create it centrally, re-run from the monorepo root or pass --target-root=<repo-root>" >&2
fi

# Normalize branch & worktree names
BRANCH_NAME="senderr-app/feature/${FEATURE_SLUG}"
WORKTREE_DIR="${REPO_ROOT}/worktrees/${FEATURE_SLUG}"

echo "Creating feature worktree:"
echo " - repo (used as base): ${REPO_ROOT}"
echo " - feature: ${FEATURE_SLUG}"
echo " - branch: ${BRANCH_NAME}"
echo " - worktree: ${WORKTREE_DIR}"

echo "Checking out base branch '${BASE_BRANCH}' to create feature branch..."
# Make sure base branch exists locally
if ! git show-ref --verify --quiet "refs/heads/${BASE_BRANCH}"; then
  echo "Base branch '${BASE_BRANCH}' not found locally. Attempting to fetch..."
  git fetch origin "${BASE_BRANCH}:${BASE_BRANCH}" || true
fi

# Create branch (from base branch) if it doesn't exist
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  echo "Branch ${BRANCH_NAME} already exists locally. Reusing it."
else
  echo "Creating branch ${BRANCH_NAME} from ${BASE_BRANCH}"
  git branch "${BRANCH_NAME}" "${BASE_BRANCH}"
fi

# If a worktree path already exists, warn
if [ -d "${WORKTREE_DIR}" ]; then
  echo "Worktree directory already exists: ${WORKTREE_DIR}" >&2
  echo "If this is intentional, you can open it. Exiting to avoid clobbering." >&2
  exit 1
fi

# Create the worktree
echo "Adding git worktree at: ${WORKTREE_DIR}"
git worktree add --checkout "${WORKTREE_DIR}" "${BRANCH_NAME}"

# Configure sparse-checkout inside the worktree (cone mode)
pushd "${WORKTREE_DIR}" >/dev/null

git sparse-checkout init --cone >/dev/null || true

# Convert comma-separated list to space-separated directories
IFS=',' read -ra DIRS <<< "${APPS}"

echo "Setting sparse-checkout dirs:"
for d in "${DIRS[@]}"; do
  echo " - ${d}"
done

git sparse-checkout set ${DIRS[*]}

# Add a simple README and convenience package.json if they don't exist
WORKTREE_README="README.md"
if [ ! -f "${WORKTREE_README}" ]; then
  cat > "${WORKTREE_README}" <<MD
# Feature worktree: ${FEATURE_SLUG}

This worktree is focused on the feature: **${FEATURE_SLUG}**.
It contains a small subset of the monorepo (sparse-checkout) to provide a lightweight workspace for development.

Included paths:
$(printf '%s
' "${DIRS[@]}" | sed 's/^/ - /')

Quick commands (from this worktree root):
- Start web (delegates to monorepo):
  cd "${REPO_ROOT}" && pnpm --filter @gosenderr/senderr-app dev
- Start Metro for courier (from this worktree):
  cd "${REPO_ROOT}/apps/courieriosnativeclean" && npx react-native start --reset-cache

Branch policy:
- Feature branch: ${BRANCH_NAME}
- Keep commits focused and small. Rebase when baseline updates.
MD
  git add "${WORKTREE_README}"
fi

# Add a small local package.json with helper scripts for convenience
if [ ! -f package.json ]; then
  cat > package.json <<JSON
{
  "name": "feature-${FEATURE_SLUG}-worktree",
  "private": true,
  "scripts": {
    "start:web": "cd ${REPO_ROOT} && pnpm --filter @gosenderr/senderr-app dev",
    "start:metro": "cd ${REPO_ROOT}/apps/courieriosnativeclean && npx react-native start --reset-cache",
    "ios": "cd ${REPO_ROOT} && pnpm --filter courieriosnativeclean ios"
  }
}
JSON
  git add package.json
fi

# Add a minimal .vscode/tasks.json for common tasks
mkdir -p .vscode
if [ ! -f .vscode/tasks.json ]; then
  cat > .vscode/tasks.json <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "📱 Start Senderr Web (${FEATURE_SLUG})",
      "type": "shell",
      "command": "pnpm run start:web",
      "isBackground": true
    },
    {
      "label": "📱 Metro (${FEATURE_SLUG})",
      "type": "shell",
      "command": "pnpm run start:metro",
      "isBackground": true
    }
  ]
}
JSON
  git add .vscode/tasks.json
fi

# Commit the scaffolding files
if git diff --staged --quiet; then
  echo "No scaffold changes to commit."
else
  git commit -m "chore(worktree): scaffold ${FEATURE_SLUG} worktree with README and dev tasks"
fi

popd >/dev/null

cat <<MSG
Success: Feature worktree created.
 - Worktree path: ${WORKTREE_DIR}
 - Branch: ${BRANCH_NAME}
Next steps:
 - Open the worktree: code "${WORKTREE_DIR}"
 - Start the web or Metro tasks via the local package.json or VS Code tasks
 - Create a short worktree plan document under docs/ (e.g., docs/senderr_app/${FEATURE_SLUG}-worktree-plan.md)
 - When ready, push the branch and open a PR against the baseline branch

MSG

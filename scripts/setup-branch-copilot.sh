#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi

cd "${repo_root}"

branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"
if [[ "${branch}" == "HEAD" ]]; then
  echo "error: detached HEAD is not supported"
  exit 1
fi

profile_dir=".github/copilot/branches"
slug="${branch//\//-}"
profile_file="${profile_dir}/${slug}.md"

mkdir -p "${profile_dir}"

if [[ -f "${profile_file}" ]]; then
  echo "branch profile already exists: ${profile_file}"
  exit 0
fi

prefix="${branch%%/*}"
suffix="${branch##*/}"

branch_mode="feature"
if [[ "${suffix}" == "main" ]]; then
  branch_mode="mainline"
elif [[ "${suffix}" == "clone" ]]; then
  branch_mode="clone / experimental"
fi

product_area="General"
primary_paths="."
cmd_1="pnpm lint"
cmd_2="pnpm test"

case "${prefix}" in
  marketplace)
    product_area="Marketplace"
    primary_paths="apps/marketplace-app"
    cmd_1="pnpm --filter @gosenderr/marketplace-app dev"
    cmd_2="pnpm --filter @gosenderr/marketplace-app build"
    ;;
  senderr-app)
    product_area="Senderr Workspace"
    primary_paths=".github docs apps/senderr-app apps/marketplace-app apps/courieriosnativeclean"
    cmd_1="bash scripts/git-branch-assist.sh status"
    cmd_2="pnpm lint"
    ;;
  senderr)
    product_area="Senderr Web App"
    primary_paths="apps/senderr-app"
    cmd_1="pnpm --filter @gosenderr/senderr-app dev"
    cmd_2="pnpm --filter @gosenderr/senderr-app build"
    ;;
  senderr-ios)
    product_area="Senderr iOS Native"
    primary_paths="apps/courieriosnativeclean/ios"
    cmd_1="pnpm run ios:bootstrap"
    cmd_2="open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace"
    ;;
esac

cat > "${profile_file}" <<EOF
# Branch Profile: \`${branch}\`

## Intent

- Branch mode: \`${branch_mode}\`
- Product area: \`${product_area}\`

## Scope

- Primary paths:
  - \`${primary_paths}\`

## Build and test commands

- \`${cmd_1}\`
- \`${cmd_2}\`

## Git workflow for this branch

- Work only in this branch unless explicitly requested to switch.
- Keep commits scoped to this branch purpose.
- Use conventional commit messages with a clear scope.
- Push back to the same branch by default.

## Done criteria

- Changes are validated for this branch scope.
- This profile stays current when branch purpose changes.
EOF

echo "created branch profile: ${profile_file}"
echo "tip: run 'bash scripts/git-branch-assist.sh setup' for upstream/setup checks"

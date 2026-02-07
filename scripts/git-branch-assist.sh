#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/git-branch-assist.sh status
  bash scripts/git-branch-assist.sh setup
  bash scripts/git-branch-assist.sh sync
  bash scripts/git-branch-assist.sh save "<commit message>"
EOF
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi
cd "${repo_root}"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${branch}" == "HEAD" ]]; then
  echo "error: detached HEAD is not supported"
  exit 1
fi

cmd="${1:-}"

has_upstream() {
  git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1
}

case "${cmd}" in
  status)
    echo "branch: ${branch}"
    git status -sb
    ;;

  setup)
    bash scripts/setup-branch-copilot.sh "${branch}"
    if has_upstream; then
      echo "upstream already set: $(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}')"
    else
      echo "setting upstream to origin/${branch}"
      git push -u origin "${branch}:${branch}"
    fi
    ;;

  sync)
    git fetch --all --prune
    if has_upstream; then
      git pull --rebase --autostash
    else
      echo "no upstream set for ${branch}; run setup first"
      exit 1
    fi
    ;;

  save)
    msg="${2:-}"
    if [[ -z "${msg}" ]]; then
      echo "error: commit message is required"
      usage
      exit 1
    fi

    git add -A
    if git diff --cached --quiet; then
      echo "nothing to commit"
      exit 0
    fi

    git commit -m "${msg}"
    if has_upstream; then
      git push
    else
      git push -u origin "${branch}:${branch}"
    fi
    ;;

  *)
    usage
    exit 1
    ;;
esac


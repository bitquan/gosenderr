#!/usr/bin/env bash

set -euo pipefail

mode="${1:-dry-run}"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi
cd "${repo_root}"

git fetch --all --prune

current_branch="$(git branch --show-current)"

worktree_branches=()
while IFS= read -r b; do
  [[ -n "$b" ]] && worktree_branches+=("$b")
done < <(git worktree list --porcelain | awk '/^branch / {sub("refs/heads/","",$2); print $2}')

is_worktree_branch() {
  local needle="$1"
  for b in "${worktree_branches[@]}"; do
    if [[ "$b" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

merged=()
while IFS= read -r b; do
  [[ -n "$b" ]] && merged+=("$b")
done < <(git branch --merged senderr_app | sed 's/^[* ]*//' | awk 'NF')

delete_list=()
for b in "${merged[@]}"; do
  case "$b" in
    main|senderr_app|"$current_branch")
      continue
      ;;
  esac
  if is_worktree_branch "$b"; then
    continue
  fi
  delete_list+=("$b")
done

echo "candidate local branches merged into senderr_app:"
if [[ ${#delete_list[@]} -eq 0 ]]; then
  echo " - none"
else
  printf ' - %s\n' "${delete_list[@]}"
fi

if [[ "${mode}" != "apply" ]]; then
  echo
  echo "dry-run only. apply deletions with:"
  echo "  bash scripts/cleanup-branches.sh apply"
  exit 0
fi

for b in "${delete_list[@]}"; do
  git branch -d "$b"
done

echo "done"

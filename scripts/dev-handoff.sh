#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-handoff.sh --summary "what changed" --next "next action" [options]

Options:
  --summary   Required. Short summary of what changed.
  --next      Required. Next concrete action.
  --status    Optional. in_progress | blocked | done (default: in_progress)
  --issue     Optional. Issue id or label (example: #126)
  --pr        Optional. PR id or URL (example: #173)
  --blockers  Optional. Blockers text (default: None)
  --files     Optional. Comma-separated paths touched.
EOF
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "error: run this script inside a git repository"
  exit 1
fi
cd "${repo_root}"

summary=""
next_action=""
status="in_progress"
issue="n/a"
pr="n/a"
blockers="None"
files_csv=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --summary)
      summary="${2:-}"
      shift 2
      ;;
    --next)
      next_action="${2:-}"
      shift 2
      ;;
    --status)
      status="${2:-}"
      shift 2
      ;;
    --issue)
      issue="${2:-}"
      shift 2
      ;;
    --pr)
      pr="${2:-}"
      shift 2
      ;;
    --blockers)
      blockers="${2:-}"
      shift 2
      ;;
    --files)
      files_csv="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${summary}" || -z "${next_action}" ]]; then
  echo "error: --summary and --next are required"
  usage
  exit 1
fi

case "${status}" in
  in_progress|blocked|done)
    ;;
  *)
    echo "error: --status must be one of: in_progress, blocked, done"
    usage
    exit 1
    ;;
esac

branch="$(git rev-parse --abbrev-ref HEAD)"
commit="$(git rev-parse --short HEAD)"
local_ts="$(date '+%Y-%m-%d %H:%M')"
utc_ts="$(date -u '+%Y-%m-%d %H:%M')"

if [[ -n "$(git status --porcelain)" ]]; then
  tree_state="dirty"
else
  tree_state="clean"
fi

worklog_file="docs/dev/WORKLOG.md"
session_state_file="docs/dev/SESSION_STATE.md"

mkdir -p "docs/dev"
touch "${worklog_file}"

files_block=""
if [[ -n "${files_csv}" ]]; then
  IFS=',' read -r -a files_array <<< "${files_csv}"
  for f in "${files_array[@]}"; do
    trimmed="$(echo "${f}" | xargs)"
    if [[ -n "${trimmed}" ]]; then
      files_block+=$'\n'"  - \`${trimmed}\`"
    fi
  done
fi

if [[ -z "${files_block}" ]]; then
  files_block+=$'\n'"  - (not provided)"
fi

cat >> "${worklog_file}" <<EOF

---

## ${local_ts} local (${utc_ts} UTC)

- Status: \`${status}\`
- Summary: ${summary}
- Branch: \`${branch}\`
- Commit: \`${commit}\`
- Issue: \`${issue}\`
- PR: \`${pr}\`
- Files:${files_block}
- Blockers: ${blockers}
- Next:
  - ${next_action}
EOF

cat > "${session_state_file}" <<EOF
# Session State (Source of Truth)

This file is the canonical handoff state when a chat/session is interrupted.

## Last Updated

- Local: ${local_ts}
- UTC: ${utc_ts}

## Current Focus

- Active issue: ${issue}
- Active PR: ${pr}
- Objective: ${summary}

## Branch + Commit

- Branch: \`${branch}\`
- Commit: \`${commit}\`
- Working tree: ${tree_state}

## Blockers

- ${blockers}

## Next Actions

1. ${next_action}
2. Re-open \`docs/dev/WORKLOG.md\` and append after each meaningful change.
3. Keep this file current at task boundaries.

## Recovery Commands

\`\`\`bash
cd ${repo_root}
git checkout ${branch}
git pull --rebase
sed -n '1,200p' docs/dev/SESSION_STATE.md
sed -n '1,200p' docs/dev/WORKLOG.md
\`\`\`

## References

- Playbook: \`docs/DEVELOPER_PLAYBOOK.md\`
- App docs index: \`docs/apps/README.md\`
- Senderr iOS docs: \`docs/senderr_app/README.md\`
EOF

echo "updated:"
echo "  - ${session_state_file}"
echo "  - ${worklog_file}"

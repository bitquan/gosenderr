# Session State (Source of Truth)

This file is the canonical handoff state when a chat/session is interrupted.

## Last Updated

- Local: 2026-02-07 14:44
- UTC: 2026-02-07 19:44

## Current Focus

- Active issue: #203
- Active PR: n/a
- Objective: implement realtime jobs sync + reconnect state; patched auth role check to handle temporary Firestore offline using recent role cache

## Branch + Commit

- Branch: `codex/issue-203-realtime-jobs-sync`
- Commit: `working tree`
- Working tree: dirty (expected during implementation)

## Blockers

- None

## Next Actions

1. finish #203 app-level jobs subscription wiring + tests/docs
2. run validation (`tsc`, ios smoke, docs checks), then open PR linked to #203
2. Re-open `docs/dev/WORKLOG.md` and append after each meaningful change.
3. Keep this file current at task boundaries.

## Recovery Commands

```bash
cd /Users/papadev/dev/apps/Gosenderr_Dev_Folder/gosenderr
git checkout codex/issue-203-realtime-jobs-sync
git pull --rebase
sed -n '1,200p' docs/dev/SESSION_STATE.md
sed -n '1,200p' docs/dev/WORKLOG.md
```

## References

- Playbook: `docs/DEVELOPER_PLAYBOOK.md`
- App docs index: `docs/apps/README.md`
- Senderr iOS docs: `docs/senderr_app/README.md`

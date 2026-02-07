# Session State (Source of Truth)

This file is the canonical handoff state when a chat/session is interrupted.

## Last Updated

- Local: 2026-02-07 15:54
- UTC: 2026-02-07 20:54

## Current Focus

- Active issue: #203
- Active PR: #214
- Objective: implement realtime jobs sync + reconnect state; harden auth role verification to tolerate transient Firestore offline failures using ID token claims and cached role fallback

## Branch + Commit

- Branch: `codex/issue-203-realtime-jobs-sync`
- Commit: `working tree`
- Working tree: dirty (expected during implementation)

## Blockers

- None

## Next Actions

1. finish #203 app-level jobs subscription wiring + tests/docs
2. run validation (`tsc`, ios smoke, docs checks), then open PR linked to #203
3. Re-open `docs/dev/WORKLOG.md` and append after each meaningful change.
4. Keep this file current at task boundaries.

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

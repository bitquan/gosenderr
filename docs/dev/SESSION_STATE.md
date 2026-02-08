# Session State (Source of Truth)

This file is the canonical handoff state when a chat/session is interrupted.

## Last Updated

- Local: 2026-02-08 00:07
- UTC: 2026-02-08 05:07

## Current Focus

- Active issue: #204
- Active PR: n/a
- Objective: Hardened location tracking state lifecycle and map follow behavior for courier runtime

## Branch + Commit

- Branch: `codex/issue-204-location-upload`
- Commit: `507229e`
- Working tree: clean

## Blockers

- None

## Next Actions

1. Validate #204 on-device across Dashboard/Settings tab switches and confirm location writes stay active
2. Re-open `docs/dev/WORKLOG.md` and append after each meaningful change.
3. Keep this file current at task boundaries.

## Recovery Commands

```bash
cd /Users/papadev/dev/apps/Gosenderr_local/gosenderr
git checkout codex/issue-204-location-upload
git pull --rebase
sed -n '1,200p' docs/dev/SESSION_STATE.md
sed -n '1,200p' docs/dev/WORKLOG.md
```

## References

- Playbook: `docs/DEVELOPER_PLAYBOOK.md`
- App docs index: `docs/apps/README.md`
- Senderr iOS docs: `docs/senderr_app/README.md`

# Worktree Operating Model

Last verified: 2026-02-09

## Goal
Keep local testing stable while parallel issue work continues.

## Stable Worktrees

### Senderr
- `senderr-live`: merged baseline only (default QA run target)
- `senderr-shell`: map shell layout/overlay/camera/route work
- `senderr-settings`: settings/profile/permissions/rate cards
- `senderr-ops`: jobs feed/sync/notifications/integration behavior

### Senderrplace (Marketplace)
- `senderrplace-live`: merged baseline only
- `senderrplace-ui`: listing/browse/detail/seller UX
- `senderrplace-settings`: onboarding/profile/address/rates toggles
- `senderrplace-ops`: orders/availability/backend integration

### Admin Web
- `admin-live`: merged baseline only
- `admin-ui`: page/layout/form UX
- `admin-settings`: flags/config/security UI
- `admin-ops`: firestore/functions jobs/audit integrations

## Rules
1. Branch issue work from the matching domain worktree only.
2. Keep `*-live` worktrees on merged baseline only.
3. Test latest cross-feature behavior in `*-live` only.
4. Update the matching worktree log on every push.
5. Fast-forward `*-live` after merges.

## Branch Naming
- Stable local branches: `local/wt-<product>-<domain>`
- Issue branches: `codex/issue-<id>-<short-topic>`

## Daily Commands

```bash
# sync all stable worktrees
bash scripts/worktree-sync.sh

# quick status report
bash scripts/worktree-status.sh
```


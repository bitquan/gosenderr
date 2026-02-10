# GoSenderr Developer Playbook

This is the repo-wide operating guide for developers.

If you follow this file exactly, you avoid the common setup and branch mistakes.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `monthly`
> - Status: `up to date`

## 1) Canonical repo + apps

- Repo root:
  - `<repo-root>` (run `git rev-parse --show-toplevel`)
- Active apps:
  - `apps/marketplace-app` (Senderrplace)
  - `apps/senderr-app` (Senderr web)
  - `apps/courieriosnativeclean` (Senderr iOS native)
  - `apps/admin-app`
  - `apps/admin-desktop`
  - `apps/landing`
- Archive only:
  - `apps/_archive/*`

Do not do active work from archived paths.

## 2) First-time setup

Run from repo root:

```bash
cp .env.example .env.local
cp apps/marketplace-app/.env.example apps/marketplace-app/.env.local
cp apps/landing/.env.example apps/landing/.env.local
pnpm install --frozen-lockfile
```

For Senderr iOS native:

```bash
pnpm run ios:senderr
```

This runs install checks and iOS setup.

## 3) Branch + worktree workflow (required)

Current app stream base branch:

- `senderr_app`

Default flow (recommended):

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
git checkout senderr_app
git pull --ff-only origin senderr_app
bash scripts/create-worktree.sh \
  codex/issue-<issue-number>-<short-slug> \
  "$HOME/dev/apps/Gosenderr_local/worktrees/issue-<issue-number>" \
  <template-key>
cd "$HOME/dev/apps/Gosenderr_local/worktrees/issue-<issue-number>"
```

`<template-key>` must be one of:

- `senderr_ios_native`
- `senderr_web`
- `senderrplace`
- `admin_app`
- `admin_desktop`
- `landing`
- `backend`

Branch naming policy:

- `codex/issue-<issue-number>-<short-slug>` for issue work
- `codex/chore-<short-slug>` for non-issue maintenance

Examples:

- `codex/issue-235-senderrplace-v2-domain-contract`
- `codex/chore-ci-path-scoping`

For direct branch setup (no new worktree):

```bash
git checkout senderr_app
git pull --ff-only origin senderr_app
git checkout -b codex/issue-<issue-number>-<short-slug>
bash scripts/setup-branch-copilot.sh
```

## 4) Day-to-day git commands

Use branch helper commands from repo root:

```bash
bash scripts/git-branch-assist.sh status
bash scripts/git-branch-assist.sh sync
bash scripts/git-branch-assist.sh save "type(scope): short message"
```

Always sync before coding:

```bash
git fetch origin --prune
git rebase origin/senderr_app
```

## 5) Run each app

From repo root:

- Marketplace web:
  - `pnpm --filter @gosenderr/marketplace-app dev`
- Senderr web:
  - `pnpm --filter @gosenderr/senderr-app dev`
- Admin web:
  - `pnpm --filter @gosenderr/admin-app dev`
- Admin desktop:
  - `pnpm dev:admin-desktop`
- All web apps:
  - `pnpm dev`

## 6) Senderr iOS native workflow

Canonical project:

- Workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Scheme: `Senderr`

Open in Xcode:

```bash
open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace
```

Metro (for simulator/device):

```bash
cd apps/courieriosnativeclean
npx react-native start --reset-cache
```

Physical device:

- Keep phone and Mac on the same Wi-Fi.
- Set Metro host to your Mac LAN IP if needed.

## 7) CI + PR requirements

Before PR:

```bash
pnpm lint
pnpm type-check
pnpm build
```

For iOS branch work:

```bash
pnpm run ios:build:verify
```

Open PR to:

- `senderr_app` for current Senderr stream work

PR checklist policy (required):

- select exactly one in PR body:
  - `handoff: updated`
  - `handoff: not needed`

Lifecycle milestone guidance:

- When a PR or issue is intended to be part of a Lifecycle milestone (M1–M5), set the GitHub milestone accordingly or include `Lifecycle: Mx` in the PR/issue body. A lightweight workflow will try to assign the milestone automatically. During rollout the milestone is optional; maintainers may require it for milestone review PRs.

CI scope policy (current):

- `.github/workflows/senderr_app-ci.yml` now runs only for Senderr iOS-related path changes.
- `.github/workflows/ci.yml` uses change detection and skips heavy jobs when unrelated paths were changed.
- If a job is skipped because the path scope did not match, that is expected behavior.

Issue execution policy:

- work in batches of `3-5` issues.
- still keep `one issue = one branch/worktree = one PR`.

## 8) Common failures and exact fixes

`ERR_PNPM_NO_PKG_MANIFEST`:

- You are not in repo root.
- Fix:
  - `cd "$(git rev-parse --show-toplevel)"`

`No Podfile found`:

- You are in wrong iOS directory.
- Fix:
  - `cd apps/courieriosnativeclean/ios`

`The sandbox is not in sync with Podfile.lock`:

```bash
pnpm run ios:clean:install
```

`No such module FirebaseCore` in Xcode:

- Pods are stale or workspace is wrong.
- Fix sequence:
  - `pnpm run ios:clean:install`
  - Open `.xcworkspace` (not `.xcodeproj`)

`Could not connect to localhost:8081` on phone:

- Metro not reachable from device.
- Fix:
  - Start Metro from `apps/courieriosnativeclean`
  - Use Mac LAN IP for Metro host on device

`Build input file cannot be found ... GoogleService-Info.plist`:

- The iOS Firebase plist is missing in that worktree path.
- Fix:
  - Add `GoogleService-Info.plist` to `apps/courieriosnativeclean/ios/Senderrappios/`.
  - Confirm plist bundle id matches iOS target bundle id.

## 9) Source of truth docs

- Repo overview: `README.md`
- App docs index: `docs/apps/README.md`
- Senderr iOS docs: `docs/senderr_app/README.md`
- Minimal disk setup: `docs/dev/MINIMAL-SETUP.md`
- Docs ownership + review cadence: `docs/DOCS_OWNERSHIP.md`

## 10) Session recovery logs (required)

Use these two files as persistent memory:

- Current handoff state: `docs/dev/SESSION_STATE.md`
- Append-only history: `docs/dev/WORKLOG.md`

Update both with one command:

```bash
bash scripts/dev-handoff.sh \
  --summary "implemented X and validated Y" \
  --next "start issue #NNN" \
  --status in_progress \
  --issue "#NNN" \
  --pr "#PPP" \
  --files "path/a,path/b"
```

Run this command:

- at the end of each major coding block
- before switching branches
- before opening a PR
- before ending a session

PR handoff policy:

- Mandatory:
  - Any PR with behavior, setup, config, CI, workflow, or process changes must use `scripts/dev-handoff.sh` and set PR template checkbox `handoff: updated`.
- Optional:
  - Docs-only and metadata-only PRs may skip log updates only if there is no behavior/process/setup impact, and must set PR template checkbox `handoff: not needed`.
- Enforcement:
  - CI validates that exactly one handoff checkbox is selected in every PR.

## 11) Branch cleanup

Dry-run cleanup:

```bash
bash scripts/cleanup-branches.sh
```

Apply cleanup:

```bash
bash scripts/cleanup-branches.sh apply
```

Note:

- A branch cannot be deleted while attached to an active worktree.

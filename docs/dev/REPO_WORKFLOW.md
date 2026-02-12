# Repo Workflow (Local + Git)

This is the short, practical guide for using this repo correctly day-to-day.

If something conflicts with this doc, treat these as higher priority sources of truth:

- `docs/BLUEPRINT.md`
- `docs/DEVELOPER_PLAYBOOK.md`
- `docs/dev/WORKTREE_POLICY.md`
- `docs/senderr_app/BRANCHING.md`

---

## Non‑negotiable rules

- `main` is production-only. Do not develop directly on `main`.
- Use one branch per concern, and ideally one branch per worktree.
- Do not modify `apps/_archive/*` unless explicitly doing archival work.
- Before pushing, run the repo validation for your worktree/branch.

---

## Recommended workflow (V1 lanes + worktrees)

This repo supports a lane/base model.

- Baselines (long-lived):
  - `V1/base-senderrapp`
  - `V1/base-senderrplace`
  - `V1/base-admin`
- Feature branches (short-lived):
  - `V1/senderrapp/<feature-slug>`
  - `V1/senderrplace/<feature-slug>`
  - `V1/admin/<feature-slug>`

### 1) Sync baselines

From repo root:

```bash
bash scripts/wt-sync.sh all
```

### 2) Create a worktree for your lane

```bash
bash scripts/wt-new.sh senderrapp my-feature
# or
bash scripts/wt-new.sh senderrplace my-feature
# or
bash scripts/wt-new.sh admin my-feature
```

This creates:

- a lane-scoped branch
- a lane-scoped worktree folder (one branch = one worktree)
- (optionally) sparse checkout for speed

### 3) Validate scope before you push

From inside the worktree you’re working in:

```bash
bash scripts/wt-check.sh
```

If you’re on `main`, this will fail by policy (unless you pass `--allow-main`).

---

## Git workflow (branch discipline)

### Branch profile (Copilot + human handoff)

Run once per branch (creates `.github/copilot/branches/<branch>.md`):

```bash
bash scripts/setup-branch-copilot.sh
```

### Daily branch helpers

```bash
bash scripts/git-branch-assist.sh status
bash scripts/git-branch-assist.sh sync
bash scripts/git-branch-assist.sh save "type(scope): summary"
```

---

## Local dev commands

Install (repo root):

```bash
pnpm install --frozen-lockfile
```

Common checks (repo root):

```bash
pnpm lint
pnpm type-check
pnpm build
```

Run apps (repo root):

- Admin app: `pnpm --filter @gosenderr/admin-app dev`
- Marketplace app: `pnpm --filter @gosenderr/marketplace-app dev`
- Senderr app: `pnpm --filter @gosenderr/senderr-app dev`
- All apps: `pnpm dev`

---

## PR requirements that can break CI

### 1) PR template handoff checkbox (required)

CI enforces that the PR description selects **exactly one**:

- `handoff: updated` (behavior/setup/config/process changed)
- `handoff: not needed` (docs-only / metadata-only / automation cleanup PR)

If neither (or both) are selected, **CI fails** with “PR Handoff Checklist”.

### 2) Session handoff files (when behavior changes)

When behavior/setup/process changes, update the persistent handoff docs:

- `docs/dev/SESSION_STATE.md`
- `docs/dev/WORKLOG.md`

Use the helper:

```bash
bash scripts/dev-handoff.sh \
  --summary "what changed" \
  --next "next step" \
  --status in_progress \
  --issue "#NNN" \
  --pr "#PPP" \
  --files "path/a,path/b"
```

---

## Resolving merge conflicts (common case)

When GitHub says:

> This branch has conflicts that must be resolved

Do this locally in the PR/worktree:

```bash
git fetch origin --prune
# merge the PR base branch into your head branch
# (replace with the PR’s base branch)
git merge origin/<base-branch>

# resolve files, then:
git add <conflicted-files>
git commit

git push
```

Tips:

- Use `git status` to see which files are conflicted.
- If conflicts are in “defaults” objects (feature flags, config types), prefer importing canonical defaults from `@gosenderr/shared` to avoid drift.

---

## Hooks (recommended)

Enable repo hooks once per clone/worktree root:

```bash
bash scripts/enable-git-hooks.sh
```

Hooks help prevent accidental pushes from `main` and enforce worktree checks.

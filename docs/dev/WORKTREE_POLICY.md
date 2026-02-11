# Worktree Policy & Best Practices

Purpose

This document defines how to create and manage feature worktrees in this monorepo so feature work is isolated, reviewable, and easy to rebase onto updated baselines.

Principles

- Each feature should get a dedicated worktree & branch when the scope is large or cross-cutting (e.g., navigation, rate-cards, payments).
- Branch naming convention: `senderr-app/feature/<short-name>` (replace `senderr-app` with the relevant app prefix if needed).
- Keep worktrees focused: include only the apps/packages needed for the feature via sparse-checkout.
- Keep commits small and focused on the feature; rebase frequently when the baseline updates.

How to create a feature worktree (recommended)

Use the helper script included in `scripts/create-feature-worktree.sh`:

scripts/create-feature-worktree.sh <feature-slug> --apps="apps/senderr-app,apps/courieriosnativeclean" --base=<base-branch>

This will:
- Create `senderr-app/feature/<feature-slug>` branch (if missing) from the specified base branch
- Create a worktree at `worktrees/<feature-slug>` and enable sparse-checkout with the given paths
- Add a `README.md`, a convenience `package.json` with start tasks, and `.vscode/tasks.json` that delegates to monorepo commands

Notes on where to run the script

- Run this script from the monorepo root (e.g., `/Users/papadev/dev/apps/Gosenderr_local/worktrees/senderrplace-local`) to create the feature worktree next to other worktrees under the same `worktrees/` folder.
- If you run the script from inside an existing worktree it will create the new worktree relative to that worktree's root. If you need to override where the new worktree is created, pass `--target-root=/abs/path` to select a different root directory.
- Example:
  - `scripts/create-feature-worktree.sh rate-cards --target-root=/Users/papadev/dev/apps/Gosenderr_local/worktrees/senderrplace-local`


Worktree README and plan

- Each worktree should include a short plan doc in `docs/` (e.g., `docs/senderr_app/<feature-slug>-worktree-plan.md`) describing:
  - Goal and acceptance criteria
  - Files to change
  - Verification steps and tests

Merging & baseline updates

- When a feature is complete, open a PR to merge into the repo baseline (e.g., `senderr_app` or the agreed baseline branch).
- After merging, other open worktrees should rebase on the new baseline branch.

Checklist for maintainers

- [ ] Worktree created with script and README present
- [ ] Branch name follows `senderr-app/feature/<slug>` convention
- [ ] Worktree plan doc added under `docs/` for reviewer reference
- [ ] Rebase worktrees when the baseline changes

Contact

For questions about this policy, talk to the repository owners or open an issue using the `feature-request` template in `.github/ISSUE_TEMPLATE`.

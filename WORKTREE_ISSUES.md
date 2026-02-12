# Worktree audit — senderrapp-job-lifecycle-smoke-local

Date: 2026-02-12
Branch: `senderr-app-feature-job-lifecycle-e2e-local`

Summary: the worktree is runnable (emulators, seed, Metro, Xcode tasks are working). Below are findings (bugs, risks, improvements) and actionable issues you can commit locally.

## High priority

1. Missing Firestore rules file referenced by `firebase.json`
   - Impact: emulator defaults to allow-all rules (security risk for realistic tests).
   - Location: `firebase/firestore.rules` referenced but not present in this worktree.
   - Action: add a `firebase/firestore.rules` (copy from canonical smoke rules) and enable rule checks in CI/local verification.

2. Service account JSON missing for admin scripts
   - Impact: some admin scripts fall back to emulator-only mode; functions/tests that require `firebase-admin` service account will fail unless provided.
   - Location: `scripts/init-feature-flags.ts` expects `firebase/gosenderr-65e3a-firebase-adminsdk-*.json` (optional).
   - Action: document developer flow (where to drop service account) and/or add a safe sample placeholder and guard logic (already added fallback in local scripts).

## Medium priority

3. Lint warnings (type/any usage) in `apps/V1-senderr-ios` tests and services
   - Impact: weak typing in tests and services increases chance of runtime errors and fragile tests.
   - Files: many warnings under `apps/V1-senderr-ios/src/services/**` (see `pnpm lint` output).
   - Action: create tickets to gradually replace `any` with typed fixtures and fix unused vars.

4. Persist uncommitted local edits
   - Impact: repo has local edits (tasks.json, pnpm-lock.yaml, scripts) that should be committed if intended.
   - Files: `.vscode/tasks.json`, `pnpm-lock.yaml`, `scripts/init-feature-flags.ts`, `scripts/seed-admin-data.ts`.
   - Action: commit current changes (I will include these in the audit commit) and add follow-ups if any are temporary.

## Low priority / enhancement

5. Add `wt:seed` and `wt:stop` npm helper scripts
   - Benefit: standardize running `emulators:seed` / `stop` from shell and CI.

6. Add VS Code keyboard shortcut or dev-helper to run `stop` on folder close
   - Note: automatic folder-close hooks are not available; recommend keybinding or lightweight watcher.

7. DEVBOOK/docs updates
   - Update DEVBOOK and WORKTREE_QUICKSTART to document new runtasks: `emulators:start`, `emulators:seed`, `stop`.

## Suggested next work items (tickets)
- TASK-001: Add canonical Firestore rules to worktree and enable emulator rule checks.
- TASK-002: Add developer docs + .gitignored sample service-account JSON and document GOOGLE_APPLICATION_CREDENTIALS usage.
- TASK-003: Replace `any` usages in `jobsService.test.ts` and `profileService.test.ts` (reduce 80% of lint warnings in tests).
- TASK-004: Add `wt:seed` / `wt:stop` npm scripts and update README.
- TASK-005: Add VS Code keybinding for `stop` task (optional enhancement).

---

If you want, I will create local issue files for each TASK-00x and commit them now.
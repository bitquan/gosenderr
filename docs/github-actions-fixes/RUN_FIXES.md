# Runbook — Apply & Test CI Fixes Locally

Use this runbook to apply the critical fixes locally, validate them, and prepare a PR. Follow these commands step-by-step and verify each check before proceeding.

> NOTE: This will not open any PRs. You run the commands locally and inspect results before pushing changes.

---

## Prerequisites
- Node >= 18, pnpm >= 8 (repo `packageManager` requires pnpm@8.15.1)
- GitHub CLI (`gh`) for secret checks if needed
- Ensure you are on a feature branch before making changes (e.g., `git switch -c ci/critical-fixes`)

---

## Quick automated helper
A quick helper script exists at `docs/github-actions-fixes/quick-fix.sh` which:
- Installs ESLint TypeScript plugins at the workspace root
- Applies the minimal TypeScript fix (removes unused `userDoc` binding)

Run it locally first to apply the quick fixes:

```bash
chmod +x docs/github-actions-fixes/quick-fix.sh
./docs/github-actions-fixes/quick-fix.sh
```

After running, verify the changes (see steps below).

---

## Manual steps (explicit)
Follow these if you prefer to run commands by hand.

1) Install ESLint TypeScript dev-deps at repo root

```bash
pnpm -w add -D @typescript-eslint/eslint-plugin@^7.0.0 @typescript-eslint/parser@^7.0.0 eslint@^8.56.0
pnpm -w install
```

2) Verify lint locally

```bash
pnpm -w -s -C . run -w lint
# Expected: lint completes without the "plugin not found" error
```

3) Apply TypeScript fix (edit file or use sed/perl)

Recommended minimal change in:
`apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx`

Replace:
```ts
const { userDoc } = useUserDoc();
```
With:
```ts
useUserDoc();
```

Or run the quick script (applies the replacement automatically):
```bash
./docs/github-actions-fixes/quick-fix.sh
```

4) Run type-check across workspace

```bash
pnpm -w -s -C . run -w type-check
# Expected: no TS compile errors (or a short list to fix if found)
```

5) Build the affected app (customer) locally

```bash
pnpm --filter @gosenderr/customer-app build
# Expected: build finishes successfully
```

6) Run E2E locally (optional, recommended)
- Use the local runner script to start emulators and run Playwright tests:

```bash
# This script was created earlier as scripts/run-local-e2e.sh
# It starts emulators, seeds data, and runs Playwright tests
bash scripts/run-local-e2e.sh
```

7) Verify secrets used by workflows

```bash
# List repo secrets (Actions) with gh CLI
gh secret list --repo bitquan/gosenderr --json name --jq '.[] | .name'
# Check that GOOGLE_APPLICATION_CREDENTIALS_JSON exists
```

8) Validate the SARIF safety (no action required locally)
- The CI will use a conditional SARIF upload + continue-on-error; there is no extra local step required.

---

## Quick checks and cleanup
- Inspect git status and verify only intended changes exist:

```bash
git status
git add -p
git commit -m "ci: add ESLint TS plugins and fix unused userDoc in edit page"
```

- Run the local lint & type-check again before pushing:

```bash
pnpm -w -s -C . run -w lint
pnpm -w -s -C . run -w type-check
```

- Push branch and open PR when ready (or share the branch with reviewers):

```bash
git push -u origin HEAD
gh pr create --title "ci: critical fixes (ESLint plugin + TS fix + SARIF guard)" --body "See WORKFLOW_FIXES.md" --base main
```

---

## Troubleshooting notes
- If `pnpm` is missing locally: install Corepack or pnpm: `corepack enable && corepack prepare pnpm@latest --activate`
- If lint still reports plugin errors: double-check `pnpm -w list @typescript-eslint/eslint-plugin` and ensure `node_modules` at workspace root contains the plugin
- If type-check still fails: inspect first TS error, fix the specific file, repeat type-check

---

## Rollback (if needed)
- Revert the commit locally and drop the branch:

```bash
git reset --hard HEAD~1
git push -f origin HEAD
```

---

## Notes & Next Steps
- After local validation you can follow the PR plan in `docs/github-actions-fixes/WORKFLOW_FIXES.md` (PR #1 = critical fixes)
- I will wait for your confirmation before creating PRs

Good luck — ping me if you want me to open PRs after your review.
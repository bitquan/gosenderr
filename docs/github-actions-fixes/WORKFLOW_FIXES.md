# Workflow Fixes & Implementation Plan

## Summary
This document contains detailed fixes for the CI workflows, prioritized actions, diffs, test instructions, and risk assessments. Apply these in small PRs, verify passes, and then merge.

---

## CRITICAL FIXES (apply first)

### Fix #1 — Install ESLint plugin at repository root
- Problem: Root `.eslintrc.cjs` references `@typescript-eslint/eslint-plugin`, but the plugin isn't available at repo root. ESLint fails in CI.
- Solution:
  - Add the parser & plugin to the monorepo root devDependencies:
    - `@typescript-eslint/parser`
    - `@typescript-eslint/eslint-plugin`
  - Optionally run `pnpm -w add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- Code change (patch summary): update root `package.json` devDependencies (see `code-fixes/package-root-dev-deps.json`).
- Test instructions:
  1. Run `pnpm -w install` locally
  2. Run `pnpm -w -s -C . run -w lint`
- Risk: Low — adds development-only packages. Time: 10–20 minutes.

### Fix #2 — Make SARIF upload conditional (avoid failing when Code Scanning disabled)
- Problem: Trivy produces `trivy-results.sarif` and the `upload-sarif` step errors if Code Scanning is not enabled in the repository, causing the Security Scan job to fail.
- Solution: Make the SARIF upload step run only when a secret flag is set (`CODE_SCANNING_ENABLED == 'true'`). This avoids hard failure and still supports turning on Code Scanning by setting the secret.
- Code change (YAML):
```yaml
# In security job
- name: Upload Trivy results to GitHub Security
  if: ${{ secrets.CODE_SCANNING_ENABLED == 'true' }}
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```
- Test instructions:
  - Run a CI job locally (or in branch) and verify the Security Scan job completes without error when `CODE_SCANNING_ENABLED` is not configured.
  - Optionally, set `CODE_SCANNING_ENABLED=true` in repo secrets to test SARIF upload.
- Risk: Low. Time: 10 minutes.

### Fix #3 — Fix TypeScript build errors (customer-app)
- Problem: `tsc` fails in E2E runs (example: TS6133 'userDoc' declared but never used).
- Solution: Remove or use the unused variable(s). Primary change: replace `const { userDoc } = useUserDoc();` with `useUserDoc();` in `apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx`.
- Code change (see `code-fixes/customer-app-edit-page.tsx.diff`).
- Additional work: Run TypeScript checks across workspace and fix any remaining errors.
- Test instructions:
  1. `pnpm -w -s -C . run -w type-check`
  2. `pnpm --filter @gosenderr/customer-app build`
- Risk: Low to Medium depending on the number of downstream TS issues. Time: 10–60 minutes.

### Fix #4 — Ensure pnpm is available in all jobs
- Problem: Some smoke test jobs show `pnpm: command not found`.
- Solution: Add `corepack enable && corepack prepare pnpm@latest --activate` or `uses: pnpm/action-setup@v4` at the start of jobs that use pnpm (smoke workflows, E2E, etc.). Standardize on `pnpm/action-setup@v4` for clarity.
- Code change (YAML): add setup step in smoke workflows and other jobs where missing.
- Test instructions: run a smoke workflow and ensure `pnpm` resolves and `pnpm install` runs.
- Risk: Low. Time: 5–10 minutes.

### Fix #5 — Secret name mismatch (FIREBASE_SERVICE_ACCOUNT vs GOOGLE_APPLICATION_CREDENTIALS_JSON)
- Problem: `deploy-hosting.yml` expects `FIREBASE_SERVICE_ACCOUNT` but repo has `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
- Recommendation: Update the workflow to use `GOOGLE_APPLICATION_CREDENTIALS_JSON` (lower friction; uses existing secret).
  - Pros: No new secrets required; minimal change.
  - Cons: If an external process expects `FIREBASE_SERVICE_ACCOUNT`, you must keep the naming consistent elsewhere.
- Code change (YAML): `firebaseServiceAccount: "${{ secrets.GOOGLE_APPLICATION_CREDENTIALS_JSON }}"`
- Risk: Low. Time: 5–10 minutes.

---

## HIGH PRIORITY / OPTIMIZATIONS

### Fix #6 — Re-enable the Test job conditionally
- Problem: Test job was disabled with `if: false`.
- Solution: Remove `if: false` and run tests on PRs and pushes to `main`. Use the following condition:
```yaml
if: ${{ github.event_name == 'pull_request' || github.ref == 'refs/heads/main' }}
```
- Test instructions: Create a PR and verify the Test job runs; push to main in a test branch and verify runs (or run via workflow_dispatch).
- Risk: Medium. Time: 10 minutes.

### Fix #7 — Reduce workflow triggers and add concurrency
- Problem: `ci-and-deploy.yml` runs on all branches (`branches: ['**']`) causing excessive runs.
- Solution: Limit to `main` and `develop` and PRs. Add `concurrency` to reduce duplicate runs.
- Example:
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
- Risk: Low. Time: 10 minutes.

### Fix #8 — Parallelize builds
- Problem: Sequential builds are slow.
- Solution: Use a matrix job to build apps in parallel. Example:
```yaml
jobs:
  build-apps:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [customer-app,courier-app,shifter-app,admin-app]
      max-parallel: 4
    steps:
      - run: pnpm --filter @gosenderr/${{ matrix.app }} build
```
- Test instructions: Run workflow and ensure all builds run concurrently and artifacts appear.
- Risk: Low. Time: 15–30 minutes.

### Fix #9 — Simplify & harden E2E emulator workflow
- Changes:
  - Limit triggers to `pull_request`.
  - Fix seed typo: `vender@sender.com` → `vendor@sender.com`.
  - Include storage emulator (if tests use storage).
  - Add stricter readiness checks and better log capture on failure.
- Test instructions: Run E2E workflow on a PR and confirm emulators start, seeding works, and Playwright runs.
- Risk: Medium. Time: 20–45 minutes.

---

## Answers to Specific Questions

### Secret Name: Should I rename workflow to use `GOOGLE_APPLICATION_CREDENTIALS_JSON` or add `FIREBASE_SERVICE_ACCOUNT`?
**Recommendation:** Update the workflow to use `GOOGLE_APPLICATION_CREDENTIALS_JSON` (existing secret). Pros: no additional step for repo admin. Con: none significant.

### Code Scanning: Should I enable Code Scanning or make SARIF upload conditional?
**Recommendation:** Make SARIF upload conditional and also enable Code Scanning when convenient. Conditional upload avoids failing jobs right away; enabling Code Scanning is the long-term desirable state.

Conditional YAML (example):
```yaml
- name: Upload Trivy results to GitHub Security
  if: ${{ secrets.CODE_SCANNING_ENABLED == 'true' }}
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

### Test Job: Should tests run on all PRs or only main?
**Recommendation:** Run tests on PRs targeting `main` and on pushes to `main` only. This keeps noise low while ensuring PRs verified before merge.

Condition logic example:
```yaml
if: ${{ github.event_name == 'pull_request' || github.ref == 'refs/heads/main' }}
```

### Build Parallelization: Example matrix strategy
See the "Fix #8 — Parallelize builds" section above.

---

## Implementation Plan & Rollout
1. Create feature branch `ci/fix-workflows` with small commits for each fix.
2. Add root devDependencies for ESLint plugins and run `pnpm -w install`.
3. Create PR and run CI; iterate if other TS or lint errors appear.
4. Once Lint & Security job errors cleared, re-enable tests and verify E2E.
5. Merge and monitor for 24–48 hours.

Estimated total time: 2–3 hours (depending on number of TS fixes discovered)

---

## Files created by this plan
- `docs/github-actions-fixes/WORKFLOW_FIXES.md` (this file)
- `docs/github-actions-fixes/SECRETS_CHECKLIST.md`
- `docs/github-actions-fixes/testing-checklist.md`
- `docs/github-actions-fixes/quick-fix.sh`
- `docs/github-actions-fixes/workflows-fixed/*` (updated YAMLs)
- `.github/WORKFLOWS.md`
- `code-fixes/customer-app-edit-page.tsx.diff`
- `code-fixes/package-root-dev-deps.json`

---

If you'd like, I can now prepare the PR branches with these changes, or I can just create the files and artifacts for your review (no commits). Which do you prefer?
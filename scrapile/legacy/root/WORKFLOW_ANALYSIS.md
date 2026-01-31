# GitHub Actions Analysis Report

## Executive Summary
- Total Runs Analyzed: 20 (most recent)
- Success Rate: ~20% (many failures concentrated in CI, E2E, and Smoke jobs)
- Average Run Time: Varies (CI runs ~4-12m; E2E runs ~3-10m depending on failures)
- Common Failures: Lint (missing plugin), Security SARIF upload failure (code scanning disabled), E2E build/type errors, pnpm availability in some jobs

## Workflow Run Details (Last 20)
| Run # | Workflow | Branch | Status | Failed Step | Error |
|-------|----------|--------|--------|-------------|-------|
| 21444671859 | E2E (Emulator) | chore/add-root-eslint | ❌ failure | build (customer app) | TS6133: 'userDoc' declared but never used (tsc error)
| 21444671847 | CI + Deploy (Firebase Hosting) | chore/add-root-eslint | ❌ failure | Lint / Security Scan | ESLint missing plugin "@typescript-eslint/eslint-plugin"; Trivy SARIF upload failed (code scanning not enabled)
| 21444662889 | Copilot code review | refs/pull/49/head | ✅ success | - | -
| 21444658417 | CI + Deploy (Firebase Hosting) | chore/add-root-eslint | ❌ failure | Lint / Security Scan | ESLint plugin missing; Trivy SARIF upload failed
| 21444351264 | Copilot code review | refs/pull/48/head | ✅ success | - | -
| 21444348848 | E2E (Emulator) | chore/dependabot-auto-merge | ❌ failure | e2e | Playwright/Build failures (various)
| 21444348808 | CI — Customer App | chore/dependabot-auto-merge | ❌ failure | build/test | Build or test step failures
| 21444348763 | Playwright E2E | chore/dependabot-auto-merge | ❌ failure | e2e | Build failed (TS error) / Playwright failing
| 21444348756 | Test Vendor Smoke | chore/dependabot-auto-merge | ❌ failure | install | pnpm: command not found
| 21444348723 | Test Customer Smoke | chore/dependabot-auto-merge | ❌ failure | install | pnpm: command not found
| 21444348705 | CI + Deploy (Firebase Hosting) | chore/dependabot-auto-merge | ❌ failure | Lint / Security Scan | Same as above (missing ESLint plugin; SARIF upload failed)
| 21444342028 | CI + Deploy (Firebase Hosting) | chore/dependabot-auto-merge (auto-merge minor) | ❌ failure | Lint / Security Scan | missing plugin; SARIF upload failed
| 21444300053 | E2E (Emulator) | chore/dependabot-config | ❌ failure | e2e | Playwright/Build failures (TS errors)
| 21444300026 | Test Vendor Smoke | chore/dependabot-config | ❌ failure | install | pnpm: command not found
| 21444300023 | Test Customer Smoke | chore/dependabot-config | ❌ failure | install | pnpm: command not found
| 21444299996 | CI — Customer App | chore/dependabot-config | ❌ failure | build/test | Build or test errors
| 21444299989 | Playwright E2E | chore/dependabot-config | ❌ failure | e2e | Build error/Playwright failures
| 21444299984 | CI + Deploy (Firebase Hosting) | chore/dependabot-config | ❌ failure | Lint / Security Scan | missing ESLint plugin; SARIF upload failed
| 21444285388 | Copilot code review | refs/pull/47/head | ✅ success | - | -
| 21444282113 | CI + Deploy (Firebase Hosting) | chore/dependabot-config | ❌ failure | Lint / Security Scan | missing ESLint plugin; SARIF upload failed

> Notes: I inspected representative logs for the failing runs above to extract the most common failing steps. The failures fall into a small set of repeatable patterns described below.

## Issues Found

### CRITICAL
1. Missing ESLint plugin when root `.eslintrc.cjs` is present
   - Impact: High (Lint job fails across many runs; blocks merges/CI gating)
   - Frequency: Present in ~6-8 of the analyzed runs
   - Root cause: Root ESLint config references `@typescript-eslint/eslint-plugin` but the plugin is not installed at the repository root (CI runs ESLint from repo root). Solutions: install the plugin at root (devDependency), or scope lint config to packages and invoke package-local ESLint.

2. Security Scan SARIF upload failing due to Code Scanning disabled on the repo
   - Impact: High (Security Scan job marked FAILED even though Trivy scan completes)
   - Frequency: Present in all runs where Trivy produced SARIF
   - Root cause: `github/codeql-action/upload-sarif@v3` fails when code scanning is not enabled. Solutions: enable Code Scanning in repo settings or conditionally skip SARIF upload and instead store artifact.

3. E2E Job build failures (TypeScript errors)
   - Impact: High (E2E cannot run because customer app fails `tsc` during build)
   - Frequency: Present in multiple E2E runs
   - Root cause: TypeScript errors (e.g., unused variable 'userDoc' in `apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx`) cause `pnpm --filter ... build` to exit with non-zero. Solutions: fix TS errors in codebase and/or relax `tsc` strictness only in CI for Playwright preview builds while we stabilize tests.

### HIGH
1. pnpm not found in some jobs (smoke tests)
   - Impact: High (smoke tests fail immediately in the install step)
   - Frequency: Present in smoke test jobs
   - Root cause: Some workflows or jobs do not prepare pnpm via corepack or use `pnpm/action-setup`. Solution: Add `corepack enable && corepack prepare pnpm@latest --activate` (or `pnpm/action-setup`) to all jobs that require pnpm.

2. `test` job disabled in `ci-and-deploy.yml` (if: false)
   - Impact: Medium (E2E tests do not run on PRs; reduces CI coverage)
   - Frequency: Present in the main CI workflow (intentional temporary measure)
   - Root cause: Configuration intentionally disabled. Solution: Re-enable once E2E tests are stabilized, or gate with `inputs.skip_tests` or a branch condition.

### MEDIUM
1. Triggers too broad (CI runs on all branches: `branches: ['**']`)
   - Impact: Medium (many unnecessary runs and noise)
   - Frequency: Configured on main workflow
   - Root cause: Trigger config uses broad pattern. Solution: Limit CI to PRs and key branches or add path filters.

2. `deploy-hosting.yml` uses secret `FIREBASE_SERVICE_ACCOUNT` though the repo has `GOOGLE_APPLICATION_CREDENTIALS_JSON` instead
   - Impact: Medium (deploy action fails if expected secret missing)
   - Root cause: name mismatch between secret used in workflow and the one in repo settings. Solution: Standardize secret name or update workflow to use existing secret.

3. E2E workflow complexity & emulator setup: storage emulator excluded while present in config; seed email typo `vender@sender.com` (typo for vendor)
   - Impact: Low-to-Medium (causes some fragility and confusion)
   - Frequency: Present in E2E workflow
   - Root cause: Inconsistent emulator config and seed scripts. Solution: standardize and simplify emulator config, include storage emulator if tests require it, fix seed typos.

## Secrets Status (checked via `gh secret list`)
- ✅ GOOGLE_APPLICATION_CREDENTIALS_JSON: Present (used by CI deploy)
- ✅ NEXT_PUBLIC_FIREBASE_API_KEY: Present
- ✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Present
- ✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID: Present
- ✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: Present
- ✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: Present
- ✅ NEXT_PUBLIC_FIREBASE_APP_ID: Present
- ✅ NEXT_PUBLIC_MAPBOX_TOKEN: Present
- ❌ FIREBASE_SERVICE_ACCOUNT: Missing (referenced by `deploy-hosting.yml`)

> Recommendation: Align deploy workflows to use `GOOGLE_APPLICATION_CREDENTIALS_JSON` or add `FIREBASE_SERVICE_ACCOUNT` to the repository secrets if that's preferred.

## Recommendations (Prioritized)
**CRITICAL (Fix immediately):**
1. Install `@typescript-eslint/eslint-plugin` and peers at repo root or adjust ESLint resolution so CI's `Lint` job can run successfully.
2. Fix Trivy SARIF upload failure: enable Code Scanning in repository settings or make SARIF upload conditional (only when code scanning is enabled).
3. Fix TypeScript build errors in `apps/customer-app` (e.g., remove/rename unused `userDoc` variable) so E2E builds can succeed.

**HIGH (Fix soon):**
1. Ensure pnpm is available in all jobs that run `pnpm` (add `corepack enable && corepack prepare pnpm@latest --activate` to workflows or use `pnpm/action-setup`).
2. Revisit the `test` job `if: false` decision; re-enable once E2E is stabilized or gate it properly with `inputs.skip_tests`.
3. Standardize secret names used across workflows (`GOOGLE_APPLICATION_CREDENTIALS_JSON` vs `FIREBASE_SERVICE_ACCOUNT`).

**MEDIUM (Optimize later):**
1. Limit CI triggers to PRs/important branches or add path filters to reduce noisy runs.
2. Parallelize independent app builds and add path-based build triggers to avoid building unrelated apps.
3. Simplify the E2E emulator setup (enable storage emulator if required; fix 'vender' typo; reduce port conflicts).

---

### Next Steps (Phase 2 deliverables I'll prepare next):
- Create `WORKFLOW_FIXES.md` with step-by-step fixes and proposed YAML diffs
- Generate updated workflow YAMLs (proposed changes; will not commit without your go-ahead)
- Prepare `SECRETS_CHECKLIST.md` and `.github/WORKFLOWS.md` documentation
- Propose a `workflow-monitor.yml` to notify when success rate drops below threshold


*If you'd like, next I can generate the proposed fixed workflow files (with concurrency, pnpm setup, conditional SARIF upload, and path-based triggers) and a `WORKFLOW_FIXES.md` describing the changes. Please confirm whether I should proceed to prepare those files.*

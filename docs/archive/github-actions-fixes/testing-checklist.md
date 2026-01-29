# Testing Plan for Workflow Fixes

## Before Merging (Local + CI dry-run)
- [ ] Run lint locally: `pnpm -w install && pnpm -w -s -C . run -w lint`
- [ ] Run type-check across workspace: `pnpm -w -s -C . run -w type-check`
- [ ] Build all apps locally: `pnpm -w -s -C . run -w build`
- [ ] Run E2E locally with emulators: `scripts/run-local-e2e.sh` (or `pnpm --filter @gosenderr/customer-app exec -- playwright test`)
- [ ] Ensure `CODE_SCANNING_ENABLED` secret is not required (SARIF upload should be conditional)
- [ ] Verify secrets exist (see `SECRETS_CHECKLIST.md`)
- [ ] Validate workflow syntax: `act -l` or use GitHub "Workflow syntax check" in a PR

## After Merging
- [ ] Monitor the first runs (Lint, Security, CI, E2E)
- [ ] Check artifacts & Playwright reports for E2E failures
- [ ] Validate Deploy job on `main` (manual `workflow_dispatch` if needed)
- [ ] Monitor for 24–48 hours and check the success rate

## Rollback Plan
- If any critical failure is introduced, revert the PR and open a hotfix PR with logs attached.

Adds Playwright config with per-app projects, smoke tests for customer & vendor, shared fixtures/helpers, and per-app CI smoke workflows.

Files: playwright.config.ts, tests/e2e/*, .github/workflows/test-customer.yml, .github/workflows/test-vendor.yml.

**NOTE:** This is a Phase 0/infrastructure PR — some app-specific smoke tests are intentionally left for follow-ups. Please do NOT merge until vendor tasks below are complete.

**Remaining vendor tasks (follow-up):**
- [ ] Add vendor `items/create-item.spec.ts` (happy path + write assertion)
- [ ] Add vendor `items/edit-item.spec.ts` and `items/item-list.spec.ts`
- [ ] Add visual snapshot `vendor-dashboard.png` and baseline images
- [ ] Add integration customer->vendor flow smoke test
- [ ] Verify CI vendor workflow runs and uploads traces for failures

Next steps: I can add the remaining vendor specs in a follow-up branch and mark this PR ready for review when done.

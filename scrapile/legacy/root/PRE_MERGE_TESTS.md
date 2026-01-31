# PRE_MERGE_TESTS

This checklist lists the tests and validations to perform on `feature/courier-turn-by-turn-navigation` before merging into `main`.

## Quick local checks
- [ ] git checkout feature/courier-turn-by-turn-navigation
- [ ] pnpm install
- [ ] pnpm -w build (or build each app individually)
- [ ] pnpm -w test (run unit tests)
- [ ] Run `pnpm --filter @gosenderr/courier-app build` and verify the build completes without errors
- [ ] Run `pnpm --filter @gosenderr/customer-app build` and verify
- [ ] Run `pnpm --filter @gosenderr/admin-app build` and verify

## TypeScript
- [ ] pnpm -w type-check
- [ ] Address any TypeScript errors in the courier app or shared UI package

## E2E & Smoke
- [ ] Run Playwright smoke tests for `vendor`, `customer`, `courier` projects locally:
  - pnpm --filter @gosenderr/customer-app exec playwright test tests/e2e/customer/smoke --project=customer
- [ ] Run the full E2E suite in a preview environment (if available)

## Mobile (iOS)
- [ ] Validate iOS project builds and Archive in Xcode (testflight target)
- [ ] Verify `GoogleService-Info.plist` configuration is set and works for builds

## Critical flows to test manually
- [ ] Courier: open app, start navigation, verify live tracking and route updates
- [ ] Courier: job accept flow and camera toggle follow vs overview
- [ ] Customer: job details show route preview (if applicable)
- [ ] Billing: verify no regressions in Stripe flows (server-side functions if affected)

## Post-merge smoke
- [ ] Run the CI cleanup job and monitor for unexpected deletes (just verification)

-- end --

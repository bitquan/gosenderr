# Unified Worktree Phase 3 Import Plan

Branch: `V1/unified/local`
Base worktree: `/Users/papadev/dev/worktrees/gosenderr/V1-unified-local`
Date: 2026-02-20

## Goal
Continue merging/copying only high-confidence deltas from:
- `senderrplace/smoke/baseline-sync-2026-02-17`
- `hotfix/tokenwallet-gen1-deploy-fix`

without deleting any existing worktree.

## Source profile
Both source branches currently show large app-level divergence with many `D` entries (deletions) across:
- `apps/courieriosnativeclean`
- `apps/marketplace-app`
- `apps/senderr-app`
- `firebase/functions`
- `packages/shared`

Because deletions dominate, imports must be selective and additive-first.

## Risk tags
- **R1 (Low):** additive files only, no existing file overwritten, no runtime wiring change.
- **R2 (Medium):** modifies existing file in one app only, no cross-app/shared contract changes.
- **R3 (High):** shared contracts/functions/runtime wiring (`packages/shared`, `firebase/functions`, root app entrypoints), or any delete/rename.

## Recommended import order

### Batch A — Additive admin/senderr tests & helpers (R1)
- `apps/admin-app/src/lib/navigation/**` (already started)
- `apps/senderr-app/src/components/mapShell/**` (new files only)
- `apps/senderr-app/src/lib/mapShell/overlayController.ts`
- `apps/senderr-app/src/lib/mapShell/__tests__/overlayController.test.ts`
- `apps/senderr-app/src/__tests__/MapShellScreen*.test.tsx`

### Batch B — Additive marketplace/senderr feature modules (R1→R2)
- `apps/marketplace-app/src/features/jobs/customer/FoodPickupOrderForm.tsx`
- `apps/marketplace-app/src/lib/foodPickup.ts`
- `apps/marketplace-app/src/lib/navigation/shellNav.ts`
- `apps/senderr-app/src/lib/foodPickup/restaurants.ts`
- `apps/senderr-app/src/lib/location.ts`
- `apps/senderr-app/src/lib/storage/uploadRestaurantPhoto.ts`

### Batch C — Runtime wiring updates (R3, review first)
- Any modifications to:
  - `apps/*/src/App.tsx`
  - `apps/*/src/pages/**`
  - `firebase/functions/src/index.ts`
  - `packages/shared/src/index.ts`
- Any `D` or `R` status entries (deletes/renames)

## Guardrails
- Import only explicit path allowlists per batch.
- Avoid `git checkout <branch> -- apps/...` broad directories.
- Run branch checkpoint after each batch.
- Keep each commit scoped to one batch.

## 60-Minute Execution Phases (Ordered)

### Phase 1 (0-15 min) — Tiny compatibility deltas
- Goal: merge smallest safe runtime-compatibility edits first.
- Files:
  - `firebase/functions/src/http/logCommandFailure.ts`
  - `firebase/functions/src/stripe/index.ts`
- Accept criteria:
  - command union includes `cancel`.
  - Stripe index re-exports token wallet summary/adjust helpers.

### Phase 2 (15-35 min) — Additive signup-bonus plumbing
- Goal: import additive files and minimal wiring for signup bonus / admin operations.
- Files:
  - `firebase/functions/src/utils/signupBonus.ts`
  - `firebase/functions/src/triggers/onAuthUserCreate.ts`
  - `firebase/functions/src/http/createAdminJob.ts`
  - `firebase/functions/src/http/deleteUserForAdmin.ts`
  - `firebase/functions/src/http/createUserForAdmin.ts`
  - `firebase/functions/src/http/runTestFlow.ts`
  - `firebase/functions/src/index.ts` (export wiring only)
- Accept criteria:
  - no deletions/renames.
  - additive endpoints/triggers exported.

### Phase 3 (35-50 min) — Medium Stripe/function deltas (selective)
- Goal: import only medium diffs that are additive-safe after per-file review.
- Candidate files:
  - `firebase/functions/src/stripe/marketplace.ts`
  - `firebase/functions/src/stripe/webhook.ts`
  - `firebase/functions/src/http/createPaymentIntentHttp.ts`
  - `firebase/functions/src/http/sendTestPush.ts`
- Accept criteria:
  - no regressions to existing defaults/ops-critical behavior.
  - skip any file that removes protective defaults.

### Phase 4 (50-60 min) — Checkpoint + handoff
- Goal: diagnostics, checkpoint commit, and explicit deferred list.
- Accept criteria:
  - branch-assist `status` + `save` run.
  - deferred high-risk files listed for next wave.

## Current status
- ✅ Unified worktree created and pushed.
- ✅ Workflow/governance safe deltas imported.
- ✅ Admin navigation helper imported.
- ✅ Admin navigation test imported.
- ✅ Batch A additive senderr map-shell files imported.
- ✅ Batch B additive marketplace/senderr food + navigation modules imported.
- ✅ Phase C runtime wiring: `senderr-app` map-shell route + dashboard preview wired.
- ✅ Phase C runtime wiring: `marketplace-app` food-pickup routes wired.
- ✅ Phase C review: `courieriosnativeclean` examined; no safe minimal wiring import from smoke/local.
  - Smoke `index.js` uses multi-name registration loop (regresses stabilized single-name registration).
  - Smoke `AppDelegate.swift` is older/simpler and would regress current iOS startup hardening.
- ✅ Phase C/R3 additive import batch applied for `firebase/functions` and `packages/shared` (no-delete):
  - `firebase/functions/src/http/logCommandFailure.ts`
  - `firebase/functions/src/http/runSystemSimulation.ts`
  - `firebase/functions/src/http/simulateRule.ts`
  - `firebase/functions/test/tokenWallet.spec.ts`
  - `packages/shared/src/types/foodPickup.ts`
  - `packages/shared/src/types/tokenWallet.ts`
  - `packages/shared/src/utils/featureFlags.ts`
- ✅ Phase C/R3 existing-file wiring review complete (no-delete):
  - `firebase/functions/src/index.ts` now exports:
    - `logCommandFailure`
    - `simulateRule`
    - `runSystemSimulation`
  - `packages/shared/src/index.ts` now exports:
    - `types/foodPickup`
    - `types/tokenWallet`
    - `utils/featureFlags`
- ✅ Phase C/R3 selective `M`-file import pass (no-delete) completed for shared contracts:
  - Imported safe additive updates in:
    - `packages/shared/src/types/firestore.ts`
    - `packages/shared/src/types/marketplace.ts`
  - Included additive contract fields/defaults for:
    - `FeatureFlags.delivery.mapShell`
    - `FeatureFlags.senderrplaceV2`
    - `DEFAULT_FEATURE_FLAGS`
    - `SellerProfile.paymentLinks`
    - `CourierProfile.acceptTokenPayoutJobs`
  - Deferred risky `firebase/functions` `M` files in this pass (behavior-changing logic in token wallet/notification/runtime command paths) for separate targeted review.
- ⏭ Next: Phase C/R3 targeted functions `M`-file review (single-file micro-batches), starting with safest callable-surface compatibility deltas.

## Hour-Mode Progress (2026-02-20)

- ✅ Phase 1 complete:
  - `firebase/functions/src/http/logCommandFailure.ts` (`cancel` command support)
  - `firebase/functions/src/stripe/index.ts` (token wallet summary/adjust exports)
- ✅ Phase 2 complete:
  - Imported: `firebase/functions/src/utils/signupBonus.ts`
  - Imported: `firebase/functions/src/triggers/onAuthUserCreate.ts`
  - Imported: `firebase/functions/src/http/createAdminJob.ts`
  - Imported: `firebase/functions/src/http/deleteUserForAdmin.ts`
  - Updated: `firebase/functions/src/http/createUserForAdmin.ts`
  - Updated: `firebase/functions/src/http/runTestFlow.ts`
  - Updated: `firebase/functions/src/index.ts` export wiring for new trigger/callables
- ✅ Phase 3 selective subset complete:
  - Updated: `firebase/functions/src/http/createPaymentIntentHttp.ts`
  - Updated: `firebase/functions/src/stripe/marketplace.ts`
  - Updated: `firebase/functions/src/stripe/webhook.ts`
  - Deferred intentionally: `firebase/functions/src/http/sendTestPush.ts` (would remove APNS fallback default)

- ⏭ Remaining for next wave (still no-delete, higher risk):
  - `firebase/functions/src/http/sendTestPush.ts`
  - `firebase/functions/src/http/courierJobCommands.ts`
  - `firebase/functions/src/http/tokenWalletCommands.ts`
  - `firebase/functions/src/stripe/tokenWallet.ts`
  - `firebase/functions/src/stripe/createMarketplaceOrder.ts`
  - `firebase/functions/src/triggers/autoCancel.ts`
  - `firebase/functions/src/triggers/notifications.ts`
  - `firebase/functions/test/integration.spec.ts`

## Deferred-Wave Micro-Batch Progress (2026-02-20)

- ✅ Batch 1: `firebase/functions/test/integration.spec.ts` imported and checkpointed.
- ✅ Batch 2: `firebase/functions/src/http/sendTestPush.ts` reviewed and intentionally **not imported**.
  - Reason: source delta removes APNS topic fallback default path.
  - Unified currently keeps fallback + retry behavior to avoid push regression.
- ✅ Batch 3: `firebase/functions/src/triggers/autoCancel.ts` reviewed and intentionally **not imported**.
  - Reason: source delta removes APNS notification payload and narrows FCM token resolution.
  - Unified retains broader token lookup + APNS payload for cancellation delivery reliability.
- ✅ Batch 4: `firebase/functions/src/triggers/notifications.ts` reviewed and intentionally **not imported**.
  - Reason: source delta removes APNS payload and simplifies notification preference/token resolution in ways that can reduce delivery coverage.
  - Unified retains current broader preference mapping + APNS notification payload.
- ✅ Batch 5a: `firebase/functions/src/http/courierJobCommands.ts` reviewed and intentionally **not imported**.
  - Reason: source delta removes idempotency receipt handling and token-payout protection logic.
  - Unified retains these safeguards for command reliability and payout safety.
- ✅ Batch 5b: `firebase/functions/src/http/tokenWalletCommands.ts` reviewed and intentionally **not imported**.
  - Reason: source delta removes substantial wallet-type/admin ledger functionality.
  - Unified retains current expanded token wallet command surface to avoid functional regression.
- ✅ Batch 5c: `firebase/functions/src/stripe/tokenWallet.ts` reviewed and intentionally **not imported**.
  - Reason: source delta migrates callable signatures and removes checkout-session status writeback path.
  - Unified retains current status writeback behavior used by token checkout tracking.

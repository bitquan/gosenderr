# Senderrplace Baseline Deep Audit (2026-02-17)

## Branch audited

- Working branch: senderrplace/feature/v1-baseline-restore-theme-foodpickup
- Audit intent: recover missing token/payment implementation (seller + customer + admin), identify drift buried in other branches/trees, and define cleanup plan for legacy screens.

## Executive summary

The new baseline branch currently has the restored sidebar + food pickup theme/layout, but it does **not** contain the latest token-wallet/payment source implementation set that exists on other branches.

Key finding: token wallet callable source files are missing in source, while old compiled artifacts still show token exports. This creates source/runtime drift risk.

## Verified missing implementation (deep audit)

The following key commits are **not ancestors** of the current baseline branch:

- 41efc971 feat(payments): add admin token-policy UI, seller payment-links UI & shared types
- 8a7b3a44 test(functions): add token-wallet integration tests + robustness fixes
- 20cba653 feat(tokens): add token command flows and settings wiring
- cd0c6128 feat(tokens): refund unlock tokens on cancel and dispute
- 163883e5 feat(senderr-app): phase1 token policy and wallet scaffolding
- 2a92107a BAT-040 integrate token wallet functions exports and shared types parity
- 611abf89 BAT-041 integrate admin nav config and payment settings test parity
- 03a0f08b BAT-036 settings payout mode wallet visibility and shell parity
- 6d5b919a test(seed): verify platformSettings/tokenPolicy seed + admin payment settings pack exposure

### Concrete file-level gaps in baseline

Missing source files expected by token wallet stack:

- firebase/functions/src/http/tokenWalletCommands.ts
- firebase/functions/src/stripe/tokenWallet.ts
- firebase/functions/test/tokenWallet.spec.ts
- packages/shared/src/types/tokenWallet.ts

Token-related source export drift currently visible:

- firebase/functions/src/index.ts currently does not export token wallet callable commands.
- firebase/functions/lib/index.js still contains token wallet exports from prior build artifacts.

Seller/customer/admin implementation drift observed:

- apps/admin-app/src/pages/PaymentSettings.tsx exists but currently lacks token policy settings blocks found in 41efc971.
- apps/marketplace-app/src/pages/profile/seller-settings/page.tsx exists but currently lacks full seller payment links fields and persistence added in 41efc971.
- apps/marketplace-app/src/pages/marketplace/[itemId]/page.tsx exists but currently lacks full customer-facing seller payment-links rendering from 41efc971.
- scripts/seed-admin-data.ts exists but currently lacks the tokenPolicy seeding updates from 6d5b919a.

## Branch-to-branch sync scope check

Compared against senderrplace/feature/token-wallet-tests:

- Token stack files in functions/shared/scripts differ as expected.
- That branch also deletes the restored shell/food-pickup files, so full branch merge is unsafe.
- Recommended approach is selective cherry-pick/path-scoped sync, not full merge.

## Legacy screen audit (marketplace old screens)

From App.tsx route import map vs existing page modules, these are present but not imported by the active router:

- apps/marketplace-app/src/pages/Checkout.tsx
- apps/marketplace-app/src/pages/Dashboard.tsx
- apps/marketplace-app/src/pages/JobDetail.tsx
- apps/marketplace-app/src/pages/Jobs.tsx
- apps/marketplace-app/src/pages/Profile.tsx
- apps/marketplace-app/src/pages/RequestDelivery.tsx
- apps/marketplace-app/src/pages/Settings.tsx
- apps/marketplace-app/src/pages/layout.tsx
- apps/marketplace-app/src/pages/not-found.tsx
- apps/marketplace-app/src/pages/marketplace/page.tsx
- apps/marketplace-app/src/pages/vendor/items/[itemId]/edit/page.tsx
- apps/marketplace-app/src/pages/vendor/items/new/page.tsx
- apps/marketplace-app/src/pages/vendor/orders/page.tsx
- apps/marketplace-app/src/pages/jobs/[jobId]/loading.tsx

Additional legacy navigation candidates tied to old bottom-nav layout:

- apps/marketplace-app/src/components/BottomNav.tsx
- apps/marketplace-app/src/components/ui/BottomNav.tsx

## Recommended sync plan (safe order)

### Phase 1: Token backend + shared contracts first

Bring in token-wallet source-of-truth first (functions + shared types + tests):

1. 163883e5
2. 20cba653
3. cd0c6128
4. 2a92107a
5. 8a7b3a44
6. 6d5b919a

Apply with path-scoped cherry-picks to avoid unrelated UI churn:

- firebase/functions/src/**
- firebase/functions/test/**
- packages/shared/src/**
- scripts/seed-admin-data.ts

### Phase 2: Admin + seller + customer payment UI

Apply from:

1. 41efc971
2. 611abf89 (admin nav/settings parity)
3. 03a0f08b (settings parity where relevant)

Scope these paths:

- apps/admin-app/src/pages/PaymentSettings.tsx
- apps/admin-app/src/lib/navigation/adminNav.ts
- apps/marketplace-app/src/pages/profile/seller-settings/page.tsx
- apps/marketplace-app/src/pages/marketplace/[itemId]/page.tsx

### Phase 3: Validate before tree sync

Minimum gates:

1. Functions tests for token wallet pass.
2. Admin PaymentSettings can load/save tokenPolicy packs and costs.
3. Seller settings can save payment links.
4. Item detail renders seller payment links.
5. Theme guard still passes.
6. Food pickup routes still pass smoke.

## Legacy screen deletion plan (after sync validation)

### Step A: Safety inventory

- Confirm no runtime imports/tests reference each candidate file.
- Keep deletion list in one PR, separate from token sync PR.

### Step B: Remove unused marketplace legacy screens

Delete the unimported files listed above.

### Step C: Remove old bottom-nav primitives

- Delete BottomNav components only after removing pages/layout.tsx legacy usage.

### Step D: Guardrail

- Add a small lint/check script to fail CI if both old PascalCase page set and new page.tsx route modules coexist for same feature.

## Rollout after baseline is green

1. Sync this branch into V1-senderrplace-local.
2. Sync same result into V1-senderrplace-smoke.
3. Run smoke checks in both trees.
4. Merge to target baseline branch.
5. Delete this temporary baseline-restore branch only after local/smoke parity confirms.

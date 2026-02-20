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
- ⏭ Next: Phase C/R3 review for `firebase/functions` and `packages/shared` with explicit no-delete allowlist.

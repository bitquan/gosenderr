# Ads & Promotions Worktree Plan

**Feature slug:** `ads-promotions`

## Goal
Implement admin-managed promotions and promoted placements in marketplace with expiration, billing events, and analytics.

## Scope
- Promotion type & Firestore schema
- Admin UI to create/manage promotions (`apps/admin-app/src/pages/promotions/*`)
- Marketplace placement components (`PromotedCarousel`, `PromotedSlot`)
- Cloud Function to expire promotions and generate billing events
- Integration with payments/billing (create billing doc on promotion start)
- E2E test: admin creates promotion → item appears in promoted placement

## Files to add/change
- `packages/shared/src/types/promotion.ts` (Promotion type)
- `apps/admin-app/src/pages/promotions/*` (admin manager UI stub)
- `apps/marketplace-app/src/components/PromotedCarousel.tsx` (display promoted items)
- `firebase/functions/src/triggers/promotionExpire.ts` (stub)
- Tests: `apps/marketplace-app/tests/e2e/promotions.spec.ts`

## Acceptance
- Admin can create a promotion (admin UI stubbed for now), promotion document is stored in Firestore, item appears in PromotedCarousel.
- Cloud function schedules expiration and sets `active=false`.

## Verification
- Run emulator, create promotion doc manually or via admin UI stub, verify promoted slot shows the item.

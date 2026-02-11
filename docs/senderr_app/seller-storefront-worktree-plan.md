# Seller Storefront Worktree Plan

**Feature slug:** `seller-storefront`

## Goal
Create a lightweight, SEO-friendly public storefront for each seller with a storefront popup component that can be invoked from item cards or marketplace lists. Keep the worktree scope limited to marketplace-related artifacts only.

## Scope
- Public seller storefront page: `/vendor/:sellerId` (list items, about, contact, promoted items)
- Seller popup component: `SellerPopup` for quick view from item cards and search results
- Hook `useSellerProfile` to fetch seller profile and items efficiently
- Playwright e2e: `vendor-storefront.spec.ts` (visit storefront page and open popup)
- Storybook stories for `SellerStorefront` and `SellerPopup`

## Files to add (worktree-local)
- `apps/marketplace-app/src/pages/vendor/[sellerId]/page.tsx` (route)
- `apps/marketplace-app/src/components/SellerStorefront.tsx` (main component)
- `apps/marketplace-app/src/components/SellerPopup.tsx` (popup/modal)
- `apps/marketplace-app/src/hooks/useSellerProfile.ts` (data hook)
- `apps/marketplace-app/tests/e2e/vendor-storefront.spec.ts` (Playwright skeleton)
- `apps/marketplace-app/src/components/SellerStorefront.stories.tsx` (Storybook)

## Acceptance criteria
- Public storefront page renders and fetches seller data and items for a given sellerId
- Popup can be opened from an item card (UI stubbed if necessary)
- Playwright test visits page and asserts basic content
- Storybook stories exist for visual QA

## Verification
1. Start marketplace dev server from the worktree and visit `/vendor/<sellerId>` (use seeded seller id). 2. Run Playwright e2e skeleton to confirm route loads. 3. Run Storybook to review components. 

## Notes
- Keep the worktree minimal (marketplace & shared types only). If admin changes are needed (seller approval/storefront toggle), create small PRs in `senderr-app/feature/seller-onboarding` or similar to avoid bloating this tree.

# BAT-039 Marketplace Rescue Disposition

Date: 2026-02-16
Branch: `bat039/rescued-marketplace-integration`

## Scope

Recovery BAT target:

- `food-pickups`
- `store`
- `seller/ads`
- shell-nav/runtime/tokens references

## Decision

Explicit removal + route compatibility wiring.

Reasoning:

1. Rescued feature files for `food-pickups`, `store`, and `seller/ads` are not present in current canonical marketplace surface.
2. To avoid dead-link drift, legacy paths are now explicitly routed to active canonical flows.
3. No new marketplace feature surfaces were introduced in this BAT.

## Route Wiring Applied

In `apps/marketplace-app/src/App.tsx`:

- `/food-pickups` -> `/marketplace`
- `/food-pickups/:restaurantId/order` -> `/request-delivery`
- `/store/:sellerId` -> `/marketplace`
- `/seller/ads` -> `/seller/dashboard`
- `/seller/ads/:adId` -> `/seller/dashboard`

## Verification

- Marketplace app build passes after route updates.
- Legacy URLs no longer rely on missing pages/components.

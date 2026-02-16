# Marketplace App (Senderrplace) — Baseline README

Customer + seller web surface for listings, checkout, food pickup, and seller tools.

## Run

1. From repo root:
   - `pnpm install --frozen-lockfile`
2. Start app:
   - `pnpm --filter @gosenderr/marketplace-app dev`
3. Build check:
   - `pnpm --filter @gosenderr/marketplace-app build`

## Baseline Rules

1. Use shared contracts first (`packages/shared`) before app-local type changes.
2. Route pages compose behavior; data logic belongs in `src/lib` or `src/services`.
3. Keep naming aligned with other active surfaces:
   - checkout/payment rails
   - token actions
   - food pickup terminology

## Critical Flows

1. Cart checkout
   - card mode (Stripe)
   - cash mode (token fee gate)
2. Seller listing publish (token-gated for external/manual payout mode)
3. Seller ad boost (token reserve/commit)
4. Food pickup
   - feed displays city+zip
   - exact address retained for fulfillment operations

## Environment Notes

1. Mapbox token required for address autocomplete.
2. Stripe publishable key required for card checkout.
3. Emulator recommended for local smoke on payment/token flows.

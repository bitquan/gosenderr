# Senderr App (Courier Web) — Baseline README

Courier-facing web app for job feed, lifecycle transitions, and payout/settings.

## Run

1. From repo root:
   - `pnpm install --frozen-lockfile`
2. Start app:
   - `pnpm --filter @gosenderr/senderr-app dev`
3. Build check:
   - `pnpm --filter @gosenderr/senderr-app build`

## Baseline Rules

1. Keep job lifecycle names aligned with shared contracts and admin controls.
2. Payout mode + token gating must match marketplace/admin behavior.
3. Do not fork route/status vocabulary in app-local enums.

## Critical Flows

1. Open job feed and claim.
2. Lifecycle transitions (accept -> pickup -> dropoff -> complete).
3. Settings payout modes:
   - `stripe_connect`
   - `external_provider`
   - `manual_settlement`
4. Token wallet visibility and top-up entry points.

## Structure

1. `src/pages/*`: route composition.
2. `src/lib/*`: firebase/functions, jobs, tokens, external navigation.
3. `src/components/*`: reusable UI only.

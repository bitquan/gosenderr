# Marketplace App — Quick Start

This README helps developers run the marketplace (customer-facing) app locally.

Prerequisites

- Node 18+, pnpm 8+, corepack enabled

Local setup

1. `corepack enable && corepack prepare pnpm@8.0.0 --activate`
2. `pnpm install --frozen-lockfile`
3. `pnpm --filter @gosenderr/marketplace-app dev`

Tests

- E2E: `pnpm --filter @gosenderr/marketplace-app test:e2e` (starts emulators)
- Add unit tests with Vitest: `pnpm --filter @gosenderr/marketplace-app test`

Notes

- Uses Mapbox and Stripe — ensure VITE_MAPBOX_TOKEN and VITE_STRIPE_PUBLISHABLE_KEY are set in env for local testing.

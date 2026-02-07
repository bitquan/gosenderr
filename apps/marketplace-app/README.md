# Marketplace App

Customer-facing marketplace web app in `apps/marketplace-app`.

## Setup

From repo root:

```bash
pnpm install --frozen-lockfile
```

## Run

From repo root:

```bash
pnpm --filter @gosenderr/marketplace-app dev
```

Default local URL: `http://localhost:5173` (or `VITE_PORT` / `PORT` if set).

## Test

From repo root:

- Unit tests:
  - `pnpm --filter @gosenderr/marketplace-app test`
- E2E tests (starts emulators):
  - `pnpm --filter @gosenderr/marketplace-app test:e2e`
- Build validation:
  - `pnpm --filter @gosenderr/marketplace-app build`

## Deploy

From repo root:

```bash
pnpm deploy:marketplace
```

Target: Firebase Hosting site `gosenderr-marketplace`

## Troubleshooting

- Mapbox or Stripe not working:
  - Verify `VITE_MAPBOX_TOKEN` and `VITE_STRIPE_PUBLISHABLE_KEY`.
- Emulator-dependent test failures:
  - Ensure Firebase emulator ports are free before running E2E.

## Links

- Repo docs policy: `/docs/BLUEPRINT.md`
- App docs registry: `/docs/apps/README.md`
- Deployment guide: `/docs/DEPLOYMENT.md`

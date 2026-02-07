# Admin Web App

Admin web app for operational tooling in `apps/admin-app`.

## Setup

From repo root:

```bash
pnpm install --frozen-lockfile
```

## Run

From repo root:

```bash
pnpm --filter @gosenderr/admin-app dev
```

Default local URL: `http://localhost:3000`

## Test

From repo root:

- Unit tests:
  - `pnpm --filter @gosenderr/admin-app test`
- Build validation:
  - `pnpm --filter @gosenderr/admin-app build`

## Deploy

From repo root:

```bash
pnpm deploy:admin
```

Target: Firebase Hosting site `gosenderr-admin`

## Troubleshooting

- Port already in use:
  - Set another Vite port or stop process using `3000`.
- Firebase/runtime config issues:
  - Verify required `VITE_FIREBASE_*` variables at repo level.

## Links

- Repo docs policy: `/docs/BLUEPRINT.md`
- App docs registry: `/docs/apps/README.md`
- Deployment guide: `/docs/DEPLOYMENT.md`

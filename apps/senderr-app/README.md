# Senderr Web App

This is the Senderr courier web app in `apps/senderr-app`.

## Setup

1. Install dependencies from repo root:
   - `pnpm install --frozen-lockfile`
2. Start the app:
   - `pnpm --filter @gosenderr/senderr-app dev`

Default local URL: `http://localhost:5174`

## Environment

This app reads the following env vars:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_MAPBOX_TOKEN`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_CONFIG_URL`

Use repo-level env guidance in `/README.md` until an app-local `.env.example` is added.

## Run

- Dev server:
  - `pnpm --filter @gosenderr/senderr-app dev`
- Production build:
  - `pnpm --filter @gosenderr/senderr-app build`
- Preview build:
  - `pnpm --filter @gosenderr/senderr-app preview`
- Lint:
  - `pnpm --filter @gosenderr/senderr-app lint`

## Test

Current package scripts do not include an app-local test command.

Use these validation commands from repo root:

- App lint:
  - `pnpm --filter @gosenderr/senderr-app lint`
- App production build:
  - `pnpm --filter @gosenderr/senderr-app build`

## Mobile (Capacitor)

- Sync native projects:
  - `pnpm --filter @gosenderr/senderr-app cap:sync`
- Open iOS project:
  - `pnpm --filter @gosenderr/senderr-app cap:open:ios`
- Open Android project:
  - `pnpm --filter @gosenderr/senderr-app cap:open:android`

## Deploy

From repo root:
- `pnpm deploy:senderr`

Target:
- Firebase Hosting site `gosenderr-courier`

## Troubleshooting

- Wrong port:
  - This app runs on `5174` via `vite.config.ts`.
- Firebase auth/config failures:
  - Verify required `VITE_FIREBASE_*` vars are set.
- Map errors:
  - Verify `VITE_MAPBOX_TOKEN`.

## Links

- Repo docs policy: `/docs/BLUEPRINT.md`
- App docs registry: `/docs/apps/README.md`
- App-specific copilot guidance: `/apps/senderr-app/copilot-instructions.md`

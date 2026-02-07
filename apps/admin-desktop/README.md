# Admin Desktop App

Electron-based admin desktop application in `apps/admin-desktop`.

## Setup

From repo root:

```bash
pnpm install --frozen-lockfile
```

## Run

From repo root:

- Full Phase 1 stack (Firebase emulators + Vite + Electron):
  - `pnpm dev:admin-desktop`
- Stop Phase 1 stack:
  - `pnpm stop:admin-desktop`
- Docker-assisted mode:
  - `pnpm dev:admin-desktop:docker`

From `apps/admin-desktop`:

- Renderer only (Vite on `http://localhost:5176`):
  - `pnpm dev`
- Electron process only (expects renderer already running):
  - `pnpm electron`

## Environment

Primary env vars used by this app:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_MAPBOX_TOKEN`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_CONFIG_URL`
- `VITE_ADMIN_DESKTOP_USE_EMULATORS`

## Build, Test, Package

From repo root:

- Build renderer + Electron main:
  - `pnpm --filter @gosenderr/admin-desktop build`
- E2E tests:
  - `pnpm --filter @gosenderr/admin-desktop test:e2e`
- Package directory (no installer):
  - `pnpm --filter @gosenderr/admin-desktop pack`
- Build distributables:
  - `pnpm --filter @gosenderr/admin-desktop dist`

## Troubleshooting

- Port conflicts (`4000`, `8080`, `9099`, `9199`, `5176`):
  - Run `pnpm stop:admin-desktop` before starting again.
- Electron opens blank window:
  - Ensure Vite is reachable on `http://localhost:5176`.
- Emulator/auth issues:
  - Start with `pnpm dev:admin-desktop` so emulators are booted consistently.

## Related Docs

- Repo docs policy: `/docs/BLUEPRINT.md`
- App docs registry: `/docs/apps/README.md`
- Dev workflow playbook: `/docs/DEVELOPER_PLAYBOOK.md`
- Legacy phase plan (archive reference): `/docs/project-plan/03-PHASE-1-ADMIN-DESKTOP.md`

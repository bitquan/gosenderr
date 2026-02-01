# Local Development (Docker)

This repository includes a Docker-based development setup to make it easier to run the Firebase emulators and web apps locally in a reproducible environment.

## Quick start

1. Build and start the environment:

```bash
bash scripts/dev-docker-up.sh
```

2. Follow logs (optional):

```bash
docker compose logs -f
```

3. Stop and tear down:

```bash
bash scripts/dev-docker-down.sh
```

## What it runs

- `firebase-emulator` — runs `./scripts/start-emulators.sh` and exposes:
  - Firestore: `localhost:8080`
  - Auth: `localhost:9099`
  - Storage: `localhost:9199`
  - Emulator UI: `localhost:4000`
- `admin-app` — Admin app dev server on `localhost:3000`
- `marketplace-app` — Marketplace app dev server on `localhost:5173`
- `courier-app` — Courier app dev server on `localhost:5174`
- `admin-desktop` — Vite renderer dev server on `localhost:5176`

## Notes & troubleshooting

- The Docker image caches dependencies (pnpm store) so subsequent runs are fast.
- If ports are already in use on your host, stop local dev servers or adjust ports in `docker-compose.yml`.
- All services mount the repo to `/workspace` so code changes are picked up immediately.

### Avoid mounting host `node_modules` (important)

To avoid cross-architecture and platform-specific native binary conflicts (for example, when the host is macOS ARM but containers run Linux x86_64), the Compose setup uses a named Docker volume for `/workspace/node_modules` so dependencies are installed inside the container and not overwritten by a host `node_modules` folder.

If you encounter native binary errors in containers (e.g., missing `@rollup/rollup-*-gnu` packages), run the following to install dependencies inside the container and restart the service:

```bash
# Start the compose stack (emulators + services)
bash scripts/dev-docker-up.sh

# Rebuild node modules inside a one-off container (example: admin-app)
docker compose run --rm admin-app pnpm install --frozen-lockfile

# Restart the service if needed
docker compose up -d admin-app
```

This approach keeps host `node_modules` from clobbering container-installed native modules and prevents the cross-arch issues we encountered.

### Admin Desktop packaging smoke test

Run these outside Docker on the native OS (macOS for `.dmg`, Windows for `.exe`) to avoid cross-arch issues:

```bash
pnpm --filter @gosenderr/admin-desktop dist
```

Verify the following in the packaged app:
- App opens without a white screen.
- Login works and the dashboard renders.
- Cmd/Ctrl+K opens Global Search.
- Open-in-new-window routes render correctly.

## VS Code Dev Container

There is a Node-focused devcontainer available: `.devcontainer/devcontainer.node.json`.
Open the Command Palette → "Dev Containers: Open Folder in Container..." and pick **GoSenderr Web + Firebase Dev** to enter a pre-built dev environment.

## Scripts

- `pnpm dev:docker` — (alias for `bash scripts/dev-docker-up.sh`) starts the setup
- `pnpm dev:docker:down` — stops the setup


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
- `customer-app` — Customer app dev server on `localhost:5173`
- `courier-app` — Courier app dev server on `localhost:5174`
- `shifter-app` — Runner/Shifter dev server on `localhost:5175`
- `web-app` — Marketing site dev server on `localhost:3003`

## Notes & troubleshooting

- The Docker image caches dependencies (pnpm store) so subsequent runs are fast.
- If ports are already in use on your host, stop local dev servers or adjust ports in `docker-compose.yml`.
- All services mount the repo to `/workspace` so code changes are picked up immediately.

## VS Code Dev Container

There is a Node-focused devcontainer available: `.devcontainer/devcontainer.node.json`.
Open the Command Palette → "Dev Containers: Open Folder in Container..." and pick **GoSenderr Web + Firebase Dev** to enter a pre-built dev environment.

## Scripts

- `pnpm dev:docker` — (alias for `bash scripts/dev-docker-up.sh`) starts the setup
- `pnpm dev:docker:down` — stops the setup


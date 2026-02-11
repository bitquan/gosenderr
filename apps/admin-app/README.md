# Admin App — Quick Start

This README shows how to run the Admin web app locally.

Prerequisites

- Node 18+, pnpm 8+, corepack enabled

Local setup

1. From repo root: `corepack enable && corepack prepare pnpm@8.0.0 --activate && pnpm install --frozen-lockfile`
2. Start dev server: `pnpm --filter @gosenderr/admin-app dev`

Tests & lint

- Lint: `pnpm --filter @gosenderr/admin-app lint`
- Tests: `pnpm --filter @gosenderr/admin-app test`

Notes

- See `docs/DEPLOYMENT.md` for deployment steps
- If you need to debug API access, set local Firebase emulator env vars as described in repo `README.md`.

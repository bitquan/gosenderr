# Minimal Setup (Keep your laptop lightweight)

This guide shows how to clone and work on only the parts of the monorepo you need so you don't store everything locally.

## Shallow + Sparse clone (recommended)

1. Clone only history depth=1 and no blobs, then enable sparse checkout:

```bash
git clone --depth 1 --filter=blob:none --sparse git@github.com:bitquan/gosenderr.git my-local-copy
cd my-local-copy
git sparse-checkout init --cone
# Only check out the marketplace app and shared packages
git sparse-checkout set apps/marketplace-app packages/shared
```

2. Install only the app's dependencies using pnpm filters:

```bash
pnpm --filter @gosenderr/marketplace-app install
```

3. Build only the app you need:

```bash
pnpm --filter @gosenderr/marketplace-app build
```

## Using the bootstrap script

A small helper is included to automate the above: `scripts/bootstrap-minimal.sh`.

Usage:

```bash
scripts/bootstrap-minimal.sh ./gosenderr-minimal "apps/marketplace-app packages/shared"
```

## Day-to-day tips

- Use `git sparse-checkout set <path>` to add/remove directories on demand.
- Use `pnpm --filter <pkg>` to install or build only what you need.
- Keep large caches off your internal disk (move pnpm store to external drive when needed).

## Scripts & Safety

- `scripts/clean-environment.sh` (stops emulators and clears caches)
- `scripts/cleanup-workspace.sh` (interactive cleanup; supports `--no-archive` for low disk situations)

If you'd like, I can add a `bootstrap:minimal` npm script and a GitHub Actions job that uses the minimal workflow for CI on PRs.

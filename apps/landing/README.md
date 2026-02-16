# Landing App

This is a static marketing site served from `apps/landing`.

## Setup

From repo root:

```bash
pnpm install --frozen-lockfile
```

## Run

From repo root:

```bash
python3 -m http.server 5500 --directory apps/landing
```

Open: `http://localhost:5500`

## Test

Landing is static HTML; use lightweight validation:

- Docs/path check:
  - `pnpm run verify:docs`
- Manual smoke check:
  - Load `http://localhost:5500` and verify hero/CTA links resolve.

## Deploy

From repo root:

```bash
firebase deploy --only hosting:gosenderr-landing --project gosenderr-6773f
```

## Troubleshooting

- If deploy fails with auth errors, run `firebase login`.
- If you changed asset paths, verify files exist under `apps/landing`.
- If cached content appears in browser, hard refresh after deploy.

## Links

- Root deployment docs: `docs/DEPLOYMENT.md`
- Canonical docs hierarchy: `docs/BLUEPRINT.md`

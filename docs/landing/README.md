# Landing App Docs Template

This is the canonical template pack for Landing app planning and branch hygiene.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `weekly`

## Canonical app path

- App folder: `apps/landing`

## Minimum dev commands

From repo root:

- `pnpm install --frozen-lockfile`
- `python3 -m http.server 5008 --directory apps/landing`
- `firebase emulators:start --only hosting`

## Required companion docs

- `docs/landing/BRANCHING.md`
- `docs/landing/ROADMAP.md`

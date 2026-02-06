# Copilot Instructions — `apps/marketplace-app`

This file documents the exact local steps, env variables, test accounts and branch/PR rules for the Marketplace app so contributors and Copilot have the app-level context.

## Purpose
Marketplace is the customer-facing web app with seller flows in previews. Keep these instructions short and actionable for local development and PRs.

## Environment variables (placeholders only)
- VITE_MAPBOX_TOKEN (Mapbox token used in local dev)
- VITE_API_URL or NEXT_PUBLIC_API_URL (when running preview against dev API)
- FIREBASE_PROJECT_ID (for emulator use: gosenderr-6773f)
- If you need service accounts for functions tests, always use CI secrets or local developer-only JSON kept out of Git.

## Test accounts (local emulators)
- customer@example.com / DemoPass123!
- seller@example.com / DemoPass123!

## Local development
- Start emulators & seed data (root script):
  - bash ../../scripts/start-emulators.sh
- Start dev server:
  - pnpm --filter @gosenderr/marketplace-app dev
- Build & preview:
  - pnpm --filter @gosenderr/marketplace-app build
  - pnpm --filter @gosenderr/marketplace-app preview
- Run Playwright tests (e2e):
  - Ensure emulators are running and seeded, then run: pnpm --filter @gosenderr/marketplace-app test:e2e

## Common debugging commands
- Check emulator logs: `tail -f apps/marketplace-app/firestore-debug.log` and `firebase-debug.log` in the repo root.
- If Playwright reports missing browsers: run `pnpm exec playwright install` or use the Playwright container in CI.
- If the preview fails because `dist` is missing: run `pnpm --filter @gosenderr/marketplace-app build` first.

## Branch & PR rules (per-app)
- Branch naming: `senderr-app/marketplace/<issue-number>-<short-desc>`
- Per-branch documentation: add `docs/branches/MKT-<issue-number>.md` describing the feature or migration with testing steps.
- PR checklist (must be followed):
  - Target branch `senderr_app` ✅
  - Add how-to-test steps in PR description ✅
  - Run `pnpm --filter @gosenderr/marketplace-app lint` and `pnpm --filter @gosenderr/marketplace-app test:e2e` locally when applicable ✅
  - If you add env variables, document them in `apps/marketplace-app/.env.example` and in the PR ✅

## Per-branch instructions template (copy into `docs/branches`)
Use a short template for branch docs so every feature branch provides a small `README` for reviewers:

```
# MKT-123: Short title
- Summary: One line summary of the change
- How to run locally:
  1. Start emulators: bash scripts/start-emulators.sh
  2. Build: pnpm --filter @gosenderr/marketplace-app build
  3. Preview: pnpm --filter @gosenderr/marketplace-app preview --port 5180
- Env vars: (list only placeholders)
- Tests to run: playwright tests/e2e (file names)
- Follow-ups: (notes)
```

## Copilot behavior
- Suggest small, testable changes and include a matching test or manual verification step in PRs.
- If Copilot alters build or deployment scripts, update this file and add an item to `docs/senderr_app/CHANGELOG.md`.

---
If you'd like, I will automatically add the branch doc template to `.github/PULL_REQUEST_TEMPLATE.md` so contributors are reminded to add per-branch docs for significant changes.

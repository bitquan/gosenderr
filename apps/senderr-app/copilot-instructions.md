# Copilot Instructions — `apps/senderr-app`

Short, app-specific guidance for Copilot and contributors working on the Senderr app.

## Purpose
This app contains the Senderr workflow (jobs, navigation, job details, delivery flow). Use this file for app-level instructions that are specific to building, running, and testing the Senderr app locally.

## Quick commands
- Start dev server (web):
  - pnpm --filter @gosenderr/senderr-app dev
- Build (web):
  - pnpm --filter @gosenderr/senderr-app build
- Preview production build:
  - pnpm --filter @gosenderr/senderr-app preview

## Mobile / Capacitor (iOS)
- Sync & run (iOS):
  - pnpm --filter @gosenderr/senderr-app build && npx cap sync ios && npx cap open ios
- For Xcode-related issues: clean DerivedData and ensure you have the correct CocoaPods installed.

## E2E & Emulators
- Use the root `scripts/start-emulators.sh` to start Firebase emulators and seed demo data.
- Local e2e tests live in `apps/senderr-app/tests/e2e` — run via the marketplace app or per-app playwright config where applicable.

## Developer tips
- Use `pnpm --filter @gosenderr/senderr-app install` to install only senderr dependencies when working in a sparse checkout.
- If building for iOS locally, prefer using a RAM disk for `DerivedData` during heavy iteration (see `scripts/ramdisk-deriveddata.sh`).

## Copilot behavior & heuristics (short)
- Prefer minimal, actionable suggestions that follow the repo's coding style and current TypeScript config. Keep changes small and create incremental PRs targeting `senderr_app`.
- When Copilot suggests changes that affect runtime behavior, include tests or a short manual verification step in the PR description.

## Environment variables (non-sensitive list)
- FIREBASE_PROJECT_ID (default: `gosenderr-6773f` for local emulators)
- NEXT_PUBLIC_API_URL or REACT_APP_API_URL (app API base URL)
- VITE_MAPBOX_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN (mapbox token for local UI)
- NODE_ENV (development | production)

> Note: Do NOT commit secrets or service account JSON files. Use `~/.env` or CI secrets and document values in `docs/` with placeholder names.

## Test accounts (local emulators)
The seed script creates demo users you can use in local dev:
- customer@example.com / DemoPass123!
- vendor@example.com / DemoPass123!
- courier@example.com / DemoPass123!
- admin@example.com / DemoPass123!

## Local development & debug commands
- Start Firebase emulators and seed data (root script):
  - bash ../../scripts/start-emulators.sh
- Run dev server (web):
  - pnpm --filter @gosenderr/senderr-app dev
- Build & preview production build:
  - pnpm --filter @gosenderr/senderr-app build
  - pnpm --filter @gosenderr/senderr-app preview
- Mobile (Capacitor) quick commands:
  - pnpm --filter @gosenderr/senderr-app build && npx cap sync ios
  - npx cap open ios
- Run e2e tests (Playwright):
  - Start emulators (see above) then `pnpm --filter @gosenderr/marketplace-app test:e2e` (marketplace runs common seeds)

## Debugging tips
- If emulator auth fails, re-run `bash scripts/start-emulators.sh` and inspect `firestore-debug.log` and `firebase-debug.log` in the app root.
- For Xcode / iOS build issues: clean DerivedData `rm -rf ~/Library/Developer/Xcode/DerivedData` and run `pod install` from `ios/`.
- For JS runtime issues, use `pnpm --filter @gosenderr/senderr-app dev` and inspect console/network logs in the browser.

## Branching & PR checklist (app-specific)
- Branch naming: `senderr-app/courier/<issue-number>-<short-desc>` (e.g., `senderr-app/courier/123-fix-job-listing`).
- Branching rules:
  - Branch from up-to-date `senderr_app` branch.
  - Keep one feature per branch; small, reviewable PRs are preferred.
- PR checklist (ensure all apply):
  - Does the PR target `senderr_app`? ✅
  - Does it include a short summary + issue link? ✅
  - Do tests pass locally (unit/lint/e2e) for the changed scope? ✅
  - Add a short `How to test` section in the PR description. ✅
  - Update `apps/senderr-app/copilot-instructions.md` if changes require new local steps. ✅

## Making per-branch instructions (how we keep work discoverable)
- Add a short file `docs/branches/COUR-123.md` describing the feature or migration (what was done, how to test, env vars required, follow-ups). Keep it in the same branch and reference it in the PR.
- Use the PR to link to this branch doc and attach test artifacts (screenshots, logs) as necessary.

## Automation hints
- Use `scripts/bootstrap-minimal.sh` for a minimal clone and `scripts/icloud/*` to archive big artifacts.
- Add small artifact uploads in CI for important emulator exports or build artifacts (GCS/S3 recommended) and use short retention policies.

## Final note
If you want, I can add a `PR_TEMPLATE` snippet to remind contributors to add branch-level docs and update `copilot-instructions.md` when they make cross-cutting changes.

## References
- Repository-level Copilot guidance: `.github/copilot-instructions.md`
- Local example: `apps/courieriosnativeclean` (native iOS) for platform-specific patterns

---
*If you want more app-specific items added (scripts to run, env vars, test accounts), tell me which details you want included and I'll update this file.*

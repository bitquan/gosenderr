# Copilot Instructions — `apps/courier-app`

Short, app-specific guidance for Copilot and contributors working on the Courier app.

## Purpose
This app contains the Courier workflow (jobs, navigation, job details, delivery flow). Use this file for app-level instructions that are specific to building, running, and testing the Courier app locally.

## Quick commands
- Start dev server (web):
  - pnpm --filter @gosenderr/courier-app dev
- Build (web):
  - pnpm --filter @gosenderr/courier-app build
- Preview production build:
  - pnpm --filter @gosenderr/courier-app preview

## Mobile / Capacitor (iOS)
- Sync & run (iOS):
  - pnpm --filter @gosenderr/courier-app build && npx cap sync ios && npx cap open ios
- For Xcode-related issues: clean DerivedData and ensure you have the correct CocoaPods installed.

## E2E & Emulators
- Use the root `scripts/start-emulators.sh` to start Firebase emulators and seed demo data.
- Local e2e tests live in `apps/courier-app/tests/e2e` — run via the marketplace app or per-app playwright config where applicable.

## Developer tips
- Use `pnpm --filter @gosenderr/courier-app install` to install only courier dependencies when working in a sparse checkout.
- If building for iOS locally, prefer using a RAM disk for `DerivedData` during heavy iteration (see `scripts/ramdisk-deriveddata.sh`).

## Copilot behavior & heuristics (short)
- Prefer minimal, actionable suggestions that follow the repo's coding style and current TypeScript config. Keep changes small and create incremental PRs targeting `senderr_app`.
- When Copilot suggests changes that affect runtime behavior, include tests or a short manual verification step in the PR description.

## References
- Repository-level Copilot guidance: `.github/copilot-instructions.md`
- Local example: `apps/courieriosnativeclean` (native iOS) for platform-specific patterns

---
*If you want more app-specific items added (scripts to run, env vars, test accounts), tell me which details you want included and I'll update this file.*
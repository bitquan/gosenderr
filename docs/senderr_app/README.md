# Senderr App — Developer Quick Start 🚀

This quick-start helps contributors get the Senderr iOS app running locally and follow the repo's development conventions.

## Environment
- Node: 18.x (use nvm or system)
- pnpm: >= 8 (use corepack)
- Xcode: latest compatible with RN target
- CocoaPods: latest
- watchman: recommended on macOS
- Optional: `ios-deploy` for running on physical devices (`brew install ios-deploy`)

## Setup
1. Enable Corepack and install pnpm:
   - `corepack enable && corepack prepare pnpm@8.0.0 --activate`
2. Install dependencies at the repo root:
   - `pnpm install --frozen-lockfile`
3. Bootstrap iOS from canonical templates (sync + pod install):
   - `pnpm run ios:bootstrap`
4. Verify canonical iOS structure and template sync:
   - `pnpm run ios:check`
5. Verify Debug/Release iOS compile matrix:
   - `pnpm run ios:build:verify`
6. Open the iOS workspace in Xcode:
   - `open apps/courieriosnativeclean/ios/Senderr.xcworkspace`
7. Select scheme `Senderr` in Xcode before running.

## Run the app (iOS Simulator)
1. Start Metro (from the app folder):
   - `pnpm run start -- --reset-cache` or `npx react-native start --reset-cache`
2. In another terminal (same folder):
   - `pnpm run ios -- --simulator="iPhone 17"` or `npx react-native run-ios --simulator="iPhone 17"`

> Common Metro issues:
> - If Metro can't resolve modules in a pnpm monorepo, ensure `metro.config.js` includes the repo root `node_modules` in `watchFolders` and `nodeModulesPaths`. (See `metro.config.js` in this app.)

## Run tests & checks
- Lint: `pnpm lint`
- Type check: `pnpm type-check`
- Unit tests: `pnpm -w test --if-present`
- Verify docs: `pnpm run verify:docs`

## Branching & PRs
- Branch from `senderr_app` and use `senderr-app/<type>/<short-desc>` for sub-branches (e.g., `senderr-app/feature/auth-flow`).
- Open PRs targeting `senderr_app` and follow the PR template.

## Troubleshooting
- `error: unknown command 'start'` → run the app's `start` script, not the repo root `npx react-native start` unless in the app folder.
- `ios-deploy` missing → install with `brew install ios-deploy` to run on devices.
- Metro module resolution with pnpm → ensure `watchFolders` include the monorepo root `node_modules`.

## Docs & audits
- Keep code and docs in sync: update docs in the same PR when behavior changes.
- See `docs/senderr_app/AUDIT.md` for the flow audit checklist and cadence.

---

If you'd like, I can add a small local script or a Makefile to ease these commands.

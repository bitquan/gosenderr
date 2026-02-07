# Senderr App — Developer Quick Start

This is the source-of-truth guide for the native Senderr courier app at `apps/courieriosnativeclean`.

## Canonical iOS targets
- Workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Xcode scheme: `Senderr`
- Bundle id: `com.gosenderr.senderr`
- Minimum iOS: `16.0`

Legacy duplicate iOS project/workspace folders are archived at `apps/_archive/legacy-ios-workspaces/` and are out of active scope.

## Setup
1. Install deps from repo root:
   - `pnpm install --frozen-lockfile`
2. Run canonical iOS setup + verification:
   - `pnpm run ios:senderr`
4. Open Xcode workspace:
   - `open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`

Optional subcommands:
- `pnpm run ios:clean:install`
- `pnpm run ios:build:verify`

## Storage hardening checks
Run Storage rules regression tests from repo root:
- `firebase emulators:exec --only firestore,storage "cd firebase && node tests/storageRules.test.mjs && node tests/storagePublicRead.test.mjs"`

Coverage includes:
- Marketplace public-read behavior remains intact
- Delivery-proof uploads restricted to assigned courier
- Admin read access for protected courier docs
- Invalid path segment rejection for courier expense uploads

## Run on simulator/device
1. Start Metro from app folder:
   - `cd apps/courieriosnativeclean && npx react-native start --reset-cache`
2. Run from Xcode with scheme `Senderr`.

For physical devices, point Metro host to your machine IP in `AppDelegate.swift` and keep phone + Mac on same network.

## Current courier shell
- Auth: login/logout via Firebase where configured; local mock fallback for offline dev.
- Navigation: dashboard / jobs / settings tabs + job detail route.
- Jobs: list/detail read, optimistic status action updates.
- Jobs fallback: when Firebase read/write fails at runtime, jobs flow falls back to AsyncStorage-backed local mock data.
- Location: permission request and tracking hook with latest coordinate snapshot.

## Build-time environment config
- Env profile files:
  - `apps/courieriosnativeclean/ios/config/env/dev.xcconfig`
  - `apps/courieriosnativeclean/ios/config/env/staging.xcconfig`
  - `apps/courieriosnativeclean/ios/config/env/prod.xcconfig`
- Build helper:
  - `bash scripts/ios-build-env.sh dev`
  - `bash scripts/ios-build-env.sh staging`
  - `bash scripts/ios-build-env.sh prod Release`

Injected build-time keys:
- `SENDERR_ENV_NAME`
- `SENDERR_API_BASE_URL`
- `SENDERR_FIREBASE_API_KEY`
- `SENDERR_FIREBASE_AUTH_DOMAIN`
- `SENDERR_FIREBASE_PROJECT_ID`
- `SENDERR_FIREBASE_STORAGE_BUCKET`
- `SENDERR_FIREBASE_MESSAGING_SENDER_ID`
- `SENDERR_FIREBASE_APP_ID`

Defaults:
- `Debug` => `dev`
- `Release` => `prod`

Native precedence:
1. Values injected through `Info.plist` build settings (`SENDERR_*`)
2. `GoogleService-Info.plist` values for Firebase keys/project/bucket/app ID/sender ID
3. Environment defaults (`dev` / `staging` / `prod`)

## Supporting docs
- Repo-wide playbook: `docs/DEVELOPER_PLAYBOOK.md`
- Session handoff state: `docs/dev/SESSION_STATE.md`
- Session worklog: `docs/dev/WORKLOG.md`
- Navigation map: `docs/senderr_app/NAVIGATION_MAP.md`
- MVP criteria: `docs/senderr_app/MVP_ACCEPTANCE.md`
- Signing/provisioning: `docs/senderr_app/IOS_SIGNING.md`
- Flow audit guide: `docs/senderr_app/AUDIT.md`

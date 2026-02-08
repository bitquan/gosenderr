# Senderr App — Developer Quick Start

This is the source-of-truth guide for the native Senderr courier app at `apps/courieriosnativeclean`.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-07`
> - Review cadence: `weekly`

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
- Jobs: app-level real-time sync with Firestore listener, reconnect backoff, stale-data indicator, optimistic status updates, and offline status-update queue flush on reconnect.
- Jobs fallback: AsyncStorage mock fallback is allowed only outside production mode.
- Location: permission request and tracking hook with latest coordinate snapshot.
- Profile/settings: courier profile read/write with validation, local cache persistence, and Firebase sync fallback. Includes separate package and food rate cards with guardrails for minimum pricing.
- Telemetry: Firebase Analytics + Crashlytics via service adapter with non-fatal error capture and runtime safety fallback.

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
- `SENDERR_ALLOW_MOCK_AUTH`
- `SENDERR_FIREBASE_API_KEY`
- `SENDERR_FIREBASE_AUTH_DOMAIN`
- `SENDERR_FIREBASE_PROJECT_ID`
- `SENDERR_FIREBASE_STORAGE_BUCKET`
- `SENDERR_FIREBASE_MESSAGING_SENDER_ID`
- `SENDERR_FIREBASE_APP_ID`
- `SENDERR_MAP_PROVIDER`
- `SENDERR_MAPBOX_ACCESS_TOKEN`

Defaults:
- `Debug` => `dev`
- `Release` => `prod`

Native precedence:
1. `GoogleService-Info.plist` values for Firebase keys/project/bucket/app ID/sender ID
2. Values injected through `Info.plist` build settings (`SENDERR_*`)
3. Environment defaults (`dev` / `staging` / `prod`)

This ordering prevents mixed Firebase runtime config (for example, API key from plist + projectId from xcconfig), which can cause Firestore role checks to fail as "offline" even when network is available.

Auth mode rules:
- Firebase auth is the default and required path.
- Mock auth is disabled by default across all env profiles.
- Local-only override requires explicit `SENDERR_ALLOW_MOCK_AUTH=1` in a non-production build.

## Upgrade-safe service architecture

The app now uses a ports/adapters model for core domains:

- Auth
- Jobs
- Location
- Notifications
- Analytics

Implementation layout:

- Ports: `apps/courieriosnativeclean/src/services/ports/*`
- Adapters: `apps/courieriosnativeclean/src/services/adapters/*`
- Service registry and dependency entrypoint:
  - `apps/courieriosnativeclean/src/services/serviceRegistry.tsx`

Rules:

- Screen components and context layers consume services through `useServiceRegistry()`.
- Direct SDK imports should stay in adapter modules only.
- New provider/sdk integration should add or update a port interface first, then adapter implementation.

## Supporting docs
- Native dependency audit: `docs/senderr_app/NATIVE_DEPENDENCY_AUDIT.md`
- Crash + analytics guide: `docs/senderr_app/CRASH_ANALYTICS.md`
- Smoke checklist: `docs/senderr_app/SMOKE_CHECKLIST.md`
- Roadmap/progress tracker: `docs/senderr_app/ROADMAP.md`
- App README (build fixes + troubleshooting): `apps/courieriosnativeclean/README.md`
- Repo-wide playbook: `docs/DEVELOPER_PLAYBOOK.md`
- Session handoff state: `docs/dev/SESSION_STATE.md`
- Session worklog: `docs/dev/WORKLOG.md`
- Device test matrix: `docs/senderr_app/DEVICE_TEST_MATRIX.md`
- Maps validation: `docs/senderr_app/MAPS_VALIDATION.md`
- Navigation map: `docs/senderr_app/NAVIGATION_MAP.md`
- MVP criteria: `docs/senderr_app/MVP_ACCEPTANCE.md`
- Signing/provisioning: `docs/senderr_app/IOS_SIGNING.md`
- Flow audit guide: `docs/senderr_app/AUDIT.md`
- Jobs schema migration: `docs/senderr_app/JOBS_SCHEMA_MIGRATION.md`
- Offline active job sync: `docs/senderr_app/OFFLINE_MODE.md`

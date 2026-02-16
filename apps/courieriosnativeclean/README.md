# Senderr iOS Native App

Canonical native iOS app for Senderr couriers.

## Setup

Canonical project identity:

- Workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Scheme: `Senderr`
- Bundle ID: `com.gosenderr.senderr`

From repo root:

```bash
pnpm install --frozen-lockfile
pnpm run ios:senderr clean-install
```

Open in Xcode:

```bash
open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace
```

Do not use `Senderrappios.xcodeproj` for active work.

## Run

From repo root:

```bash
pnpm run ios:senderr open-xcode
```

Metro (in separate terminal):

```bash
pnpm run ios:senderr metro
```

Manual pod command (only from canonical iOS directory):

```bash
cd apps/courieriosnativeclean/ios
pod install
```

## Test

From repo root:

- iOS smoke checks:
  - `pnpm run ios:smoke`
- iOS compile matrix (Debug + Release):
  - `pnpm run ios:build:verify`

Note:

- RN Jest and ESLint scripts in this app currently need config alignment before they are reliable release gates.
- Type-check gate is available and should pass for architecture changes:
  - `pnpm --filter courieriosnativeclean exec tsc --noEmit`

## Upgrade-safe architecture

Core feature modules use a ports/adapters service registry.

- Ports:
  - `apps/courieriosnativeclean/src/services/ports/authPort.ts`
  - `apps/courieriosnativeclean/src/services/ports/jobsPort.ts`
  - `apps/courieriosnativeclean/src/services/ports/locationPort.ts`
  - `apps/courieriosnativeclean/src/services/ports/notificationsPort.ts`
  - `apps/courieriosnativeclean/src/services/ports/analyticsPort.ts`
- Adapters:
  - `apps/courieriosnativeclean/src/services/adapters/*`
- Registry provider:
  - `apps/courieriosnativeclean/src/services/serviceRegistry.tsx`

Rules:

- Screens and UI context must consume services via `useServiceRegistry()`.
- SDK-specific code stays inside adapters, not screen components.
- New integrations must add a port contract first, then adapter implementation.
- Jobs sync path uses repository subscription (`subscribeJobs`) with reconnect/stale state surfaced to screens.
- Offline job updates are queued locally and auto-synced when connectivity returns.
- Production mode does not silently fallback to local seed jobs for Firestore failures.
- Dashboard map validation card uses native maps (`react-native-maps`) with marker data from jobs/location services.
- Analytics/crash telemetry is routed through `analyticsPort` so screens remain decoupled from Firebase SDK calls.

## Deploy

No one-command hosted deploy exists for this native app.

Release flow is Xcode/TestFlight-based:

1. Build/archive from `Senderrappios.xcworkspace`.
2. Distribute through App Store Connect/TestFlight.
3. Run internal release checklist:
   - `docs/senderr_app/TESTFLIGHT_QA_CHECKLIST.md`

For environment profile builds:

- `bash scripts/ios-build-env.sh dev`
- `bash scripts/ios-build-env.sh staging`
- `bash scripts/ios-build-env.sh prod Release`
- `pnpm run ios:testflight:archive`

## Troubleshooting

- `The sandbox is not in sync with Podfile.lock`:
  - `pnpm run ios:clean:install`
- `No such module 'FirebaseCore'`:
  - Run `pnpm run ios:clean:install`, then reopen `.xcworkspace`.
- `No Podfile found`:
  - Ensure you are in `apps/courieriosnativeclean/ios`.
- Device cannot reach Metro on `localhost:8081`:
  - Start Metro on LAN host:
    - `cd apps/courieriosnativeclean && npx react-native start --host 0.0.0.0 --port 8081 --reset-cache`
  - Keep Mac and phone on same Wi-Fi.
- Firebase crash for missing plist:
  - Ensure file exists at:
    - `apps/courieriosnativeclean/ios/Senderrappios/GoogleService-Info.plist`
- `Firebase auth is required` on login:
  - Ensure `SENDERR_FIREBASE_*` values are present and valid for current profile.
  - For local-only fallback testing, explicitly set `SENDERR_ALLOW_MOCK_AUTH = 1` in a non-production config.
- Map card warns about missing token/provider config:
  - Ensure `SENDERR_MAP_PROVIDER` is set to `native` or `mapbox`.
  - If `SENDERR_MAP_PROVIDER = mapbox`, set `SENDERR_MAPBOX_ACCESS_TOKEN`.
- `Unable to verify courier access while offline` immediately after sign-in:
  - Confirm `GoogleService-Info.plist` matches the active app and Firebase project.
  - Confirm target bundle ID matches the plist bundle ID (or replace plist with one for the current bundle ID).
  - Run `pnpm run ios:clean:install`, then rebuild from `Senderrappios.xcworkspace`.
- Jobs update succeeds locally but sync card shows pending:
  - Device is offline or backend is temporarily unavailable.
  - Keep app open; queued status writes sync automatically on reconnect.

## Links

- Repo docs policy: `/docs/BLUEPRINT.md`
- Senderr iOS docs hub: `/docs/senderr_app/README.md`
- Senderr iOS roadmap: `/docs/senderr_app/ROADMAP.md`
- Jobs schema migration path: `/docs/senderr_app/JOBS_SCHEMA_MIGRATION.md`
- Maps validation checklist: `/docs/senderr_app/MAPS_VALIDATION.md`
- Offline mode details: `/docs/senderr_app/OFFLINE_MODE.md`
- Crash + analytics setup: `/docs/senderr_app/CRASH_ANALYTICS.md`
- Push notifications setup + validation: `/docs/senderr_app/PUSH_NOTIFICATIONS.md`
- App docs registry: `/docs/apps/README.md`

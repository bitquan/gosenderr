# Senderr iOS (React Native)

Canonical native iOS app for couriers.

## Canonical project path
- Workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Scheme: `Senderr`
- Bundle id: `com.gosenderr.senderr`

Legacy iOS workspaces/projects were archived under `apps/_archive/legacy-ios-workspaces/` and should not be used for active development.

## Implemented P1 courier shell
- Auth flow (login/logout) with Firebase-backed mode and local mock fallback.
- Base app navigation shell (Dashboard / Jobs / Settings) plus Job Detail flow.
- Jobs list + detail loading from Firestore with local seeded fallback.
- Job status actions (`pending -> accepted -> picked_up -> delivered`) with optimistic UI update.
- Location permissions + background-capable tracking hook for courier updates.

## Local run
1. Install dependencies from repo root:
   - `pnpm install`
2. Run the canonical iOS prep/build flow:
   - `pnpm run ios:senderr`
3. Open workspace:
   - `open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
4. In another terminal, start Metro:
   - `cd apps/courieriosnativeclean && npx react-native start --reset-cache`

## Canonical pod install steps
Always run pod operations from this exact directory:

```bash
cd /Users/papadev/dev/apps/Gosenderr_Dev_Folder/gosenderr/apps/courieriosnativeclean/ios
pod install
```

If you see "No Podfile found", you are in the wrong folder.

Do not open `Senderrappios.xcodeproj` for active work. Use:
- `Senderrappios.xcworkspace`

Do not manually edit generated files under `ios/Pods/`.

## Build verification
Canonical one-command flow from repo root:

```bash
pnpm run ios:senderr
```

Optional subcommands:
- `pnpm run ios:clean:install`
- `pnpm run ios:build:verify`

`ios:build:verify` still checks:
- Debug simulator build
- Debug device compile build
- Release device compile build

## Clean build recovery
From repo root:

```bash
pnpm run ios:clean:install
pnpm run ios:build:verify
```

If Xcode still shows stale build state:

```bash
pkill -f XCBuildService || true
rm -rf ~/Library/Developer/Xcode/DerivedData/Senderrappios-*
```

Then reopen:
- `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`

## Known issues and workarounds
- Error: `The sandbox is not in sync with Podfile.lock`
  - Fix: run `pnpm run ios:clean:install` from repo root.
- Error: `No such module 'FirebaseCore'`
  - Fix: run `pnpm run ios:clean:install`, then reopen `.xcworkspace` (not `.xcodeproj`).
- Error: `Command PhaseScriptExecution failed with a nonzero exit code`
  - Fix: verify Metro is running, rerun `pnpm run ios:clean:install`, then rebuild.
- Error: device cannot reach `http://localhost:8081`
  - Fix: run Metro on all interfaces:
    - `cd apps/courieriosnativeclean && npx react-native start --host 0.0.0.0 --port 8081 --reset-cache`
  - Ensure iPhone and Mac are on the same Wi-Fi network.
- Runtime crash: `FirebaseApp.configure() could not find a valid GoogleService-Info.plist`
  - Fix: place `GoogleService-Info.plist` in:
    - `apps/courieriosnativeclean/ios/Senderrappios/GoogleService-Info.plist`

## Runtime configuration
### Build-time environment profiles (`dev` / `staging` / `prod`)
- Profile files:
  - `apps/courieriosnativeclean/ios/config/env/dev.xcconfig`
  - `apps/courieriosnativeclean/ios/config/env/staging.xcconfig`
  - `apps/courieriosnativeclean/ios/config/env/prod.xcconfig`
- Build with a profile:
  - `bash scripts/ios-build-env.sh dev`
  - `bash scripts/ios-build-env.sh staging`
  - `bash scripts/ios-build-env.sh prod Release`

The app receives these build-time values via `Info.plist` keys and injects them into RN at startup:
- `SENDERR_ENV_NAME`
- `SENDERR_API_BASE_URL`
- `SENDERR_FIREBASE_API_KEY`
- `SENDERR_FIREBASE_AUTH_DOMAIN`
- `SENDERR_FIREBASE_PROJECT_ID`
- `SENDERR_FIREBASE_STORAGE_BUCKET`
- `SENDERR_FIREBASE_MESSAGING_SENDER_ID`
- `SENDERR_FIREBASE_APP_ID`

Defaults:
- `Debug` builds default to `dev`
- `Release` builds default to `prod`

Native config precedence:
1. `SENDERR_*` build settings (from `xcconfig`/Xcode)
2. `GoogleService-Info.plist` values for Firebase keys/project/bucket/app ID/sender ID
3. Env defaults (`dev` / `staging` / `prod`)

If Firebase keys are blank, or Firebase calls fail at runtime, the app safely falls back to local mock auth/jobs.

## Related issues
- `#123` Stabilize pod install and clean build workflow
- `#124` gRPC/BoringSSL header/modulemap alignment
- `#125` Confirm Debug + Release build in Xcode
- `#127` Rename app identity to Senderr
- `#129` Bundle identifiers + provisioning docs
- `#131` Navigation structure
- `#132` Base screen scaffolds
- `#133` Wire base flows to mock data
- `#134` Auth integration
- `#135` Jobs list + detail read
- `#136` Job status updates + actions
- `#144` Location permissions + tracking
- `#148` API/client config cleanup for native target
- `#150` MVP acceptance criteria
- `#161` Canonical iOS cleanup
- `#165` Storage hardening (rules + regression tests)
- `#149` Consolidate iOS build scripts

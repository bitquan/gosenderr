<<<<<<< HEAD
# Senderr iOS Notes

## Issue #122 (gRPC/modulemap build failures)
- Canonical iOS project path: `apps/courieriosnativeclean/ios`
- Canonical workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Canonical scheme: `Senderr`
- Canonical template source: `templates/ios/*`

### Required setup
```bash
pnpm install
pnpm run ios:bootstrap
pnpm run ios:check
```

### Validation commands
```bash
cd apps/courieriosnativeclean/ios
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Debug -sdk iphoneos -destination 'generic/platform=iOS' clean build
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' clean build
```

### Physical device note
- Ensure Metro is reachable from device (not `localhost`): use your Mac LAN IP (for example `192.168.0.76:8081`).

---

## Issue #123 (clean pod install workflow)

### Single command sequence
```bash
pnpm run ios:pod:check
pnpm run ios:clean:build:debug
```

### What this does
- Syncs canonical iOS templates (`Podfile`, `.xcode.env`, `LocalDebug.xcconfig`)
- Clears project Pods + local iOS build folder
- Clears Senderrappios DerivedData only
- Clears CocoaPods cache
- Runs deterministic pod install (`pod install --deployment` when `Podfile.lock` exists)
- Verifies `Podfile.lock` and `Pods/Manifest.lock` are in sync

---

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
=======
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
>>>>>>> senderr_app

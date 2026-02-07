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

## Deploy

No one-command hosted deploy exists for this native app.

Release flow is Xcode/TestFlight-based:

1. Build/archive from `Senderrappios.xcworkspace`.
2. Distribute through App Store Connect/TestFlight.

For environment profile builds:

- `bash scripts/ios-build-env.sh dev`
- `bash scripts/ios-build-env.sh staging`
- `bash scripts/ios-build-env.sh prod Release`

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

## Links

- Repo docs policy: `/docs/BLUEPRINT.md`
- Senderr iOS docs hub: `/docs/senderr_app/README.md`
- Senderr iOS roadmap: `/docs/senderr_app/ROADMAP.md`
- App docs registry: `/docs/apps/README.md`

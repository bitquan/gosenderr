# Senderr iOS Native (`apps/courieriosnativeclean`)

This is the canonical iOS native app for Senderr.

## Canonical paths
- App root: `apps/courieriosnativeclean`
- iOS root: `apps/courieriosnativeclean/ios`
- Workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Scheme: `Senderr`
- Podfile path: `apps/courieriosnativeclean/ios/Podfile`
- Canonical iOS templates: `templates/ios/*`

## Prerequisites
- Node 18+
- `pnpm` 8+
- Xcode current version
- CocoaPods (`pod` command available)

## Setup (repo root)
Run from repo root:

```bash
pnpm install
pnpm run ios:bootstrap
pnpm run ios:check
```

What these do:
- `ios:bootstrap`: syncs canonical iOS template files and runs `pod install`
- `ios:check`: verifies there is exactly one active iOS Podfile and canonical workspace/scheme

## Open in Xcode
Open only:

```bash
open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace
```

In Xcode:
- select scheme `Senderr`
- choose your simulator or physical device
- Product -> Build / Run

## Deterministic clean pod workflow (`#123`)
If Xcode shows pod sandbox or module errors, run:

```bash
pnpm run ios:pod:check
pnpm run ios:clean:install
pnpm run ios:check
```

This workflow:
- clears `Pods/` and `ios/build`
- clears only `Senderr*` entries in DerivedData
- clears CocoaPods cache
- runs deterministic `pod install` (`--deployment` when lockfile exists)
- verifies `Podfile.lock` equals `Pods/Manifest.lock`

## Build validation
Run full verification from repo root:

```bash
pnpm run ios:build:verify
```

Verification script behavior:
- runs Debug simulator build
- runs Debug device build
- runs Release device build
- sets `RCT_NO_LAUNCH_PACKAGER=1` and `SKIP_BUNDLING=1` for deterministic CLI verification
- sets `CODE_SIGNING_ALLOWED=NO` for device compile-only checks
- creates a temporary placeholder `GoogleService-Info.plist` if missing, then removes it after verification

Equivalent manual commands:

```bash
cd apps/courieriosnativeclean/ios
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Debug -destination 'generic/platform=iOS Simulator' clean build
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Debug -sdk iphoneos -destination 'generic/platform=iOS' clean build
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' clean build
```

## Physical device run
Start Metro from app root:

```bash
cd apps/courieriosnativeclean
pnpm start -- --reset-cache
```

Point the app to your Mac LAN IP (not `localhost`), for example:
- `192.168.0.76:8081`

## Firebase config
If app startup fails with `No such module FirebaseCore` or `FirebaseApp.configure()` errors:
- confirm `GoogleService-Info.plist` exists at:
  - `apps/courieriosnativeclean/ios/Senderrappios/GoogleService-Info.plist`
- rerun:
  - `pnpm run ios:clean:install`

## Common pitfalls
- Running `pod install` from the wrong folder:
  - must run in `apps/courieriosnativeclean/ios`
- Opening `.xcodeproj` instead of `.xcworkspace`
- Using archived or legacy iOS project folders instead of canonical path

## Related issues
- `#123` Stabilize pod install and clean build workflow
- `#125` Confirm Debug + Release build in Xcode
- `#126` Document build fixes in app README

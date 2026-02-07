# Senderr iOS (React Native)

## Local run
1. From repo root, install deps:
   - `pnpm install`
2. Install pods:
   - `cd apps/courieriosnativeclean/ios && pod install`
3. Open workspace:
   - `open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
4. Use scheme:
   - `Senderr`

## Build verification (`#125`)
Run full compile matrix from repo root:

```bash
pnpm run ios:build:verify
```

The script verifies:
- Debug simulator build
- Debug device build (compile-only)
- Release device build (compile-only)

Script behavior:
- sets `RCT_NO_LAUNCH_PACKAGER=1` and `SKIP_BUNDLING=1` for deterministic CLI builds
- sets `CODE_SIGNING_ALLOWED=NO` for device compile checks
- creates a temporary placeholder `GoogleService-Info.plist` if missing, then removes it

## Manual equivalent

```bash
cd apps/courieriosnativeclean/ios
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Debug -destination 'generic/platform=iOS Simulator' clean build
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Debug -sdk iphoneos -destination 'generic/platform=iOS' clean build CODE_SIGNING_ALLOWED=NO
xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' clean build CODE_SIGNING_ALLOWED=NO
```

## Related issues
- `#123` Stabilize pod install and clean build workflow
- `#125` Confirm Debug + Release build in Xcode
- `#126` Document build fixes in app README

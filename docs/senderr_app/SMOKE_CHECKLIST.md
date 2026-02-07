# Senderr iOS Smoke Checklist

Use this checklist before merge for iOS-native related changes.

## 1) Fast smoke (required)

From repo root:

```bash
pnpm run ios:smoke
```

Expected:
- script returns `PASS: Senderr iOS smoke checks`

## 2) Build smoke (required on macOS)

From repo root:

```bash
pnpm run ios:clean:install
pnpm run ios:build:verify
```

Expected:
- Debug simulator build succeeds
- Debug device compile succeeds
- Release device compile succeeds

## 3) Xcode smoke (required for iOS-impacting changes)

Open:
- `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`

Build with scheme:
- `Senderr`

Expected:
- No `Podfile.lock sandbox out of sync` error
- No `No such module FirebaseCore` error

## 4) Runtime smoke

Start Metro:

```bash
cd apps/courieriosnativeclean
npx react-native start --reset-cache
```

Expected:
- App boots without immediate red screen
- Core shell routes load (Dashboard / Jobs / Settings)

## 5) Physical device smoke (when testing on phone)

If device cannot reach Metro:

```bash
cd apps/courieriosnativeclean
npx react-native start --host 0.0.0.0 --port 8081 --reset-cache
```

Expected:
- Device reaches Metro
- App launches and loads JS bundle

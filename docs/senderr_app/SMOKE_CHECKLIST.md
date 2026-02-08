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

## 6) UX reliability smoke (issues #206/#208/#209)

Validate these states before merge:

- Dashboard
  - Loading / empty / error state cards appear correctly for jobs.
  - Tracking card shows `Tracking status`, `Upload health`, and `Last sync`.
  - Retry button appears when tracking/sync health is degraded or error.
- Jobs
  - Sync card updates tone and message for `live`, `reconnecting`, and `error`.
  - Manual `Retry sync` is available on degraded/error sync states.
  - Empty and error states expose clear recovery actions.
- Settings
  - Courier profile loads from Firebase/local fallback and can be saved.
  - Package and food rate cards validate and persist.
  - In non-prod builds, `Feature Flags (Debug)` shows effective flag values and refresh works.

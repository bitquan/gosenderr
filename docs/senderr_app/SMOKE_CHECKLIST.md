# Senderr iOS Smoke Checklist

> Doc metadata
>
> - Owner: `@bitquan`
> - Last verified: `2026-02-10`
> - Review cadence: `monthly`

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
- MapShell loads as the primary surface when `featureFlags.senderrIos.mapShell=true`
- Top + bottom map overlays render without blocking map interactions
- Settings bottom-sheet opens/closes without resetting active job/session map state

## 5) Physical device smoke (when testing on phone)

If device cannot reach Metro:

```bash
cd apps/courieriosnativeclean
npx react-native start --host 0.0.0.0 --port 8081 --reset-cache
```

Expected:

- Device reaches Metro
- App launches and loads JS bundle

## 6) MapShell state reliability smoke (issues #250/#251/#252)

Validate these states before merge:

- `offer`
  - Pending job renders pickup/dropoff context and `Accept Job` action.
- `accepted` / `enroute_pickup` / `arrived_pickup`
  - Route summary updates and state transitions reach `Confirm Pickup`.
- `picked_up` / `enroute_dropoff` / `arrived_dropoff`
  - Route and ETA stay visible; completion action is available at dropoff arrival.
- `proof_required`
  - Proof-required state surfaces warning tone before completion.
- `offline_reconnect`
  - Reconnect state appears when sync is `reconnecting`, `stale`, or `error`.
  - `Retry Sync` action remains available.

Location and settings checks:

- In-shell location chip supports repeated `Enable location` -> `Start tracking` -> `Stop tracking`.
- Settings/profile overlay can be opened from map shell and closed without leaving map context.
- Profile save and feature flag debug behavior still work from overlay.

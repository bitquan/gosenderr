# Senderr iOS Crash + Analytics

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `weekly`

Issue: `#146` iOS Senderr: Crash/analytics integration

## What is integrated

- Firebase Analytics (native): `@react-native-firebase/analytics`
- Firebase Crashlytics (native): `@react-native-firebase/crashlytics`
- Service adapter entrypoint:
  - `apps/courieriosnativeclean/src/services/adapters/analyticsFirebaseAdapter.ts`

## Tracked events

- `auth_signed_in`
- `auth_signed_out`
- `jobs_loaded`
- `job_status_updated`
- `tracking_started`
- `tracking_stopped`
- `tracking_error`

## Captured errors

- Auth restore/sign-in/sign-out failures
- Jobs initial/manual refresh failures
- Jobs sync error states
- Job status transition failures/conflicts
- Tracking start/request failures
- Runtime JS fatal errors via global handler bridge

## Local verification checklist

1. Install dependencies and pods:
   - `pnpm install --frozen-lockfile`
   - `cd apps/courieriosnativeclean/ios && pod install`
2. Open workspace:
   - `open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
3. Run the app and sign in.
4. Trigger telemetry from `Settings`:
   - Tap `Send telemetry test event` (non-prod only).
5. Verify in Firebase:
   - Analytics: DebugView/Event stream receives event names above.
   - Crashlytics: non-fatal error appears with context `settings_manual_test`.

## Notes

- Telemetry adapter degrades safely to no-op when native modules are unavailable.
- Production/offline behavior remains functional even if analytics init fails.

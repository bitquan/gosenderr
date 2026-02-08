# Senderr iOS TestFlight Build and QA Checklist

Issue: `#141`  
Scope: Produce a repeatable TestFlight archive flow and internal QA checklist.

## 1) Build TestFlight archive

From repo root:

```bash
pnpm install --frozen-lockfile
pnpm run ios:clean:install
pnpm run ios:testflight:archive
```

Outputs:

- Archive: `.artifacts/ios-testflight/<timestamp>/Senderrappios.xcarchive`
- IPA: `.artifacts/ios-testflight/<timestamp>/export/*.ipa`

Optional CLI upload:

```bash
export APPLE_ID="your@appleid.com"
export APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
# optional:
export APPLE_TEAM_ID="TEAMID"
pnpm run ios:testflight:upload
```

If upload credentials are not configured, upload manually from Xcode Organizer.

## 2) Internal QA checklist (must pass before release)

- Install build from TestFlight on at least one iOS 16+ device.
- Launch app with no red screen/crash.
- Sign in with courier account.
- Verify Dashboard / Jobs / Settings tabs render.
- Verify jobs list loads from live data.
- Open one job and complete one valid status transition.
- Confirm status update persists after app restart.
- Start location tracking, background app, return, confirm tracking state is consistent.
- Confirm map card renders and courier marker follows current location updates.
- Confirm offline behavior:
  - disable network
  - perform one allowed action
  - re-enable network
  - confirm sync recovers
- Confirm push permission prompt and device token registration log appears once after sign-in.

## 3) QA sign-off log template

Copy this per test run:

```md
### TestFlight Run - <date>
- Build number:
- Device / iOS:
- Auth flow: Pass|Fail
- Jobs flow: Pass|Fail
- Status transitions: Pass|Fail
- Location tracking: Pass|Fail
- Offline recovery: Pass|Fail
- Push setup: Pass|Fail
- Blocking issues:
- Notes:
```

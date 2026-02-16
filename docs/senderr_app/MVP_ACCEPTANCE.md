# Senderr iOS MVP Acceptance Criteria

## Product goals
- Courier can authenticate and stay signed in.
- Courier can read assigned jobs and open job detail.
- Courier can advance job status through delivery lifecycle.
- Courier can grant location permission and start location tracking.

## Functional acceptance
1. Auth
- User can sign in with email/password.
- User can sign out from Settings.
- Auth errors render a clear UI message.

2. Navigation and screens
- App shows Login when signed out.
- App shows Dashboard, Jobs, Settings when signed in.
- Job Detail is reachable from Jobs list.

3. Jobs
- Jobs list loads for the signed-in courier.
- Job detail shows pickup/dropoff/status/notes.
- Status action updates state in UI and persists through service layer.

4. Location
- App requests location permission.
- App can start and stop tracking.
- Latest location snapshot is visible in UI.

## Non-functional acceptance
- `pnpm run ios:clean:install` succeeds.
- `pnpm run ios:build:verify` passes Debug simulator, Debug device, Release device compile matrix.
- Canonical iOS workspace/scheme only (`Senderrappios.xcworkspace`, `Senderr`).

## Release gate
- At least one manual run on simulator.
- At least one manual run on physical iOS device.
- Firebase plist present only in local/dev secure flow, never committed to git.

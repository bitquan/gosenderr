# Senderr App Core Systems Plan

This is the execution order for core systems so we build stable foundations first, then test, then upgrade safely.

## 1) Core Runtime + Environment
Goal: app starts cleanly in smoke/dev with deterministic config.

- [ ] Single source of env config (`runtimeConfig`) for app + functions.
- [ ] Firebase emulator vs production switching is explicit and verified.
- [ ] Worktree-safe Metro + DerivedData separation documented and used.
- [ ] Startup health check logs project, emulator endpoints, feature flags.

Exit criteria:
- App boots from clean clone with one command.
- No unresolved module aliases.

## 2) Auth + Session Core
Goal: session lifecycle is predictable.

- [ ] Login/logout flow verified in smoke + regular app.
- [ ] Session expiration path redirects correctly.
- [ ] Session-dependent services reset cleanly on sign out.

Exit criteria:
- No stale user data after account switch.

## 3) Profile + Courier Settings Core
Goal: settings are not just UI; they drive behavior.

- [x] `autoStartTracking` persisted in profile.
- [x] App bootstrap uses profile setting to auto-start tracking.
- [ ] `acceptsNewJobs` gate respected by job intake UI/state.
- [ ] Rate card values validated and consumed by relevant flows.

Exit criteria:
- Changing setting -> app behavior changes without manual patching.

## 4) Location Tracking Core
Goal: reliable tracking without permission spam.

- [x] Persist location state (`hasPermission`, `lastLocation`) locally.
- [x] Hydrate location state on app start.
- [x] Add permission request cooldown to avoid prompt loops.
- [ ] Add explicit foreground/background state handling.
- [ ] Add tracking watchdog (stale sample, denied permission, retry guidance).

Exit criteria:
- Restart does not lose last known location context.
- Permission prompt is not repeatedly triggered in short loops.

## 5) Jobs Lifecycle Core
Goal: command flow is deterministic and recoverable.

- [x] Lifecycle callable commands wired (`accept -> start pickup -> arrived -> picked up -> start dropoff -> complete`).
- [x] Conflict fallback for `assigned -> arrived_pickup` path.
- [x] Local optimistic status update + background sync messaging.
- [x] Stale pending lock timeout to prevent infinite `Working...` lock.
- [ ] Add explicit retry action for failed transitions in UI.

Exit criteria:
- Lifecycle sequence succeeds in emulator and device smoke tests.
- No permanent CTA lock after refresh/reload.

## 6) MapShell Interaction Core
Goal: map controls and job controls are independent.

- [x] Top card no longer controls bottom panel size/lock.
- [x] Dev controls moved into separate collapsible section.
- [x] Manual mode no longer auto-resets on focus/view changes.
- [x] Map gestures always enabled; touch switches to manual mode.
- [ ] Add gesture conflict E2E test on real device.

Exit criteria:
- In Manual mode, user can pan/zoom consistently.
- Camera mode switches are explicit and stable.

## 7) Sync + Offline Resilience Core
Goal: app remains usable when network is degraded.

- [ ] Clear sync state model (`live`, `stale`, `reconnecting`, `error`) reused across screens.
- [ ] Queue/retry strategy for status writes.
- [ ] Visible user feedback for degraded sync with recovery actions.

Exit criteria:
- No silent failure path.
- User always has recovery action.

## 8) Notifications Core
Goal: push setup doesn’t interfere with other permissions.

- [ ] Notification bootstrap runs once per session.
- [ ] APNS/FCM token sync retries are bounded and observable.
- [ ] Permission prompt behavior separated from location behavior.

Exit criteria:
- Notification setup does not cause repeated app-level prompt confusion.

## 9) Feature Flags + Safety Core
Goal: safe rollouts and explicit defaults.

- [ ] Flag defaults documented.
- [ ] App behavior for missing/failed flag fetch is deterministic.
- [ ] Critical flags have fallback behavior tests.

Exit criteria:
- Turning any key flag on/off produces predictable behavior.

## 10) Test Core (Gate Before Upgrades)
Goal: no upgrades before baseline is green.

Required smoke flow:
1. Accept Job
2. Start Pickup
3. Arrived Pickup
4. Confirm Pickup
5. Start Dropoff
6. Complete Delivery

Required validation sets:
- [ ] Unit: map shell view model + overlay controller + transition rules
- [ ] Integration: jobs lifecycle with emulator
- [ ] Device smoke: map manual pan/zoom + lifecycle buttons + proof capture
- [ ] Failure-mode: offline sync + permission denied + resumed session

Exit criteria:
- All four validation sets pass in smoke worktree.

## 11) Error System Core
Goal: every failure is classified, visible, recoverable, and traceable.

- [x] Standard error taxonomy (`permission`, `validation`, `conflict`, `network`, `timeout`, `unknown`).
- [x] Shared error mapper for Firebase/Functions/Network into user-safe messages.
- [ ] UI standards:
  - [x] Inline error state with retry where possible.
  - [ ] Non-blocking warnings vs blocking failures are separated.
  - [x] No silent lock states (`Working...` must have timeout/recovery).
- [ ] Telemetry standards:
  - [x] Every surfaced error includes a stable error code.
  - [ ] Analytics + crash reporting include full context (`screen`, `action`, `jobId`, `syncState`).
- [ ] Recovery standards:
  - [x] Retry path for recoverable actions.
  - [x] Escalation path for non-recoverable actions (clear next step for user).

Exit criteria:
- For each major system (auth, location, jobs, map, notifications), errors are mapped and tested in at least one failure-mode test.

## Integration Map (How Systems Connect)

- `App.tsx` orchestrates session, subscriptions, notifications bootstrap, and map shell entry.
- `serviceRegistry.tsx` wires adapters: auth/jobs/location/profile/notifications/analytics/flags.
- `jobsService.ts` + firebase functions handle lifecycle commands and status sync.
- `locationService.ts` provides shared location state to Dashboard, Settings, MapShell.
- `MapShellScreen.tsx` composes route/camera/panel/status actions.
- `mapShellOverlayController.ts` decides CTA and state messaging from job + sync + location.
- `profileService.ts` stores courier settings used by app behavior (including auto tracking).

## Next Build Order (Immediate)
1. Finish Location Core: foreground/background handling + watchdog.
2. Finish Sync Core: retry UX and explicit failure recovery button.
3. Implement Error System Core taxonomy + UI recovery contract.
4. Add Device E2E for map gesture + lifecycle buttons + failure modes.
5. Only then do dependency upgrades/refactors.

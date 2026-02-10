# MapShell Acceptance Matrix

> Doc metadata
>
> - Owner: `@bitquan`
> - Last verified: `2026-02-10`
> - Review cadence: `monthly`

Last updated: 2026-02-10  
Scope: issues #250, #251, #252, #270

## Purpose

Define release-quality acceptance for MapShell as the canonical courier UX, including state regressions, rollout gates, and rollback criteria.

## State Regression Matrix

| State               | Preconditions                                     | Expected Overlay Behavior                | Primary Action                    |
| ------------------- | ------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| `idle`              | no active job                                     | neutral panel, no active route           | refresh jobs                      |
| `offer`             | latest/active job `pending`                       | offer tone + pickup route context        | accept job                        |
| `accepted`          | active job `accepted`, no tracking                | permission/tracking guidance             | enable location or start tracking |
| `enroute_pickup`    | active job `accepted`, tracking true, not arrived | route + ETA + camera controls visible    | open pickup details               |
| `arrived_pickup`    | accepted + courier near pickup                    | success tone                             | confirm pickup                    |
| `picked_up`         | job `picked_up`, tracking false                   | dropoff prep guidance                    | enable location or start tracking |
| `enroute_dropoff`   | picked up + tracking true, not arrived            | route + ETA + camera controls visible    | open dropoff details              |
| `arrived_dropoff`   | picked up + courier near dropoff                  | success tone                             | complete delivery                 |
| `proof_required`    | picked up + near dropoff + proof notes            | warning tone + proof reminder            | complete delivery                 |
| `completed`         | job `delivered`                                   | completion tone and reset guidance       | refresh jobs                      |
| `offline_reconnect` | sync `reconnecting`/`stale`/`error`               | reconnect warning and stale sync message | retry sync                        |

## In-Shell Settings/Profile/Location Checks

- Settings open from map shell as an overlay and close without unmounting map shell.
- Courier can repeat location flows in-shell:
  - request permission
  - start tracking
  - stop tracking
- Profile persistence remains functional from settings overlay:
  - load profile
  - validate fields
  - save profile

## CI Regression Coverage

- Unit tests:
  - `apps/courieriosnativeclean/src/screens/__tests__/mapShellOverlayController.test.ts`
  - `apps/courieriosnativeclean/src/screens/__tests__/mapShellRouteView.test.ts`
- CI lane: `pnpm --filter courieriosnativeclean test:unit`
- Smoke script: `pnpm run ios:smoke`

## Rollout Gates (`featureFlags.senderrIos.mapShell`)

1. **Gate 0 (internal only):** enable for developer/tester allow-list only.
2. **Gate 1 (10%):** crash-free rate >= 99.5% over 24h; no P0 MapShell crashes.
3. **Gate 2 (50%):** offline/reconnect recovery succeeds in smoke checks; no sync regressions vs. control cohort.
4. **Gate 3 (100%):** map-shell default enabled; keep tab-shell fallback for one release window.

## Fallback Criteria (Immediate Rollback)

Set `featureFlags.senderrIos.mapShell=false` if any are true:

- crash-free rate drops below 99.5% for courier iOS sessions,
- job lifecycle completion (`accepted -> delivered`) materially regresses,
- map shell cannot recover from sync reconnect/error conditions,
- location permission/tracking controls get stuck in a one-time dead-end flow.

Rollback action:

1. Toggle `senderrIos.mapShell` off in Firestore `featureFlags/config`.
2. Confirm courier app relaunches into legacy tab shell.
3. Keep `mapRouting`/`jobStatusActions` flags unchanged unless they are the incident source.
4. Capture incident summary + timeline in `docs/dev/WORKLOG.md`.

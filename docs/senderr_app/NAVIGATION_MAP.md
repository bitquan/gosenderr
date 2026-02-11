# Senderr iOS Navigation Map

## Entry routing
- App launch -> restore auth session.
- If no session -> `Login`.
- If session exists and `featureFlags.senderrIos.mapShell` is `true` -> `MapShell` (canonical).
- If `mapShell` is `false` -> legacy tab shell (`Dashboard`, `Jobs`, `Settings`) as fallback only.

## Canonical surface: `MapShell`
`MapShell` is the courier primary UX. Job progress, routing context, and operational controls stay on-map.

### Top overlays
- MapShell state header (`offer`, `accepted`, `enroute_pickup`, `arrived_pickup`, `picked_up`, `enroute_dropoff`, `arrived_dropoff`, `proof_required`, `completed`, `offline_reconnect`).
- Sync status timestamp + route summary (distance, ETA).
- Camera controls (`Follow`, `Fit`, `Manual`).
- Settings entry point (`Open Settings`).

### Bottom overlays
- Context-aware action card backed by `mapShellOverlayController`.
- Primary action mapped to state machine (`retry sync`, `accept`, `confirm pickup`, `complete delivery`, etc.).
- In-shell location quick actions (`Enable location`, `Start tracking`, `Stop tracking`).

### Settings/profile/location overlay
- Opened from MapShell as a bottom sheet overlay.
- Uses existing profile persistence + feature flag debug behavior.
- Closing settings returns to live map context without resetting active job/session state.

## Secondary route
- `Job Detail` remains available when opened from map-shell action cards.
- Returning from detail resumes map shell with current session/jobs state.

## Implementation notes
- Routing is app-state based (no external navigation package).
- Map shell + overlays are the target model for release and smoke verification.
- Legacy tab shell is rollback-only and controlled by `mapShell` feature flag.

# MapShell (Map-first courier experience)

Overview

- MapShell is a new map-first courier surface that centralizes the map and provides overlay slots for active jobs, upcoming jobs, and settings.
- Feature-flagged under `delivery.mapShell` and gated in the courier layout.

Implementation plan

1. Add `MapShellScreen` scaffold (this PR).
2. Port the overlay state machine from native (`apps/courieriosnativeclean/src/screens/mapShellOverlayController.ts`) to web.
3. Implement overlays (Active Job, Settings, etc.) behind the flag.

Testing

- Unit tests mock Mapbox and assert overlay slots render.
- Integration and manual QA will use a Mapbox dev token behind a local env var.

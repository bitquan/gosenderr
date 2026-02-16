# Map System (MapShell)

## Purpose
- Deliver the live courier map view, letting dispatchers and couriers inspect the active job, follow the route, and switch into manual camera control when they need to pan/zoom freely.
- Surface camera-mode chips (Follow, Fit, Manual) that give riders quick control over how the runtime camera behaves without leaving the map sheet.

## Architecture & Flow
1. `MapShellScreen` owns camera mode state, the bottom sheet, and map overlay data derived from `jobs`, `location`, and the route plan (see [src/screens/MapShellScreen.tsx](src/screens/MapShellScreen.tsx#L220-L1400)).
2. `MapShellSurface` renders `MapView` and exposes `onCameraModeChange`; a pan drag immediately flips the app into manual and lets the same gesture move the map ([src/components/MapShellSurface.tsx#L1-L200]).
3. Feature flags from `featureFlagsService` determine whether route fitting animates or the map is disabled entirely; the surface respects `cameraMode` by toggling zoom/pitch/rotation.
4. The panel overlays (panel card, top actions, camera chips) sit in `MapShellScreen` and use `pointerEvents` to send touches through when manual is active so the map remains interactive.

## Key entry points
- `MapShellScreen` ([src/screens/MapShellScreen.tsx#L220-L1410]): manages `cameraMode`, panel gestures, job focus, and high-level map data.
- `MapShellSurface` ([src/components/MapShellSurface.tsx#L1-L200]): bridges to `react-native-maps` and handles `onPanDrag` → `manual` transitions.
- Camera chips within the top card trigger `setCameraMode(mode)` and expose telemetry hooks when needed.

## Dependencies
- `react-native-maps` for `MapView`, `Marker`, `Polyline` interaction.
- Feature flag hook from `featureFlagsService` to gate map routing.
- Route/overlay calculators (`mapShellOverlayController`, `mapShellRouteView`) for payload shown on the panel.

## Testing
- Unit tests in `src/screens/__tests__/MapShellScreen.test.tsx` and `src/components/__tests__/MapShellSurface.test.tsx` verify panel locking, manual persistence, and onPanDrag behavior ([MapShellScreen tests](src/screens/__tests__/MapShellScreen.test.tsx#L1-L460)).

## Current implementation notes
- Manual mode is preserved until the user switches away or a new focus job/view mode change occurs; panel `pointerEvents` is `box-none` so map touches pass through.
- `MapShellSurface` lets the map receive gestures even when not manual so an initial thumb drag both switches the camera and moves the map, avoiding any mysterious dead zone.
- `MapShellScreen` keeps tens of state slices (panel size, focused job, route summary, feedback) in sync with map updates. Keep future tweaks localized by adjusting `MapShellSurface` for map-specific logic and `MapShellScreen` for UI/mode orchestration.
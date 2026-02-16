# UI / UX System

## Purpose
- Keep the courier experience clear: the MapShell bottom panel shows job details, camera controls, and status actions without covering too much of the map.
- Provide consistent action controls (`PrimaryButton`, chips, toggles) so couriers can accept jobs, toggle camera modes, and open settings quickly.

## Architecture & Flow
1. `MapShellScreen` composes the overlay card, job metadata, camera chips, and mock controls; panel layout respects `panelSize`/`panelLocked` state to let users drag/expand/collapse ([src/screens/MapShellScreen.tsx#L1030-L1500]).
2. Components such as `PrimaryButton` and `StatusBadge` encapsulate typography/tone rules for CTA buttons and status chips ([src/components/PrimaryButton.tsx#L1-L200], [src/components/StatusBadge.tsx#L1-L160]).
3. `JobsMapCard`, `JobsScreen`, and `DashboardScreen` reuse these components to render list-based job summaries with consistent spacing and typography.

## Key entry points
- `MapShellScreen` – bottom card, camera chips, CTA, dev mock controls, and pointer-event toggling.
- `PrimaryButton` – standardized button used across job accept/deliver flows.
- `StatusBadge` – color-coded status pill used in job lists and the map panel header.

## Dependencies
- `react-native-gesture-handler`/`PanResponder` for swiping between jobs and moving the panel.
- `featureFlagsService` to gate UI controls (e.g., `jobStatusActions`).
- Typography/colors defined inline in `MapShellScreen` styles (see `styles.panelCard`, `styles.cameraRow`, etc.).

## Testing
- `src/screens/__tests__/MapShellScreen.test.tsx` validates panel layout, camera mode chips, and pointer-events.
- `src/components/__tests__/MapShellSurface.test.tsx` ensures map gestures remain responsive.

## Current implementation notes
- Panel `pointerEvents` toggles to `box-none` when manual so touches pass through, but gestures on the card itself still work via `panelDragResponder` and `cardSwipeResponder`.
- Camera chips toggle `cameraMode` and the panel displays the current label (`Camera: Follow/Fit/Manual`).
- Dev helpers (Mock Move Forward, Auto-advance, speed chips) are rendered only in `__DEV__` builds and live inside the top card to avoid impacting production layout.
# MapShell (Web)

Overview

- `MapShellLayout` provides deterministic overlay slots for MapShell components: `topLeft`, `topRight`, `center`, `bottom`, and `bottomRight`.
- Use the `Slot` component (from `@/components/mapShell/slots`) to place overlay UI into those named locations.

Slots & Behavior

- Slots are rendered inside a single overlay layer with `pointer-events` set to allow overlays to be interactive while keeping the map surface as the background.
- Use `topRight` for primary overlays like `ActiveJobOverlay`, `topLeft` for minor status badges, `center` for modal-type content, `bottom` for action bars, and `bottomRight` for small contextual controls.

Start Tracking & Permissions

- `ActiveJobOverlay` uses the overlay model returned by `buildMapShellOverlayModel()`.
- `MapShellScreen` handles `start_tracking` and `request_location_permission` actions by attempting to request a `navigator.geolocation` position and showing user-friendly alerts on success or failure.
- Tests mock `navigator.geolocation.getCurrentPosition` when exercising permission flows.

Testing & Stories

- Unit tests assert slot placement and overlay behavior (`apps/senderr-app/src/components/mapShell/__tests__`).
- Storybook stories were added (`ActiveJobOverlay.stories.tsx`, `MapShellLayout.stories.tsx`) to visually inspect states.

Future

- Add visual regression or Storybook snapshot tests to catch layout regressions in CI.

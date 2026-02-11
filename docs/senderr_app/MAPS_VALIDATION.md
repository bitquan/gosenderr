# Senderr iOS Maps Validation

Scope: issue `#143` (`iOS Senderr: Mapbox/Maps integration validation`)

## Runtime config

Build-time keys:

- `SENDERR_MAP_PROVIDER` (`native` or `mapbox`)
- `SENDERR_MAPBOX_ACCESS_TOKEN` (required only when `SENDERR_MAP_PROVIDER=mapbox`)

Native bridge output:

- `runtimeConfig.maps.provider`
- `runtimeConfig.maps.mapboxAccessToken`

Validation behavior:

- `native`: map renders with iOS native provider (`react-native-maps`) and no token requirement.
- `mapbox`: app validates token presence and flags warning when missing.

## What ships in app shell

- Dashboard includes a **Map Validation** card.
- Card renders a real map with basic markers for:
  - courier current location
  - active job pickup
  - active job dropoff
- Map auto-fits coordinates when at least two markers are available.

## Device test checklist

1. Open app on physical iPhone (iOS 16+).
2. Start location tracking from Dashboard.
3. Confirm courier marker appears.
4. Confirm active job pickup/dropoff markers appear when coordinates exist.
5. Pinch/zoom/rotate map for 30s and verify UI stays responsive.
6. Move app to background and foreground, confirm map re-renders cleanly.
7. Toggle network (offline/online), confirm map card remains stable and no crash.

## Acceptance criteria

- Map renders consistently on iOS device.
- Marker updates are visible with active tracking.
- Config warning appears only for invalid map provider/token combinations.

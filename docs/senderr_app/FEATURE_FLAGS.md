# Senderr iOS Feature Flags

Issue: #208

## Purpose
Feature flags provide a safe rollout and rollback path for high-risk iOS courier flows.

## Current flags
- `trackingUpload`
  - Owner: `senderr-ios`
  - Default: `true`
  - Gated flow: location tracking start/upload lifecycle.
  - Removal criteria: remove after 2 stable releases without tracking incidents.
- `notifications`
  - Owner: `senderr-ios`
  - Default: `true`
  - Gated flow: notification-related features.
  - Removal criteria: remove after production notification pipeline is stable.
- `mapRouting`
  - Owner: `dispatch-platform`
  - Default: `true`
  - Gated flow: map routing and map card behavior.
  - Removal criteria: remove after map stack is permanent and fully validated.
- `jobStatusActions`
  - Owner: `senderr-ios`
  - Default: `true`
  - Gated flow: job status command actions.
  - Removal criteria: remove after status transitions are fully stable in production.
- `mapShell`
  - Owner: `senderr-ios`
  - Default: `true`
  - Gated flow: map-shell-first courier UX and in-shell overlays.
  - Removal criteria: remove after map shell fully replaces tab shell in production.

## Remote source
Firestore document:
- Collection: `featureFlags`
- Doc: `config`

Supported config paths:
- `senderrIos.trackingUpload`
- `senderrIos.notifications`
- `senderrIos.mapRouting`
- `senderrIos.jobStatusActions`
- `senderrIos.mapShell`

Compatibility fallbacks:
- `courier.workModes` -> `trackingUpload`
- `advanced.pushNotifications` -> `notifications`
- `delivery.routes` -> `mapRouting`

## Rollout lifecycle
1. Introduce flag with owner/default/removal criteria.
2. Ship with default ON in non-prod, verify behavior.
3. Roll out gradually in prod via remote config.
4. If incident: toggle flag OFF remotely (no app redeploy needed).
5. After stability period: remove dead flag and gating code.

## MapShell rollout + fallback

See `docs/senderr_app/MAP_SHELL_ACCEPTANCE_MATRIX.md` for required rollout gates and rollback criteria.

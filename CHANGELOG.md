# Changelog

## Unreleased

### Known Issues
- Push notifications for courier iOS still failing via FCM; APNs credentialing needs fix.
- Courier route preview works but can be slow to load after repeated toggles; needs performance tuning.

### Added
- test: Add Firestore snapshot test helper and update tests to reduce flakiness in UI tests. (PR #61)
- apps/courier-ios-native: Scaffold native courier v2 app shell (Plan D).
- apps/courier-ios-native: Courier v2 live status, location tracking, online toggle, and jobs history updates.
- apps/courier-ios-native: Proof-of-delivery capture modal with photo upload and notes.
- apps/courier-ios-native: Job detail sheet with contact and navigation actions.
- apps/courier-ios-native: In-app job alert hook for new jobs.
- apps/courier-ios-native: Courier event analytics logging and pulsating location marker.
- apps/courier-ios-native: Push notification registration hook and local alert fallback.
- apps/courier-ios-native: Add profile panel, rate cards editor, and mobile action card UI.
- apps/admin-app: Add admin test push sender (callable + UI).

### Changed
- apps/courier-ios-native: Save proof photo geo location and stop sharing courier location after trips.
- apps/marketplace-app: Use static receipt map for completed jobs with proof photo markers.
- apps/admin-desktop: Show proof photo markers on trip map and hide live courier tracking after completion.
- apps/courier-ios-native: Show in-app alerts when active and update the iOS app icon.
- apps/courier-ios-native: Add in-app notification banner card and inbox panel.

### Docs
- docs/CHECKLIST_COURIER_V2.md: Add Courier V2 delivery checklist.

### Docs
- docs/ROLE_SIMULATION_PLAN.md: Add testing guidance and reference to the `firestoreMock` helper.
- docs/project-plan/: Add comprehensive GoSenderr v2 reorganization and implementation plans (PR #79)
- docs/project-plan/12-COURIER-V2-NATIVE-BLUEPRINT.md: Add full native courier v2 blueprint (Plan D).

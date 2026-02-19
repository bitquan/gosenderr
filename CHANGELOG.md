# Changelog

## Unreleased

### iOS
- courieriosnativeclean: Stabilize iOS sign-in startup flow by standardizing app root registration to a single module name, adding auth UI readiness gating, and adding a blocking startup splash with a minimum display duration to avoid half-ready login states.
- ios/Senderrappios.xcodeproj: Finalize release build phase/output-path hardening so production builds complete reliably without duplicate output producer failures.

### Added
- test: Add Firestore snapshot test helper and update tests to reduce flakiness in UI tests. (PR #61)

### Docs
- docs/ROLE_SIMULATION_PLAN.md: Add testing guidance and reference to the `firestoreMock` helper.
- docs/project-plan/: Add comprehensive GoSenderr v2 reorganization and implementation plans (PR #79)

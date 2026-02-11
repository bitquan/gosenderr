# Senderr iOS Signing and Provisioning

## Canonical identifiers
- Xcode target: `Senderrappios`
- Scheme: `Senderr`
- Bundle identifier: `com.gosenderr.senderr`

## Required Xcode configuration
1. Open `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`.
2. Select target `Senderrappios`.
3. In **Signing & Capabilities**:
- Team: your Apple Developer team
- Signing Certificate: Apple Development (Debug), Apple Distribution (Release)
- Provisioning Profile: Automatic or explicit profile matching `com.gosenderr.senderr`

## Build configs
- Debug: device + simulator for local dev.
- Release: device compile for CI verification.

## Firebase config file
- Expected local path:
  - `apps/courieriosnativeclean/ios/Senderrappios/GoogleService-Info.plist`
- Must not be committed.
- If missing, app runs with Firebase disabled and logs a warning.

## Validation checklist
- Xcode device build succeeds under selected team.
- App installs on physical device.
- Login + jobs + status + location flows run without signing errors.

# Senderr iOS Push Notifications

## Scope

Issue: `#137`  
App: `apps/courieriosnativeclean`

This setup enables:

- iOS notification permission prompt
- APNs/FCM device token registration through React Native Firebase Messaging
- Foreground notification event handling in app runtime

## Wiring

- Port contract:
  - `apps/courieriosnativeclean/src/services/ports/notificationsPort.ts`
- Firebase adapter:
  - `apps/courieriosnativeclean/src/services/adapters/notificationsFirebaseAdapter.ts`
- Service registry binding:
  - `apps/courieriosnativeclean/src/services/serviceRegistry.tsx`
- App bootstrap usage:
  - `apps/courieriosnativeclean/App.tsx`

## Native prerequisites

- Push entitlement is enabled:
  - `apps/courieriosnativeclean/ios/Senderrappios/Senderrappios.entitlements`
- Background mode includes remote notification:
  - `apps/courieriosnativeclean/ios/Senderrappios/Info.plist`
- Dependency installed:
  - `@react-native-firebase/messaging`

## Local validation (physical device)

1. Install JS + pods:
   - `pnpm install`
   - `cd apps/courieriosnativeclean/ios && pod install`
2. Open workspace:
   - `open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
3. Run app on device and sign in.
4. Accept notification permission prompt.
5. Confirm logs show token registration:
   - `[notifications] device token registered ...`

## Notes

- Notification bootstrap is gated by feature flag `notifications`.
- Foreground notification events are tracked through analytics port.
- If token is not logged, verify:
  - Real device (not simulator)
  - APNs capability in signing profile
  - Firebase project and bundle identifier match app target

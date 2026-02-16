# Notifications System

## Purpose
- Provide reactive access to permission prompts, APNs token registration, and Firebase Cloud Messaging (FCM) tokens for the courier app.
- Allow React Native to cache and resolve device/messaging tokens via a small native bridge.

## Architecture & Flow
1. The iOS native bridge (`ios/Senderrappios/SenderrNotificationsModule.swift#L1-L200`) exposes three Promise-based methods to React Native: `requestPermission`, `registerDeviceToken`, and `registerMessagingToken`.
2. A barebones Objective-C header (`ios/Senderrappios/SenderrNotificationsModule.m#L1-L40`) exports the methods so they’re bridged to React Native.
3. The Swift implementation requests notification permission, caches the APNs token in `UserDefaults`, initializes Firebase if needed, and resolves/generates the FCM token once the APNs token is available.

## Key entry points
- `SenderrNotificationsModule` class – handles permission prompts and token caching using `UserDefaults` keys such as `SenderrPushDeviceToken` and `SenderrFCMToken`.
- `Messaging.messaging().token` – invoked after the app has an APNs token (or when Firebase is configured) to produce the latest FCM token.
- Token persistence/validation occurs inside `hasUsableGoogleServicePlist`, guarding against placeholder plist entries.

## Dependencies
- iOS `UserNotifications`, `UIKit`, and Firebase Messaging.
- `FirebaseCore` for `FirebaseApp.configure()` when a token request needs the SDK.
- The React Native bridge (`React`) to expose the module to JavaScript code.

## Testing
- Manual: run the app on a device/simulator, allow push permissions, and confirm the Promise resolves with a non-empty token.
- Ensure `GoogleService-Info.plist` is valid (project-specific) so `hasUsableGoogleServicePlist` allows configuration.

## Current implementation notes
- `registerMessagingToken` returns `nil` if APNs token is missing, so the JS layer must retry after `registerDeviceToken` succeeds.
- Firebase is lazily configured inside the module, which lets the JS layer call it before the app fully initializes.
- Use `UserDefaults` keys to keep tokens available between launches; clearing them resets the cached state if a re-registration is needed.
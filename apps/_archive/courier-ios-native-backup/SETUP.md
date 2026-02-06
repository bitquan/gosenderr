# courier-ios-native setup (Xcode)

This guide covers local setup for the React Native iOS app.

## Prerequisites
- macOS with Xcode installed
- Node.js 18+
- pnpm
- Ruby + Bundler
- CocoaPods

## Install dependencies
1. From repo root:
   - pnpm install
2. From ios folder:
   - bundle install
   - bundle exec pod install

## Configure Mapbox
- Ensure a valid Mapbox token is available to the app configuration.
- Update config in src/config/mapbox.ts or load via public config as needed.

## Build with Xcode
1. Open ios/Senderrappios.xcworkspace
2. Select the Senderrappios scheme
3. Choose a Simulator and build

## Troubleshooting
- If pods are out of date, re-run bundle exec pod install
- If builds fail, clear DerivedData (Xcode > Settings > Locations)
- Ensure Firebase configuration is valid for the environment

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# GoSenderr Courier iOS Native App

This is the native iOS app for GoSenderr couriers, built with React Native 0.76.5.

## Prerequisites

- **macOS** (required for iOS development)
- **Xcode 15.4+** (download from Mac App Store)
- **Node.js 18+** (check with `node --version`)
- **CocoaPods** (for iOS dependency management)
- **Ruby 2.7+** (comes with macOS)

## Initial Setup

### 1. Install Node Dependencies

From the repository root:

```sh
pnpm install
```

### 2. Install CocoaPods (if not already installed)

```sh
sudo gem install cocoapods
```

### 3. Install iOS Dependencies

Navigate to the iOS directory and install CocoaPods dependencies:

```sh
cd apps/courier-ios-native/ios
pod install --repo-update
```

This will:
- Download and install all iOS native dependencies
- Create/update `Podfile.lock`
- Generate `Senderrappios.xcworkspace`

**Important:** Always open `Senderrappios.xcworkspace` in Xcode, NOT `Senderrappios.xcodeproj`

## Building and Running

### Development (Debug) Build

#### Option 1: Using React Native CLI

From `apps/courier-ios-native` directory:

```sh
npm run ios
# or
yarn ios
```

#### Option 2: Using Xcode

1. Open `apps/courier-ios-native/ios/Senderrappios.xcworkspace` in Xcode
2. Select a simulator or connected device
3. Press `Cmd+R` to build and run
4. The app will launch in the selected simulator/device

### Release Build

For TestFlight or App Store submission:

1. Open `apps/courier-ios-native/ios/Senderrappios.xcworkspace` in Xcode
2. Select "Any iOS Device (arm64)" from the device menu
3. Go to **Product > Archive**
4. Once archived, the Organizer window will open
5. Click **Distribute App** and follow the TestFlight/App Store workflow

## Troubleshooting

### Build Failures

If you encounter build errors, try cleaning and reinstalling:

```sh
# 1. Clean iOS build artifacts
cd apps/courier-ios-native/ios
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 2. Reinstall dependencies
pod install --repo-update

# 3. Clean and build in Xcode
# Open workspace, then: Product > Clean Build Folder (Shift+Cmd+K)
# Then: Product > Build (Cmd+B)
```

### Firebase/RNFBFunctions Build Errors

If you see errors about `FIRFunctions` or `FIRHTTPSCallable` being unknown:

1. Ensure you've run `pod install` after updating dependencies
2. Verify the Firebase SDK version in `Podfile` matches the `@react-native-firebase` packages
3. Clean DerivedData and rebuild:
   ```sh
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   ```

### Missing GoogleService-Info.plist

The app requires Firebase configuration. Ensure `GoogleService-Info.plist` is present in the iOS project (do not commit this file to git).

### Metro Bundler Issues

If Metro bundler has issues:

```sh
# Reset Metro cache
npm start -- --reset-cache
```

## Configuration

### Firebase SDK Version

The Podfile is configured to use Firebase SDK v11.11.0 to match the `@react-native-firebase` packages (v21.3.0).

This is set via the `$FirebaseSDKVersion` variable at the top of the Podfile.

### iOS Deployment Target

- Minimum: iOS 15.1
- Target: iOS 15.1+

### Hermes Engine

Hermes is **enabled** by default for better performance:
- Faster app startup
- Reduced memory usage
- Smaller binary size

Configuration is in `Podfile`: `:hermes_enabled => true`

### Environment Variables

The `.xcode.env` file configures the Node.js binary path for Xcode build phases. You can create `.xcode.env.local` for local customizations (not versioned).

## Testing on Simulator

1. Start the Metro bundler:
   ```sh
   npm start
   ```

2. In a new terminal, run on simulator:
   ```sh
   npm run ios
   # or specify a device:
   npm run ios -- --simulator="iPhone 17 Pro"
   ```

3. List available simulators:
   ```sh
   xcrun simctl list devices
   ```

## Testing on Physical Device

1. Connect your iPhone via USB
2. Open `Senderrappios.xcworkspace` in Xcode
3. Select your device from the device menu
4. Ensure you have a valid signing certificate configured in Xcode
5. Press `Cmd+R` to build and run

## TestFlight Deployment

### Prerequisites

- Apple Developer Program membership
- App Store Connect access
- Valid distribution certificate and provisioning profile

### Steps

1. **Archive the app** (see Release Build section above)
2. In the Organizer, select the archive
3. Click **Distribute App**
4. Choose **App Store Connect**
5. Select **Upload**
6. Configure app options (bitcode, symbols, etc.)
7. Complete the upload
8. In App Store Connect:
   - Add the build to TestFlight
   - Configure internal/external testing groups
   - Submit for review if needed

### Required Info

- **Bundle ID**: `com.gosenderr.courier` (or as configured in Xcode)
- **Version**: Check `Info.plist` (CFBundleShortVersionString)
- **Build Number**: Check `Info.plist` (CFBundleVersion)

## Development Workflow

1. Make code changes in `apps/courier-ios-native/src/`
2. Changes hot reload automatically via Fast Refresh
3. For native code changes (Swift/Objective-C/Podfile):
   - Stop the app
   - Run `pod install` if Podfile changed
   - Rebuild in Xcode or `npm run ios`

## Architecture

- **Framework**: React Native 0.76.5
- **Language**: TypeScript 5.0.4
- **Navigation**: React Navigation 7.x
- **Maps**: Mapbox (@rnmapbox/maps)
- **Backend**: Firebase (Auth, Firestore, Functions)
- **State**: Shared from `@gosenderr/shared` package

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Native Firebase](https://rnfirebase.io/)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [CocoaPods Guides](https://guides.cocoapods.org/)

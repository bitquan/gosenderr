# GoSenderr Courier iOS Native App - Setup Guide

This guide will help you set up and build the courier-ios-native app in Xcode.

## Prerequisites

1. **macOS** with Xcode 15+ installed
2. **Node.js** 18+ and pnpm package manager
3. **CocoaPods** for iOS dependency management
4. **Ruby** (for CocoaPods) - included with macOS
5. **Xcode Command Line Tools**: `xcode-select --install`

## Initial Setup

### 1. Install Dependencies

From the monorepo root:

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 2. Install CocoaPods Dependencies

```bash
cd apps/courier-ios-native/ios

# Install Ruby dependencies (CocoaPods)
bundle install

# Install iOS native dependencies
bundle exec pod install
```

This will:
- Install all React Native dependencies
- Install Firebase native SDKs (Auth, Firestore, Functions, Messaging)
- Install Mapbox native SDK
- Set up the workspace for Xcode

### 3. Configure Firebase

The app requires a valid Firebase configuration. The configuration is already included in:
- Web config: `src/config/firebase.ts`
- iOS native config: `ios/Senderrappios/GoogleService-Info.plist`

If you need to use a different Firebase project:
1. Download `GoogleService-Info.plist` from your Firebase console
2. Replace the file in `ios/Senderrappios/GoogleService-Info.plist`
3. Update `src/config/firebase.ts` with your web config

### 4. Configure Mapbox

The Mapbox access token is already configured in:
- `src/config/mapbox.ts`
- `ios/Senderrappios/Info.plist` (MBXAccessToken key)

If you need a different token:
1. Get a token from [Mapbox](https://account.mapbox.com/)
2. Update both files with your token

## Building in Xcode

### Option 1: Open with Xcode

```bash
cd apps/courier-ios-native/ios
open Senderrappios.xcworkspace
```

**Important**: Always open the `.xcworkspace` file, NOT the `.xcodeproj` file, because we're using CocoaPods.

### Option 2: Build from Command Line

```bash
# Start Metro bundler in one terminal
cd apps/courier-ios-native
pnpm start

# Build and run in another terminal
pnpm ios
```

## Build Configuration

### Development Build

- Scheme: **Senderrappios**
- Configuration: **Debug**
- Destination: Any iOS Simulator or Device

### Production Build

1. In Xcode, select **Product > Archive**
2. This will create a distributable build
3. Use the Organizer to upload to App Store Connect or export for TestFlight

## Common Build Issues

### Issue: "Command PhaseScriptExecution failed"

This usually means the Metro bundler isn't running or can't find the JavaScript bundle.

**Solution**:
```bash
# Clean the build
cd apps/courier-ios-native/ios
rm -rf build
cd ..
rm -rf node_modules
pnpm install
cd ios
bundle exec pod install
```

### Issue: "Module 'Firebase' not found"

**Solution**:
```bash
cd apps/courier-ios-native/ios
bundle exec pod install
```

### Issue: Missing framework or library errors

**Solution**:
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
cd apps/courier-ios-native/ios
bundle exec pod deintegrate
bundle exec pod install
```

### Issue: React Native New Architecture errors

The app has `RCTNewArchEnabled` set to `true` in Info.plist. If you encounter issues:
1. You can set it to `false` for the old architecture
2. Or ensure all native modules support the new architecture

## App Capabilities

The app requires the following iOS capabilities (already configured):

1. **Location Services**
   - Location when in use
   - Location always (background)
   - Required for delivery tracking

2. **Push Notifications**
   - Remote notifications
   - Required for job updates

3. **Camera & Photo Library**
   - Required for proof of delivery photos

4. **Background Modes**
   - Location updates
   - Background fetch
   - Remote notifications

## Development Workflow

1. **Start Metro Bundler**: `pnpm start` (in courier-ios-native directory)
2. **Open Xcode**: Open `ios/Senderrappios.xcworkspace`
3. **Select Device/Simulator**: Choose your target in Xcode toolbar
4. **Build & Run**: Press Cmd+R or click the Play button
5. **Enable Hot Reload**: Shake device/simulator and enable "Fast Refresh"

## Testing

### Running Tests

```bash
cd apps/courier-ios-native
pnpm test
```

### TypeScript Type Checking

```bash
cd apps/courier-ios-native
npx tsc --noEmit
```

## Project Structure

```
courier-ios-native/
├── ios/                      # Native iOS code
│   ├── Senderrappios.xcworkspace  # Open this in Xcode
│   ├── Senderrappios/       # iOS app bundle
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist
│   │   └── GoogleService-Info.plist
│   └── Podfile              # CocoaPods dependencies
├── src/                     # React Native code
│   ├── components/          # UI components
│   ├── screens/            # Main screens (MapShell)
│   ├── hooks/              # React hooks
│   ├── lib/                # Utilities (Firebase, jobs, analytics)
│   ├── config/             # Configuration files
│   └── types/              # TypeScript types
├── App.tsx                 # Main app entry point
├── index.js                # React Native entry point
└── package.json            # Dependencies

```

## Deployment Checklist

Before deploying to production:

- [ ] Update version in `Info.plist` (CFBundleShortVersionString)
- [ ] Update build number (CFBundleVersion)
- [ ] Configure proper signing certificates in Xcode
- [ ] Set Release configuration
- [ ] Enable production Firebase project
- [ ] Test on physical device
- [ ] Archive and upload to App Store Connect

## Support

For issues or questions:
- Check the main [README.md](../../README.md)
- Review [DEVELOPMENT.md](../../docs/DEVELOPMENT.md)
- Check [DEPLOYMENT.md](../../docs/DEPLOYMENT.md)

## Firebase Feature Flags

The app uses Firebase feature flags to control feature rollouts:
- Sign in with a courier account
- Navigate to Admin Desktop app to manage feature flags
- Enable `courier.nativeV2` flag to activate the native app UI
- In development mode, you can use the Dev Override toggle

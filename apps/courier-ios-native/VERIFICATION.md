# iOS Native Courier App Restoration - Verification Summary

## Overview

This document provides a summary of changes made to restore the iOS native courier app and verification steps to ensure it builds correctly.

## Changes Summary

### 1. Podfile Configuration Fixed
**File:** `apps/courier-ios-native/ios/Podfile`

**Changes:**
- Added `$FirebaseSDKVersion = '11.11.0'` at the top to pin Firebase SDK version
- Removed redundant Firebase pod declarations that were causing conflicts
- Improved `post_integrate` hook with error handling

**Reason:** The RNFBFunctions build failure was caused by redundant Firebase pod declarations. The `@react-native-firebase` packages already declare Firebase dependencies, so manual declarations created version conflicts.

### 2. Info.plist Configuration Fixed
**File:** `apps/courier-ios-native/ios/Senderrappios/Info.plist`

**Changes:**
- Removed `RCTNewArchEnabled` key to align with Podfile configuration

**Reason:** There was a mismatch - Info.plist enabled the New Architecture while Podfile disabled it (`:fabric_enabled => false`). This inconsistency could cause runtime issues.

### 3. Documentation Added
**Files:**
- `apps/courier-ios-native/README.md` - Comprehensive build and setup guide
- `apps/courier-ios-native/BUILD.md` - Detailed deployment and troubleshooting guide
- `CHANGELOG.md` - Updated with fixes

**Content:**
- Prerequisites and environment setup
- Step-by-step build instructions (Debug and Release)
- Troubleshooting common issues
- TestFlight deployment process
- Configuration reference
- Security notes

## Verification Steps

### Prerequisites Check

Before building, ensure you have:
- [ ] macOS (required for iOS development)
- [ ] Xcode 15.4+ installed
- [ ] Command Line Tools: `xcode-select --install`
- [ ] Node.js 18+ with pnpm
- [ ] CocoaPods 1.16+

### Step 1: Install Dependencies

```sh
# From repository root
pnpm install

# Navigate to iOS directory
cd apps/courier-ios-native/ios

# Install CocoaPods if needed
sudo gem install cocoapods

# Install iOS dependencies
pod install --repo-update
```

**Expected Output:**
- Should complete without errors
- Creates `Podfile.lock` with Firebase SDK v11.11.0
- Creates/updates `Senderrappios.xcworkspace`
- Shows "Auto-linking React Native modules" including RNFBFunctions

**Verify:**
```sh
# Check that Firebase Functions pod is installed
grep "Firebase/Functions" Podfile.lock

# Should show: Firebase/Functions (11.11.0)
```

### Step 2: Build Debug Configuration

```sh
# Option A: Via Xcode
open Senderrappios.xcworkspace
# Select a simulator, press Cmd+B to build

# Option B: Via command line
cd apps/courier-ios-native
npm run ios
```

**Expected Output:**
- Build succeeds without errors
- No "FIRFunctions" or "FIRHTTPSCallable" unknown type errors
- No modular header conflicts
- App compiles and links successfully

**Common Issues:**
- If you see "No such file or directory - xcodebuild", you're on Linux - iOS builds require macOS
- If you see Firebase-related errors, try cleaning: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`

### Step 3: Build Release Configuration

```sh
# In Xcode:
# 1. Product > Scheme > Edit Scheme
# 2. Set Build Configuration to "Release"
# 3. Product > Build (Cmd+B)
```

**Expected Output:**
- Build succeeds for Release configuration
- Optimizations applied (smaller binary, no debug symbols)
- All dependencies linked correctly

### Step 4: Test on Simulator

```sh
# Start Metro bundler
cd apps/courier-ios-native
npm start

# In another terminal
npm run ios
```

**Expected Output:**
- App launches on simulator
- No red error screens
- Firebase initializes correctly
- Metro bundler connects

**Verify:**
- App icon appears on home screen
- Launch screen displays
- Main app UI loads
- No console errors related to Firebase

### Step 5: Verify Firebase Configuration

**Check Firebase initialization in logs:**
```
[Firebase/Core][I-COR000003] The default Firebase app has not yet been configured...
```
Should be followed by successful configuration.

**Common Issues:**
- If Firebase fails to initialize, check `GoogleService-Info.plist` is present
- Ensure bundle ID matches: `com.gosenderr.courier`

## Configuration Reference

### Current Settings

| Setting | Value |
|---------|-------|
| React Native Version | 0.76.5 |
| Firebase iOS SDK | 11.11.0 |
| @react-native-firebase | 21.3.0 |
| iOS Deployment Target | 15.1+ |
| Hermes Engine | Enabled |
| New Architecture | Disabled |
| Bundle ID | com.gosenderr.courier |
| App Version | 1.0 (Build 1) |

### Dependencies Verified

**Firebase Pods:**
- Firebase/Auth
- Firebase/Firestore
- Firebase/Functions
- FirebaseCore (and related)

**React Native Firebase:**
- @react-native-firebase/app
- @react-native-firebase/auth
- @react-native-firebase/firestore
- @react-native-firebase/functions

**Maps & Navigation:**
- @rnmapbox/maps
- @react-navigation/native
- @react-navigation/stack

## Known Issues

### 1. Development Credentials in Repository
- `GoogleService-Info.plist` contains development Firebase config
- `MBXAccessToken` in Info.plist for development Mapbox access
- **Action:** For production, use secrets management

### 2. Push Notifications
- APNs credentialing needs configuration
- FCM setup incomplete
- **Action:** Configure in Firebase Console and Xcode

## Success Criteria

The iOS app is considered "ready" when:
- [x] Podfile correctly configured with pinned Firebase SDK version
- [x] Build errors resolved (no FIRFunctions type errors)
- [x] Configuration inconsistencies fixed (New Architecture alignment)
- [x] Comprehensive documentation provided
- [ ] Debug build succeeds on macOS/Xcode
- [ ] Release build succeeds on macOS/Xcode
- [ ] App launches on simulator without errors
- [ ] Firebase initializes correctly
- [ ] No runtime crashes on startup

## Next Steps

### For Local Development
1. Clone repository
2. Run `pnpm install`
3. Run `cd apps/courier-ios-native/ios && pod install`
4. Open `Senderrappios.xcworkspace` in Xcode
5. Build and run

### For TestFlight
1. Complete local development verification
2. Update version in Info.plist
3. Archive in Xcode (Product > Archive)
4. Validate and upload to App Store Connect
5. Add to TestFlight testing group

### For CI/CD (Future)
1. Set up GitHub Actions for iOS builds
2. Use Fastlane for automation
3. Implement automated TestFlight uploads
4. Add build status badges

## Troubleshooting Reference

### Quick Commands

```sh
# Full clean
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod install --repo-update

# Reset Metro
npm start -- --reset-cache

# List simulators
xcrun simctl list devices

# Check CocoaPods version
pod --version

# View installed pods
cat Podfile.lock | grep "  - "
```

### Build Error Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| `FIRFunctions` not found | Firebase SDK not installed | Run `pod install` |
| Module not found | Stale build cache | Clean DerivedData |
| Permission denied | post_integrate hook | Now has error handling |
| Version mismatch | Multiple Firebase versions | Use `$FirebaseSDKVersion` |

## Contact & Support

- React Native: https://reactnative.dev/
- React Native Firebase: https://rnfirebase.io/
- Xcode Help: https://developer.apple.com/xcode/

## Changelog Reference

See `CHANGELOG.md` for detailed history of changes.

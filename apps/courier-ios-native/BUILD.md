# iOS Native Courier App - Build & Deployment Guide

This document provides detailed instructions for building, testing, and deploying the GoSenderr iOS Native Courier app.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Building from Scratch](#building-from-scratch)
- [Common Build Issues](#common-build-issues)
- [Xcode Configuration](#xcode-configuration)
- [TestFlight Release Process](#testflight-release-process)
- [App Store Submission](#app-store-submission)

## Environment Setup

### Required Tools

1. **macOS** (Ventura 13.0+ recommended)
2. **Xcode 15.4+**
   - Install from Mac App Store
   - Install Command Line Tools: `xcode-select --install`
3. **Node.js 18+** with pnpm
4. **CocoaPods 1.16+**
5. **Ruby 2.7+** (system Ruby on macOS is fine)

### First-Time Setup

```sh
# 1. Clone repository
git clone https://github.com/bitquan/gosenderr.git
cd gosenderr

# 2. Install Node dependencies
pnpm install

# 3. Install CocoaPods if not already installed
sudo gem install cocoapods

# 4. Install iOS dependencies
cd apps/courier-ios-native/ios
pod install --repo-update

# 5. Open workspace (not .xcodeproj!)
open Senderrappios.xcworkspace
```

## Building from Scratch

### Debug Build (Development)

For local development and testing:

```sh
# Terminal 1: Start Metro bundler
cd apps/courier-ios-native
npm start

# Terminal 2: Run on simulator
npm run ios

# Or run on specific simulator
npm run ios -- --simulator="iPhone 17 Pro"
```

**Xcode Method:**

1. Open `Senderrappios.xcworkspace`
2. Select a simulator from device menu
3. Ensure scheme is set to "Senderrappios"
4. Press `Cmd+R` or click Run button

### Release Build (Production)

For TestFlight and App Store:

1. **Update Version & Build Numbers**
   - Open `ios/Senderrappios/Info.plist`
   - Update `CFBundleShortVersionString` (e.g., "1.2.0")
   - Increment `CFBundleVersion` (e.g., "42")

2. **Clean Previous Builds**
   ```sh
   # Clean derived data
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   
   # Clean pods (if needed)
   cd apps/courier-ios-native/ios
   rm -rf Pods Podfile.lock
   pod install --repo-update
   ```

3. **Archive in Xcode**
   - Open `Senderrappios.xcworkspace`
   - Select "Any iOS Device (arm64)" from device menu
   - Product > Scheme > Edit Scheme
   - Set Build Configuration to "Release"
   - Product > Archive
   - Wait for archive to complete

4. **Validate Archive**
   - In Organizer, select the archive
   - Click "Validate App"
   - Select your Apple Developer team
   - Complete validation steps

5. **Upload to App Store Connect**
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Select "Upload"
   - Configure options (keep defaults usually fine)
   - Click "Upload"

## Common Build Issues

### 1. RNFBFunctions Build Errors

**Symptom:** `FIRFunctions` or `FIRHTTPSCallable` unknown type errors

**Solution:**
```sh
cd apps/courier-ios-native/ios
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod install --repo-update
```

**Root Cause:** Firebase SDK version mismatch or incomplete pod installation

**Prevention:** The Podfile now sets `$FirebaseSDKVersion = '11.11.0'` to ensure consistency

### 2. Module Not Found Errors

**Symptom:** `Module 'XXX' not found`

**Solution:**
1. Clean build folder in Xcode: `Shift+Cmd+K`
2. Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`
3. Reinstall pods: `pod install --repo-update`
4. Rebuild: `Cmd+B`

### 3. Permission Errors in post_install

**Symptom:** Error writing to Pods directory during `pod install`

**Solution:** The Podfile `post_integrate` hook now has proper error handling and permission checks

### 4. Metro Bundler Issues

**Symptom:** Bundle fails to load or shows stale code

**Solution:**
```sh
# Reset Metro cache
npm start -- --reset-cache

# Or manually clear
rm -rf /tmp/metro-* 
rm -rf /tmp/haste-*
```

### 5. Signing Certificate Issues

**Symptom:** "No provisioning profile" or "Signing requires a development team"

**Solution:**
1. Open Xcode preferences (`Cmd+,`)
2. Go to Accounts tab
3. Add your Apple ID if not present
4. Select your team in project settings > Signing & Capabilities
5. Enable "Automatically manage signing"

## Xcode Configuration

### Project Settings

- **Deployment Target:** iOS 15.1
- **Supported Devices:** iPhone only (no iPad for now)
- **Supported Orientations:** Portrait only
- **Bundle Identifier:** `com.gosenderr.courier`

### Build Settings

- **Enable Bitcode:** NO (deprecated by Apple)
- **Build Libraries for Distribution:** NO
- **Dead Code Stripping:** YES (Release only)
- **Optimization Level:** `-Os` (Release) / `-Onone` (Debug)

### Capabilities

Required capabilities:
- Background Modes: Location updates, Background fetch
- Push Notifications
- App Groups (if needed for extensions)

### Info.plist Keys

Required permission keys:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby delivery jobs</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We track your location during deliveries to update customers</string>

<key>NSCameraUsageDescription</key>
<string>We need camera access to take proof of delivery photos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to attach delivery photos</string>
```

## TestFlight Release Process

### Prerequisites

- Apple Developer Program membership ($99/year)
- App created in App Store Connect
- Certificates and provisioning profiles configured

### Release Checklist

- [ ] Update version number in `Info.plist`
- [ ] Increment build number in `Info.plist`
- [ ] Test on multiple simulators (iPhone 15, 17, etc.)
- [ ] Test on at least one physical device
- [ ] Verify Firebase configuration (GoogleService-Info.plist)
- [ ] Clean and rebuild for Release configuration
- [ ] Archive and validate in Xcode
- [ ] Upload to App Store Connect
- [ ] Add release notes in App Store Connect
- [ ] Add to internal/external testing groups
- [ ] Monitor crash reports in App Store Connect

### TestFlight Upload

1. Archive the app (see Release Build section)
2. Upload to App Store Connect
3. Wait for processing (10-30 minutes)
4. In App Store Connect:
   - Go to TestFlight tab
   - Select the build
   - Add "What to Test" notes
   - Enable for internal testing (automatic)
   - Submit for external testing (requires App Review)

### Internal Testing

- Up to 100 internal testers
- No App Review required
- Immediate availability after processing
- Access via TestFlight app

### External Testing

- Up to 10,000 external testers
- Requires App Review (1-2 days)
- Public link option available
- Beta app information required

## App Store Submission

### Pre-Submission Checklist

- [ ] All features working as expected
- [ ] No placeholder content or test data
- [ ] Privacy policy URL ready
- [ ] App screenshots prepared (all required sizes)
- [ ] App description written
- [ ] Keywords selected
- [ ] Support URL configured
- [ ] Marketing materials ready

### Submission Steps

1. **Prepare in App Store Connect**
   - Add app description and keywords
   - Upload screenshots and previews
   - Set pricing and availability
   - Complete App Privacy questionnaire
   - Add age rating information

2. **Submit for Review**
   - Select build from TestFlight
   - Complete all required fields
   - Submit for review

3. **During Review**
   - Respond to App Review questions promptly
   - Typical review time: 24-48 hours
   - Be prepared to provide test credentials if needed

4. **Post-Approval**
   - App automatically released (or scheduled)
   - Monitor initial user reviews
   - Watch crash reports closely

### Expedited Review

If urgent (e.g., critical bug fix):
1. Request expedited review in App Store Connect
2. Provide clear justification
3. Limited to 2 requests per year

## Version Management

### Semantic Versioning

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes or major features
- **MINOR:** New features, backward compatible
- **PATCH:** Bug fixes

Example: `1.2.3` → Version 1, Feature Set 2, Bug Fix 3

### Build Number Management

- Build number must increase with each upload
- Use a simple incrementing integer
- No reusing build numbers (App Store will reject)

Example progression:
- v1.0.0 (build 1)
- v1.0.1 (build 2)
- v1.1.0 (build 3)
- v1.1.0 (build 4) - bug fix resubmission

## Continuous Integration

For automated builds (future):

1. Use Fastlane for build automation
2. Set up CI/CD with GitHub Actions or similar
3. Automate TestFlight uploads
4. Automated version incrementing

## Troubleshooting Commands

Quick reference for common issues:

```sh
# Full clean
cd apps/courier-ios-native/ios
rm -rf Pods Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod install --repo-update

# Reset Metro
npm start -- --reset-cache

# List simulators
xcrun simctl list devices

# Clear simulator
xcrun simctl erase all

# View CocoaPods version
pod --version

# Update CocoaPods
sudo gem install cocoapods

# Check signing
codesign -vv -d path/to/App.app

# View certificates
security find-identity -v -p codesigning
```

## Support & Resources

- [React Native Docs](https://reactnative.dev/)
- [React Native Firebase](https://rnfirebase.io/)
- [Apple Developer Portal](https://developer.apple.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## Notes

- Always test thoroughly before submitting to TestFlight
- Keep GoogleService-Info.plist out of version control
- Monitor Firebase quotas and limits
- Keep certificates and provisioning profiles up to date
- Document any custom build steps or environment requirements

# TestFlight Deployment Guide - Gosenderr Senderr App

## ✅ Setup Complete

All Capacitor configuration and iOS setup is complete! The app is ready to build and upload to TestFlight.

## 🚀 What's New in This Build

### Turn-by-Turn Navigation Feature
- **In-app navigation** with Mapbox integration
- **Route visualization** on map with purple route line
- **Camera modes**: Follow (with heading rotation) and Overview
- **Navigation header** showing:
  - Current turn instruction
  - Distance to next turn
  - ETA and total distance
- **Real-time updates** as driver moves
- **3D map tilt** (45°) in follow mode for better perspective

## 📋 Pre-Deployment Checklist

- [x] Capacitor installed and configured
- [x] iOS platform added
- [x] Production build created
- [x] Location permissions configured
- [x] Background modes enabled
- [x] Camera permissions added
- [x] App name updated to "Gosenderr Courier"

## 🔨 Build for TestFlight

### Step 1: Open Xcode
```bash
cd /Users/papadev/dev/apps/gosenderr/apps/senderr-app
open ios/App/App.xcworkspace
```

### Step 2: Configure Signing
1. Select the **App** target in Xcode
2. Go to **Signing & Capabilities** tab
3. Select your **Team**
4. Ensure **Automatically manage signing** is checked
5. Verify the Bundle Identifier is `com.gosenderr.courier`

### Step 3: Update Version & Build Number
1. In Xcode, select the **App** target
2. Go to **General** tab
3. Update:
   - **Version**: 1.0.0 (or increment as needed)
   - **Build**: Increment from current value (e.g., 1 → 2)

### Step 4: Archive the App
1. In Xcode menu: **Product** → **Destination** → **Any iOS Device (arm64)**
2. In Xcode menu: **Product** → **Archive**
3. Wait for archive to complete (may take 2-5 minutes)

### Step 5: Upload to App Store Connect
1. When archive completes, **Organizer** window opens
2. Select your archive
3. Click **Distribute App**
4. Select **App Store Connect** → **Next**
5. Select **Upload** → **Next**
6. Keep default options → **Next**
7. Click **Upload**
8. Wait for upload to complete

### Step 6: Submit for TestFlight Review
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select **Gosenderr Courier** app
3. Go to **TestFlight** tab
4. Your build will appear under **iOS Builds** (may take 5-10 minutes to process)
5. Once processed, click on the build
6. Add **What to Test** notes:
```
New in this build:
- Turn-by-turn navigation with real-time route updates
- Camera auto-rotation based on driver heading
- 3D map view in navigation mode
- Navigation header with turn instructions and ETA

Test scenarios:
1. Accept a job and click "Navigate to Pickup"
2. Verify route displays on map
3. Test camera toggle (follow vs overview mode)
4. Verify map rotates as you change direction
5. Test exit navigation and return to job detail
```
7. Click **Submit for Review** (if required for first build)

## 🧪 TestFlight Testing

### Add Testers
1. In App Store Connect → TestFlight → **Internal Testing**
2. Create a new group or use existing
3. Add testers by email
4. Enable the latest build for the group

### Test Navigation Feature
Share these test steps with your testers:

**Basic Navigation Test:**
1. Sign in to courier app
2. Go online and accept a job
3. Click "Navigate to Pickup" button
4. Verify:
   - Map shows purple route line from your location to pickup
   - Navigation header shows first turn instruction
   - Distance and ETA are displayed correctly

**Camera Mode Test:**
1. While navigating, tap camera toggle button (bottom-right)
2. Should switch between:
   - **Follow mode**: Map rotates with your heading, tilted 3D view
   - **Overview mode**: Shows full route, flat view, north-up

**Movement Test:**
1. Start driving (or simulate movement)
2. Verify:
   - Map follows your position
   - Map rotates to match your heading
   - Turn instructions update as you approach turns
   - Distance to next turn decreases

**Exit Test:**
1. Tap X button in navigation header
2. Should return to job detail page
3. Verify navigation state is cleared

## 🔄 Making Updates

When you need to deploy a new version:

```bash
# 1. Make your code changes
# 2. Build the React app
cd /Users/papadev/dev/apps/gosenderr/apps/senderr-app
pnpm exec vite build

# 3. Sync to iOS
pnpm exec cap sync ios

# 4. Open in Xcode and follow steps 2-5 above
open ios/App/App.xcworkspace
```

## 🐛 Troubleshooting

### Build Fails with Code Signing Error
- Verify your Apple Developer account is active
- Check that provisioning profiles are up to date
- Try "Automatically manage signing" in Xcode

### Location Not Working in TestFlight
- Ensure you granted location permissions when prompted
- Check Settings → Privacy → Location Services → Gosenderr Courier
- Background location requires "Always" permission

### Map Not Showing
- Verify Mapbox token is configured in environment
- Check network connection
- Look for errors in Console app while testing

### Navigation Route Not Appearing
- Check browser console logs (in Safari Web Inspector)
- Verify Mapbox API quota not exceeded
- Ensure location services are enabled

## 📱 App Store Connect Links

- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight**: https://appstoreconnect.apple.com/apps/{YOUR_APP_ID}/testflight
- **Apple Developer**: https://developer.apple.com/account

## 📝 Release Notes Template

For future releases, use this template:

```
Version 1.1.0 (Build XX)

NEW FEATURES
• Turn-by-turn navigation with real-time updates
• Camera auto-rotation based on driving direction
• 3D map view for better spatial awareness

IMPROVEMENTS
• Enhanced map performance
• Better location tracking accuracy
• Smoother camera transitions

BUG FIXES
• Fixed route display issues
• Improved navigation state management
• Better handling of location permissions
```

## 🎉 You're Ready!

The app is fully configured for TestFlight deployment. Just open Xcode and follow the steps above!

**Bundle ID**: `com.gosenderr.courier`
**App Name**: Gosenderr Courier
**Platforms**: iOS 13.0+

---

*Last Updated: January 24, 2026*
*Navigation Feature: Phase 1 & 2 Complete ✅*

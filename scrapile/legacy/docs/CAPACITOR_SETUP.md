# Capacitor Mobile App Setup - Complete! 📱

## ✅ What We Just Set Up

### 1. **GoSenderr Customer** (Purple App)
- **App ID**: `com.gosenderr.customer`
- **Bundle Name**: "GoSenderr Customer"
- **Platforms**: iOS + Android
- **Dev Port**: 5173 (Vite default)

### 2. **GoSenderr Senderr** (Green App - Local Courier)
- **App ID**: `com.gosenderr.courier`  
- **Bundle Name**: "GoSenderr Senderr"
- **Platforms**: iOS + Android
- **Dev Port**: 5174

---

## 🚀 How to Run on Mobile

### Development Mode (Live Reload)
```bash
# Customer App
cd apps/customer-app
pnpm dev                    # Start Vite dev server
pnpm cap:open:ios           # Open in Xcode
# Then click ▶️ Run in Xcode

# Courier App  
cd apps/courier-app
pnpm dev --port 5174        # Start Vite on port 5174
pnpm cap:open:ios           # Open in Xcode
```

### Production Build
```bash
# Customer App
cd apps/customer-app
pnpm cap:sync              # Build + sync to native projects
pnpm cap:open:ios          # Open Xcode to build

# Courier App
cd apps/courier-app
pnpm cap:sync
pnpm cap:open:ios
```

---

## 📦 Installed Plugins

✅ **@capacitor/camera** - Take photos (proof of delivery)
✅ **@capacitor/geolocation** - Track courier location  
✅ **@capacitor/push-notifications** - Job notifications
✅ **@capacitor/preferences** - Local storage

---

## 🎨 App Store Assets Needed

For each app, you'll need:
- **App Icon**: 1024x1024px (no transparency)
- **Screenshots**: 
  - iPhone 6.7" (1290x2796)
  - iPad Pro 12.9" (2048x2732)
- **App Store Description**
- **Keywords**
- **Privacy Policy URL**

---

## 🔧 Next Steps

### Before First Launch:
1. **Set Bundle IDs** in Xcode:
   - Customer: `com.gosenderr.customer`
   - Courier: `com.gosenderr.courier`

2. **Configure Permissions** (Info.plist):
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Take photos for proof of delivery</string>
   
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Show nearby delivery jobs</string>
   
   <key>NSLocationAlwaysUsageDescription</key>
   <string>Track delivery progress for customers</string>
   ```

3. **Apple Developer Account**:
   - Create App IDs
   - Generate certificates
   - Create provisioning profiles

4. **Firebase Setup**:
   - Download `GoogleService-Info.plist` (iOS)
   - Download `google-services.json` (Android)
   - Add to native projects

5. **Comment out dev server** in `capacitor.config.ts` for production:
   ```typescript
   // server: {
   //   url: 'http://localhost:5173',
   //   cleartext: true
   // },
   ```

---

## 📱 Testing Commands

```bash
# Build and run on iOS simulator
pnpm cap:run:ios

# Build and run on Android emulator  
pnpm cap:run:android

# Just open the native IDE
pnpm cap:open:ios
pnpm cap:open:android

# Sync after code changes
pnpm cap:sync
```

---

## 🎯 What's Working

✅ Beautiful role-specific login screens
✅ iOS and Android projects generated
✅ Capacitor plugins installed
✅ Dev server configured for live reload
✅ Build scripts ready

---

## 🚧 Still Need to Build

For **Customer App**:
- Features are 91% complete in web version
- Need to copy from `/apps/web/src/app/customer/*`

For **Courier App**:
- Need to build dashboard, jobs, earnings pages
- Can copy structure from runner system

Want me to start building out the mobile features next?

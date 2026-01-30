# Deployment Guide

**Last Updated:** January 2026  
**Version:** 2.0  
**Purpose:** Complete deployment instructions for all GoSenderr v2 applications

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Admin Desktop (Electron)](#admin-desktop-electron)
4. [Marketplace Web (Firebase Hosting)](#marketplace-web-firebase-hosting)
5. [Marketplace iOS (Capacitor)](#marketplace-ios-capacitor)
6. [Courier iOS (React Native)](#courier-ios-react-native)
7. [Cloud Functions](#cloud-functions)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Node.js and pnpm
node --version    # v18.0.0 or higher
pnpm --version    # v8.0.0 or higher

# Firebase CLI
npm install -g firebase-tools@13.24.1
firebase --version

# Git
git --version     # v2.0.0 or higher
```

### macOS Additional (for iOS builds)
```bash
# Xcode
xcode-select --install
xcodebuild -version  # 15.0 or higher

# CocoaPods
sudo gem install cocoapods
pod --version        # 1.15.0 or higher

# iOS Simulator
xcrun simctl list devices
```

### Windows Additional (for Electron builds)
```powershell
# Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Required: Desktop development with C++

# Windows SDK
# Check in: Settings > Apps > Apps & features > Windows SDK
```

### Accounts & Access

- **Firebase Project:** gosenderr-6773f
- **Apple Developer:** Team ID required for iOS builds
- **Code Signing:** Certificates for macOS/Windows (optional for dev builds)
- **GitHub Actions:** Secrets configured in repository

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/gosenderr.git
cd gosenderr

# Install dependencies
pnpm install

# Verify workspace
pnpm list --depth=0
```

### 2. Environment Variables

Create `.env` files for each application:

#### **Root `.env`** (for Cloud Functions)
```bash
# Firebase Project
FIREBASE_PROJECT_ID=gosenderr-6773f
FIREBASE_REGION=us-central1

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Mapbox
MAPBOX_ACCESS_TOKEN=pk.xxx

# SendGrid (Optional)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@gosenderr.com

# Admin
ADMIN_EMAIL=admin@gosenderr.com
```

#### **apps/admin-desktop/.env**
```bash
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# App Info
VITE_APP_NAME=GoSenderr Admin
VITE_APP_VERSION=2.0.0

# Build Info (for code signing)
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=certificate-password
```

#### **apps/marketplace-app/.env**
```bash
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Mapbox (for pickup/delivery locations)
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx

# API
VITE_API_URL=https://us-central1-gosenderr-6773f.cloudfunctions.net
```

#### **apps/courier-app/.env**
```bash
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
FIREBASE_PROJECT_ID=gosenderr-6773f
FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxx
FIREBASE_APP_ID=xxx

# Mapbox
MAPBOX_ACCESS_TOKEN=pk.xxx

# API
API_URL=https://us-central1-gosenderr-6773f.cloudfunctions.net
```

### 3. Firebase Configuration

```bash
# Login to Firebase
firebase login

# Set active project
firebase use gosenderr-6773f

# Verify access
firebase projects:list
```

---

## Admin Desktop (Electron)

### Development Build

```bash
# Navigate to app
cd apps/admin-desktop

# Install dependencies (if not done)
pnpm install

# Run in development mode
pnpm dev
```

### Production Builds

#### macOS Build (.dmg)

```bash
cd apps/admin-desktop

# Build for macOS (Apple Silicon + Intel)
pnpm build:mac

# Output location
ls -lh dist/
# GoSenderr-Admin-2.0.0-arm64.dmg
# GoSenderr-Admin-2.0.0-x64.dmg
# GoSenderr-Admin-2.0.0-universal.dmg

# Build universal binary (recommended)
pnpm build:mac --universal

# With code signing (requires certificates)
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export CSC_LINK="path/to/Developer_ID_Application.p12"
export CSC_KEY_PASSWORD="certificate-password"
pnpm build:mac --universal
```

**electron-builder Configuration** (`apps/admin-desktop/electron-builder.yml`):
```yaml
appId: com.gosenderr.admin
productName: GoSenderr Admin
copyright: Copyright © 2026 GoSenderr

directories:
  output: dist
  buildResources: build

files:
  - dist-electron
  - dist

mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
        - universal
  category: public.app-category.business
  icon: build/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

dmg:
  title: ${productName} ${version}
  icon: build/icon.icns
  contents:
    - x: 448
      y: 344
      type: link
      path: /Applications
    - x: 192
      y: 344
      type: file

win:
  target:
    - target: nsis
      arch:
        - x64
        - ia32
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: true
  createDesktopShortcut: always
  createStartMenuShortcut: true
```

#### Windows Build (.exe)

```bash
cd apps/admin-desktop

# Build for Windows (64-bit)
pnpm build:win

# Output location
ls -lh dist/
# GoSenderr-Admin-Setup-2.0.0.exe

# Build for both 64-bit and 32-bit
pnpm build:win --ia32 --x64

# With code signing (requires certificate)
export CSC_LINK="path/to/code-signing-certificate.pfx"
export CSC_KEY_PASSWORD="certificate-password"
pnpm build:win
```

#### Build Scripts Setup

Add to `apps/admin-desktop/package.json`:
```json
{
  "name": "@gosenderr/admin-desktop",
  "version": "2.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "build:mac": "vite build && electron-builder --mac",
    "build:win": "vite build && electron-builder --win",
    "build:linux": "vite build && electron-builder --linux",
    "preview": "vite preview",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\""
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0"
  }
}
```

### Distribution

#### macOS (.dmg)
1. **Test the DMG:**
   ```bash
   open dist/GoSenderr-Admin-2.0.0-universal.dmg
   # Drag to Applications and launch
   ```

2. **Notarize (required for macOS 10.15+):**
   ```bash
   xcrun notarytool submit \
     dist/GoSenderr-Admin-2.0.0-universal.dmg \
     --apple-id "your-apple-id@email.com" \
     --password "xxxx-xxxx-xxxx-xxxx" \
     --team-id "TEAM_ID" \
     --wait
   ```

3. **Distribute:**
   - Upload to GitHub Releases
   - Direct download link
   - Website download page

#### Windows (.exe)
1. **Test the installer:**
   ```powershell
   .\dist\GoSenderr-Admin-Setup-2.0.0.exe
   ```

2. **Distribute:**
   - Upload to GitHub Releases
   - Direct download link
   - Website download page

### Auto-Updates (Optional)

Configure auto-updates with electron-updater:

```typescript
// electron/main.ts
import { autoUpdater } from 'electron-updater'

autoUpdater.checkForUpdatesAndNotify()

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. Downloading...'
  })
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. It will be installed on restart.'
  })
})
```

Host updates on GitHub Releases:
```json
// package.json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "gosenderr"
    }
  }
}
```

---

## Marketplace Web (Firebase Hosting)

### Development

```bash
cd apps/marketplace-app

# Run dev server
pnpm dev
# Open http://localhost:5173

# Preview production build
pnpm build
pnpm preview
```

### Production Deployment

#### Build Process

```bash
cd apps/marketplace-app

# Build for production
pnpm build

# Output location
ls -lh dist/
# index.html, assets/, favicon.ico, etc.

# Verify build size
du -sh dist/
# Should be < 2MB for optimal performance
```

#### Deploy to Firebase Hosting

```bash
# From root directory
pnpm deploy:customer

# Or manually
cd apps/marketplace-app
pnpm build
firebase deploy --only hosting:gosenderr-marketplace

# Deploy to specific environment
firebase deploy --only hosting:gosenderr-marketplace --project gosenderr-6773f
```

#### Firebase Hosting Configuration

`firebase.json`:
```json
{
  "hosting": [
    {
      "target": "gosenderr-marketplace",
      "public": "apps/marketplace-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    }
  ]
}
```

`.firebaserc`:
```json
{
  "projects": {
    "default": "gosenderr-6773f"
  },
  "targets": {
    "gosenderr-6773f": {
      "hosting": {
        "gosenderr-marketplace": ["gosenderr-marketplace"]
      }
    }
  }
}
```

#### Custom Domain Setup (Optional)

```bash
# Add custom domain
firebase hosting:channel:deploy production \
  --only gosenderr-marketplace \
  --expires 30d

# Configure DNS
# Add CNAME record: marketplace.gosenderr.com -> gosenderr-marketplace.web.app
# Add A records: marketplace.gosenderr.com -> Firebase IPs

# Verify domain in Firebase Console
# SSL certificate will be auto-provisioned
```

#### Deployment Checklist

- [ ] Run build locally: `pnpm build`
- [ ] Check bundle size: `du -sh dist/`
- [ ] Test build locally: `pnpm preview`
- [ ] Verify environment variables in `.env`
- [ ] Run linter: `pnpm lint`
- [ ] Deploy: `firebase deploy --only hosting:gosenderr-marketplace`
- [ ] Verify live site: https://gosenderr-marketplace.web.app
- [ ] Check browser console for errors
- [ ] Test authentication flow
- [ ] Test critical user paths

---

## Marketplace iOS (Capacitor)

### Prerequisites

```bash
# Install Capacitor CLI
cd apps/marketplace-app
pnpm add -D @capacitor/cli @capacitor/core @capacitor/ios

# Initialize Capacitor
pnpm exec cap init

# Add iOS platform
pnpm exec cap add ios
```

### Configuration

`capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gosenderr.marketplace',
  appName: 'GoSenderr',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    Camera: {
      ios: {
        permissions: {
          camera: 'We need access to your camera to take photos of items'
        }
      }
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
}

export default config
```

### Build and Deploy

#### Development Build

```bash
cd apps/marketplace-app

# Build web assets
pnpm build

# Copy web assets to native project
pnpm exec cap sync ios

# Open in Xcode
pnpm exec cap open ios
```

#### In Xcode:

1. **Select Target:** GoSenderr (Workspace)
2. **Set Team:** Your Apple Developer Team
3. **Set Bundle ID:** com.gosenderr.marketplace
4. **Set Version:** 2.0.0
5. **Set Build Number:** 1
6. **Select Device:** Choose iOS simulator or connected device
7. **Run:** ⌘R or click Play button

#### Production Build

```bash
cd apps/marketplace-app

# Build for production
NODE_ENV=production pnpm build

# Sync to iOS
pnpm exec cap sync ios

# Open Xcode
pnpm exec cap open ios
```

**In Xcode:**

1. **Product > Scheme > Edit Scheme**
   - Set Build Configuration to "Release"

2. **Product > Archive**
   - Wait for archive to complete

3. **Window > Organizer**
   - Select latest archive
   - Click "Distribute App"

4. **Distribution Options:**
   - App Store Connect: For TestFlight and App Store
   - Ad Hoc: For internal testing (limited devices)
   - Development: For developer testing

5. **Upload to App Store Connect:**
   - Select "Upload"
   - Choose automatic signing
   - Click "Upload"

#### App Store Submission

1. **App Store Connect:** https://appstoreconnect.apple.com
2. **Create App:**
   - Name: GoSenderr
   - Bundle ID: com.gosenderr.marketplace
   - SKU: gosenderr-marketplace
   - Language: English

3. **App Information:**
   - Category: Shopping
   - Privacy Policy URL: https://gosenderr.com/privacy
   - Support URL: https://gosenderr.com/support

4. **Pricing:** Free (in-app purchases for transactions)

5. **Build:**
   - Select uploaded build
   - Add screenshots (required sizes for iPhone/iPad)
   - Add app description
   - Keywords: marketplace, delivery, local

6. **Submit for Review:**
   - Review notes: "Test account: test@gosenderr.com / TestPass123"
   - Submit

#### TestFlight (Beta Testing)

```bash
# After archiving in Xcode
# 1. Upload to App Store Connect
# 2. Wait for processing (10-30 minutes)
# 3. Add external testers
# 4. Share TestFlight link
```

TestFlight Link: https://testflight.apple.com/join/XXXXXXXX

### Capacitor Plugins

Required plugins for Marketplace iOS:

```bash
cd apps/marketplace-app

# Camera (for item photos)
pnpm add @capacitor/camera

# Push Notifications
pnpm add @capacitor/push-notifications

# Geolocation (for location)
pnpm add @capacitor/geolocation

# Share (for sharing listings)
pnpm add @capacitor/share

# Status Bar
pnpm add @capacitor/status-bar

# Haptics
pnpm add @capacitor/haptics
```

---

## Courier iOS (React Native)

### Prerequisites

```bash
# Install React Native CLI
npm install -g react-native-cli

# Install Watchman (macOS)
brew install watchman

# CocoaPods
sudo gem install cocoapods
```

### Development Build

```bash
cd apps/courier-app

# Install dependencies
pnpm install

# Install iOS pods
cd ios && pod install && cd ..

# Run on iOS simulator
pnpm ios

# Or specify simulator
pnpm ios --simulator="iPhone 15 Pro"

# Run on physical device (requires provisioning)
pnpm ios --device "Your iPhone"
```

### Metro Bundler

```bash
# Start Metro server separately
pnpm start

# Or with cache reset
pnpm start --reset-cache
```

### Production Build

#### Debug Build (for Testing)

```bash
cd apps/courier-app

# Build debug IPA
cd ios
xcodebuild -workspace CourierApp.xcworkspace \
  -scheme CourierApp \
  -configuration Debug \
  -sdk iphoneos \
  -derivedDataPath ./build \
  -allowProvisioningUpdates

# Find IPA
find ./build -name "*.app"
```

#### Release Build

```bash
cd apps/courier-app/ios

# Open Xcode workspace
open CourierApp.xcworkspace
```

**In Xcode:**

1. **Set Team and Bundle ID:**
   - Target: CourierApp
   - Team: Your Apple Developer Team
   - Bundle Identifier: com.gosenderr.courier
   - Version: 2.0.0
   - Build: 1

2. **Configure Release Scheme:**
   - Product > Scheme > Edit Scheme
   - Run: Release (not Debug)
   - Archive: Release

3. **Archive:**
   - Product > Archive
   - Wait for completion

4. **Distribute:**
   - Window > Organizer
   - Select archive
   - Distribute App > App Store Connect
   - Upload

#### React Native Build Script

Add to `apps/courier-app/package.json`:
```json
{
  "scripts": {
    "ios": "react-native run-ios",
    "ios:release": "react-native run-ios --configuration Release",
    "ios:device": "react-native run-ios --device",
    "android": "react-native run-android",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx"
  }
}
```

### App Store Submission

Same process as Marketplace iOS (see above), but with:
- Bundle ID: com.gosenderr.courier
- App Name: GoSenderr Courier
- Category: Business
- Description: Delivery app for GoSenderr couriers

### TestFlight Distribution

```bash
# After uploading build to App Store Connect
# 1. Add internal testers (automatic access)
# 2. Add external testers (requires beta review)
# 3. Share TestFlight link with testers
```

### Code Push (Optional - for OTA updates)

Install CodePush for React Native:
```bash
cd apps/courier-app

# Install CodePush
pnpm add react-native-code-push

# Link (if not auto-linked)
cd ios && pod install && cd ..

# Configure CodePush in AppDelegate.m
```

Deploy updates:
```bash
# Release update to production
appcenter codepush release-react \
  -a GoSenderr/Courier-iOS \
  -d Production \
  -m --description "Bug fixes and improvements"
```

---

## Cloud Functions

### Deployment

#### Deploy All Functions

```bash
# From root directory
firebase deploy --only functions

# With specific project
firebase deploy --only functions --project gosenderr-6773f
```

#### Deploy Specific Function

```bash
# Single function
firebase deploy --only functions:createStripeConnectAccount

# Multiple functions
firebase deploy --only functions:createStripeConnectAccount,processPayment

# Functions group
firebase deploy --only functions:stripe
```

#### Functions Directory Structure

```
firebase/functions/
├── src/
│   ├── index.ts                    # Main export
│   ├── stripe/
│   │   ├── connect.ts              # Stripe Connect
│   │   ├── payments.ts             # Payment processing
│   │   └── webhooks.ts             # Webhook handlers
│   ├── orders/
│   │   ├── onCreate.ts             # Order creation trigger
│   │   ├── onUpdate.ts             # Order update trigger
│   │   └── notifications.ts        # Order notifications
│   ├── users/
│   │   ├── onCreate.ts             # User creation trigger
│   │   └── profiles.ts             # Profile management
│   └── utils/
│       ├── auth.ts                 # Auth helpers
│       ├── email.ts                # Email service
│       └── validation.ts           # Input validation
├── package.json
├── tsconfig.json
└── .env                            # Local env (gitignored)
```

### Environment Configuration

#### Set Environment Variables

```bash
# Set Firebase config
firebase functions:config:set \
  stripe.secret_key="sk_live_xxx" \
  stripe.webhook_secret="whsec_xxx" \
  mapbox.access_token="pk.xxx" \
  sendgrid.api_key="SG.xxx"

# View current config
firebase functions:config:get

# Clone config to .env (for local development)
firebase functions:config:get > .runtimeconfig.json
```

#### Local Environment (`.env`)

Create `firebase/functions/.env`:
```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
MAPBOX_ACCESS_TOKEN=pk.xxx
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@gosenderr.com
```

### Local Testing

```bash
# Start Firebase emulators
firebase emulators:start

# Or with specific emulators
firebase emulators:start --only functions,firestore,auth

# Import test data
firebase emulators:start --import=./firebase-emulator-data

# Run functions locally
cd firebase/functions
pnpm dev
```

### Deployment Checklist

- [ ] Update function code
- [ ] Update tests: `pnpm test`
- [ ] Lint code: `pnpm lint`
- [ ] Build TypeScript: `pnpm build`
- [ ] Test locally: `firebase emulators:start`
- [ ] Set environment config: `firebase functions:config:set`
- [ ] Deploy: `firebase deploy --only functions`
- [ ] Check logs: `firebase functions:log`
- [ ] Test in production
- [ ] Monitor errors in Firebase Console

### Function Configuration

`firebase/functions/src/index.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

// Configure function regions and memory
export const createOrder = functions
  .region('us-central1')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60,
    maxInstances: 100
  })
  .https.onCall(async (data, context) => {
    // Function implementation
  })
```

### Monitoring

```bash
# View logs
firebase functions:log

# Filter by function
firebase functions:log --only createOrder

# Real-time logs
firebase functions:log --follow

# View errors in Firebase Console
# https://console.firebase.google.com/project/gosenderr-6773f/functions
```

---

## CI/CD Integration

### GitHub Actions

`.github/workflows/deploy.yml`:
```yaml
name: Deploy GoSenderr

on:
  push:
    branches:
      - main
      - production
  pull_request:
    branches:
      - main

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm lint
      
      - name: Type check
        run: pnpm type-check
      
      - name: Run tests
        run: pnpm test

  deploy-web:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build marketplace web
        run: pnpm --filter @gosenderr/marketplace-app build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}
      
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: gosenderr-6773f

  deploy-functions:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Firebase CLI
        run: npm install -g firebase-tools
      
      - name: Deploy Cloud Functions
        run: firebase deploy --only functions --project gosenderr-6773f
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

  build-desktop:
    needs: lint-and-test
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build Electron app (macOS)
        if: matrix.os == 'macos-latest'
        run: pnpm --filter @gosenderr/admin-desktop build:mac
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          CSC_LINK: ${{ secrets.MAC_CERT_BASE64 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
      
      - name: Build Electron app (Windows)
        if: matrix.os == 'windows-latest'
        run: pnpm --filter @gosenderr/admin-desktop build:win
        env:
          CSC_LINK: ${{ secrets.WIN_CERT_BASE64 }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: desktop-app-${{ matrix.os }}
          path: apps/admin-desktop/dist/*
```

### Required GitHub Secrets

Add these in: Repository Settings > Secrets and variables > Actions

```
# Firebase
FIREBASE_TOKEN              # From: firebase login:ci
FIREBASE_SERVICE_ACCOUNT    # Service account JSON
FIREBASE_API_KEY
FIREBASE_PROJECT_ID

# Stripe
STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Apple (for macOS builds)
APPLE_ID
APPLE_APP_SPECIFIC_PASSWORD
MAC_CERT_BASE64             # Base64 encoded .p12 certificate
MAC_CERT_PASSWORD

# Windows (for Windows builds)
WIN_CERT_BASE64             # Base64 encoded .pfx certificate
WIN_CERT_PASSWORD

# Mapbox
MAPBOX_ACCESS_TOKEN
```

### Setting Up Secrets

```bash
# Firebase token
firebase login:ci
# Copy token and add to GitHub secrets as FIREBASE_TOKEN

# Encode certificates
cat Developer_ID_Application.p12 | base64 > mac_cert.txt
# Copy content and add to GitHub secrets as MAC_CERT_BASE64

cat code-signing.pfx | base64 > win_cert.txt
# Copy content and add to GitHub secrets as WIN_CERT_BASE64
```

---

## Troubleshooting

### Admin Desktop

#### Build fails with "Could not find module"
```bash
cd apps/admin-desktop
rm -rf node_modules
pnpm install
pnpm build
```

#### macOS code signing fails
```bash
# Verify certificate
security find-identity -v -p codesigning

# Check certificate expiration
security find-certificate -a -c "Developer ID Application"

# Re-import certificate
security import Developer_ID_Application.p12 -k ~/Library/Keychains/login.keychain
```

#### Windows build fails
```powershell
# Install Visual Studio Build Tools
# Ensure "Desktop development with C++" is installed

# Clean build
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
pnpm install
pnpm build:win
```

### Marketplace Web

#### Firebase deployment fails
```bash
# Re-login
firebase logout
firebase login

# Verify project
firebase projects:list
firebase use gosenderr-6773f

# Clear cache
firebase hosting:channel:delete preview-branch-name
firebase deploy --only hosting:gosenderr-marketplace
```

#### Build size too large (>5MB)
```bash
# Analyze bundle
cd apps/marketplace-app
pnpm build
pnpm exec vite-bundle-visualizer

# Check for large dependencies
npm install -g cost-of-modules
cost-of-modules --no-install

# Consider code splitting
# Lazy load routes and components
```

### Marketplace/Courier iOS

#### Pod install fails
```bash
cd apps/marketplace-app/ios  # or courier-app/ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod deintegrate
pod install --repo-update
```

#### Build fails in Xcode
```bash
# Clean build folder
# Xcode: Product > Clean Build Folder (⇧⌘K)

# Reset derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clear module cache
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex
```

#### Code signing issues
```
# Error: No signing certificate found
# Solution: Xcode > Preferences > Accounts > Download Manual Profiles

# Error: Provisioning profile doesn't match
# Solution: Xcode > Target > Signing & Capabilities > Automatically manage signing
```

#### Metro bundler fails
```bash
cd apps/courier-app
watchman watch-del-all
rm -rf node_modules
pnpm install
pnpm start --reset-cache
```

### Cloud Functions

#### Function deployment timeout
```bash
# Increase timeout
firebase functions:config:set runtime.timeout=540

# Or in function definition
export const myFunction = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onCall(...)
```

#### Function not found after deployment
```bash
# Wait 1-2 minutes for propagation
# Check function exists
firebase functions:list

# Check logs
firebase functions:log --only myFunction

# Re-deploy specific function
firebase deploy --only functions:myFunction
```

#### Environment variables not working
```bash
# Verify config
firebase functions:config:get

# Set missing variables
firebase functions:config:set stripe.secret_key="sk_live_xxx"

# Re-deploy (required after config change)
firebase deploy --only functions
```

### General

#### Port already in use
```bash
# Find process using port
lsof -ti:5173 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5173   # Windows

# Use different port
pnpm dev -- --port 5174
```

#### Git authentication fails
```bash
# Use HTTPS
git remote set-url origin https://github.com/your-org/gosenderr.git

# Or SSH
git remote set-url origin git@github.com:your-org/gosenderr.git
```

#### Disk space full
```bash
# Clean dependencies
pnpm clean
rm -rf node_modules
pnpm install

# Clean system caches
# macOS
rm -rf ~/Library/Caches/*
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clear pnpm cache
pnpm store prune
```

---

## 🔗 Additional Resources

### Official Documentation
- **Firebase:** https://firebase.google.com/docs
- **Electron:** https://www.electronjs.org/docs
- **Capacitor:** https://capacitorjs.com/docs
- **React Native:** https://reactnative.dev/docs
- **Stripe:** https://stripe.com/docs

### Tools
- **Firebase Console:** https://console.firebase.google.com
- **Apple Developer:** https://developer.apple.com
- **App Store Connect:** https://appstoreconnect.apple.com
- **Stripe Dashboard:** https://dashboard.stripe.com

### Support
- **GitHub Issues:** https://github.com/your-org/gosenderr/issues
- **Internal Wiki:** https://wiki.gosenderr.com
- **Slack:** #gosenderr-dev

---

**Last Updated:** January 2026  
**Maintained by:** GoSenderr Development Team

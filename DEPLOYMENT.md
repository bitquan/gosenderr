# 🚀 GOSENDERR - DEPLOYMENT GUIDE

## Overview

This guide covers deploying GoSenderR to production, including Firebase, Cloud Functions, and mobile apps.

---

## Prerequisites

### Required Accounts
- [ ] Firebase/Google Cloud account
- [ ] Stripe account (with Connect enabled)
- [ ] Mapbox account
- [ ] Apple Developer account (for iOS)
- [ ] Google Play Developer account (for Android)
- [ ] Domain registrar access (for DNS)

### Required Tools
```bash
# Node.js 18+
node --version

# pnpm package manager
npm install -g pnpm

# Firebase CLI
npm install -g firebase-tools

# Stripe CLI (optional, for webhook testing)
brew install stripe/stripe-cli/stripe
```

---

## Environment Setup

### 1. Firebase Configuration

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select services:
# ✓ Firestore
# ✓ Functions
# ✓ Hosting
# ✓ Storage
```

### 2. Environment Variables

Create `.env.production` in project root:

```bash
# Firebase
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1...

# App
VITE_APP_URL=https://gosenderr.com
VITE_API_URL=https://us-central1-gosenderr-6773f.cloudfunctions.net
```

### 3. Firebase Functions Config

```bash
# Set Stripe keys
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set stripe.connect_client_id="ca_..."

# Set app URLs
firebase functions:config:set app.url="https://gosenderr.com"

# View current config
firebase functions:config:get
```

---

## Build Process

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Verify installation
pnpm list
```

### 2. Build Web Applications

```bash
# Build customer app (main marketplace)
pnpm --filter @gosenderr/customer-app build

# Build admin app
pnpm --filter @gosenderr/admin-app build

# Build all apps
pnpm build:all
```

**Verify builds:**
```bash
ls -la apps/customer-app/dist
ls -la apps/admin-app/dist
```

### 3. Build Cloud Functions

```bash
cd firebase/functions

# Install function dependencies
pnpm install

# Build TypeScript
pnpm build

# Test locally
firebase emulators:start --only functions
```

---

## Deployment Steps

### Step 1: Deploy Firestore Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Verify rules in console
open https://console.firebase.google.com/project/gosenderr-6773f/firestore/rules
```

### Step 2: Deploy Cloud Storage Rules

```bash
# Deploy storage rules
firebase deploy --only storage

# Verify in console
open https://console.firebase.google.com/project/gosenderr-6773f/storage/rules
```

### Step 3: Deploy Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createOrder

# View logs
firebase functions:log
```

**Monitor deployment:**
```bash
# Check function status
firebase functions:list

# Test function
curl https://us-central1-gosenderr-6773f.cloudfunctions.net/getSystemStats
```

### Step 4: Deploy Web Apps to Firebase Hosting

```bash
# Deploy customer app
firebase deploy --only hosting:customer

# Deploy admin app
firebase deploy --only hosting:admin

# Deploy all hosting
firebase deploy --only hosting
```

**Verify deployment:**
```bash
# Check hosting status
firebase hosting:channel:list

# Open deployed site
open https://gosenderr.com
```

---

## Domain Configuration

### 1. Add Custom Domain

```bash
# Add domain via Firebase CLI
firebase hosting:sites:create gosenderr

# Or use Firebase Console
open https://console.firebase.google.com/project/gosenderr-6773f/hosting/sites
```

### 2. DNS Configuration

Add these records to your DNS provider:

```
Type   Name             Value
----   ----             -----
A      gosenderr.com    151.101.1.195
A      gosenderr.com    151.101.65.195
TXT    gosenderr.com    firebase-site-verification=...
```

### 3. SSL Certificate

Firebase automatically provisions SSL certificates via Let's Encrypt.

**Verify SSL:**
```bash
curl -I https://gosenderr.com
```

---

## Stripe Setup

### 1. Webhook Configuration

Create webhook endpoint in Stripe Dashboard:

**URL:** `https://us-central1-gosenderr-6773f.cloudfunctions.net/stripeWebhook`

**Events to listen:**
```
payment_intent.succeeded
payment_intent.payment_failed
checkout.session.completed
account.updated
transfer.created
```

### 2. Get Webhook Signing Secret

```bash
# From Stripe Dashboard
# Developers → Webhooks → Select endpoint → Signing secret

# Add to Firebase config
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

### 3. Stripe Connect Setup

```bash
# Enable Stripe Connect in Dashboard
open https://dashboard.stripe.com/settings/connect

# Set redirect URI
https://gosenderr.com/vendor/stripe-connect/callback

# Save platform settings
```

---

## Mobile App Deployment

### iOS Deployment

#### 1. Build iOS App

```bash
cd apps/courier-app

# Sync with Capacitor
pnpm build
npx cap sync ios

# Open in Xcode
npx cap open ios
```

#### 2. Configure in Xcode

- Set bundle identifier: `com.gosenderr.courier`
- Set version: `1.0.0`
- Set build number: `1`
- Configure signing (Team & Provisioning Profile)
- Add app icons & launch screens

#### 3. Archive & Upload

1. Product → Archive
2. Upload to App Store Connect
3. Submit for review

### Android Deployment

#### 1. Build Android App

```bash
cd apps/courier-app

# Sync with Capacitor
pnpm build
npx cap sync android

# Open in Android Studio
npx cap open android
```

#### 2. Configure in Android Studio

- Set package name: `com.gosenderr.courier`
- Set version name: `1.0.0`
- Set version code: `1`
- Configure signing key

#### 3. Generate Signed APK

1. Build → Generate Signed Bundle/APK
2. Select Android App Bundle
3. Upload to Google Play Console
4. Submit for review

---

## Post-Deployment Checklist

### Security

- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Cloud Functions authentication enabled
- [ ] API keys restricted (HTTP referrers)
- [ ] Environment variables secured
- [ ] Webhook secrets configured

### Performance

- [ ] CDN caching enabled
- [ ] Image optimization configured
- [ ] Code splitting verified
- [ ] Lazy loading implemented
- [ ] Service worker registered

### Monitoring

- [ ] Firebase Performance Monitoring enabled
- [ ] Google Analytics 4 configured
- [ ] Error tracking set up (Sentry recommended)
- [ ] Uptime monitoring configured
- [ ] Alerts configured for errors

### Testing

- [ ] Authentication flow tested
- [ ] Payment processing tested
- [ ] Order creation tested
- [ ] Delivery workflow tested
- [ ] Email notifications tested
- [ ] Push notifications tested

### Documentation

- [ ] User documentation published
- [ ] Admin guide created
- [ ] API documentation updated
- [ ] Changelog maintained

---

## Rollback Procedures

### Rollback Hosting

```bash
# List previous releases
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

### Rollback Functions

```bash
# List function versions
gcloud functions list

# Rollback specific function
gcloud functions deploy createOrder \
  --source=./previous-version \
  --trigger-http
```

### Rollback Firestore Rules

```bash
# Download previous rules
firebase firestore:rules:get > firestore.rules.backup

# Edit and redeploy
firebase deploy --only firestore:rules
```

---

## Continuous Deployment (CI/CD)

### GitHub Actions Workflow

See [.github/workflows/ci-and-deploy.yml](.github/workflows/ci-and-deploy.yml)

**Workflow triggers:**
- Push to `main` branch
- Pull request to `main`
- Manual workflow dispatch

**Deployment stages:**
1. Lint & type check
2. Build apps
3. Run tests
4. Deploy to Firebase

### Manual Deployment

```bash
# Deploy everything
pnpm deploy:all

# Deploy specific app
pnpm deploy:customer

# Deploy functions only
pnpm deploy:functions
```

---

## Monitoring & Logs

### View Function Logs

```bash
# Real-time logs
firebase functions:log --follow

# Filter by function
firebase functions:log --only createOrder

# Export logs
gcloud logging read "resource.type=cloud_function" \
  --limit 100 \
  --format json > logs.json
```

### Performance Monitoring

```bash
# View in console
open https://console.firebase.google.com/project/gosenderr-6773f/performance

# Check metrics
firebase performance:metrics:list
```

### Error Tracking

Recommended: Set up Sentry

```bash
# Install Sentry
pnpm add @sentry/react @sentry/vite-plugin

# Initialize in app
Sentry.init({
  dsn: "https://...@sentry.io/...",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

---

## Maintenance

### Database Backups

```bash
# Export Firestore data
gcloud firestore export gs://gosenderr-backups/$(date +%Y%m%d)

# Schedule daily backups
gcloud scheduler jobs create app-engine backup-firestore \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-gosenderr-6773f.cloudfunctions.net/backupFirestore"
```

### Update Dependencies

```bash
# Update all dependencies
pnpm update --recursive

# Update Firebase
pnpm add -D firebase-tools@latest

# Update major versions (carefully!)
pnpm add firebase@latest react@latest
```

### Performance Optimization

```bash
# Analyze bundle size
pnpm --filter @gosenderr/customer-app build --analyze

# Lighthouse audit
lighthouse https://gosenderr.com --output=html

# Check Firestore indexes
firebase firestore:indexes
```

---

## Troubleshooting

### Common Issues

**Issue: Functions timeout**
```bash
# Increase timeout
gcloud functions deploy myFunction --timeout=540s
```

**Issue: Hosting cache not updating**
```bash
# Clear CDN cache
firebase hosting:clone gosenderr:live gosenderr:staging
```

**Issue: Firestore rules not applying**
```bash
# Check rules syntax
firebase firestore:rules:check

# Force redeploy
firebase deploy --only firestore:rules --force
```

---

## Production URLs

- **Main App:** https://gosenderr.com
- **Admin:** https://admin.gosenderr.com
- **API:** https://us-central1-gosenderr-6773f.cloudfunctions.net
- **Firebase Console:** https://console.firebase.google.com/project/gosenderr-6773f
- **Stripe Dashboard:** https://dashboard.stripe.com

---

## Support Contacts

- **Firebase Support:** https://firebase.google.com/support
- **Stripe Support:** https://support.stripe.com
- **Team Lead:** [Your contact info]

---

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0.0   | 2026-01-28 | Initial production deployment    |

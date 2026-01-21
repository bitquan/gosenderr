# PR #11 Deployment Checklist

## ✅ Completed

### 1. Firestore Security Rules
- **Status:** ✅ DEPLOYED
- **Action:** Added security rules for all 6 new collections:
  - `routes` - Local delivery routes (<50mi)
  - `longRoutes` - Regional routes (50-200mi)  
  - `longHaulRoutes` - Interstate routes (200+mi)
  - `hubs` - Distribution centers
  - `packages` - Package shipping documents
  - `featureFlags` - Feature control system
- **Deployed:** `firebase deploy --only firestore:rules`
- **Result:** Rules compiled and deployed successfully

## ⏳ Pending Manual Steps

### 2. Feature Flags Initialization
- **Status:** ⏳ MANUAL STEP REQUIRED
- **Action:** Create the feature flags document in Firestore Console
- **URL:** https://console.firebase.google.com/project/gosenderr-6773f/firestore/data/featureFlags/config
- **Instructions:**
  1. Go to Firestore Console
  2. Create collection `featureFlags`
  3. Create document with ID `config`
  4. Copy the JSON structure from `scripts/feature-flags.json`
  5. All PR #11 features should be disabled initially:
     - `delivery.routes: false`
     - `delivery.longRoutes: false`
     - `delivery.longHaul: false`
     - `customer.packageShipping: false`
     - `packageRunner.enabled: false`

### 3. Cloud Functions Deployment
- **Status:** ⏳ PENDING
- **Functions to deploy:**
  - `buildRoutes` - Hourly local route batching
  - `buildLongRoutes` - Daily regional route batching
  - `buildLongHaulRoutes` - Daily interstate route batching
  - `seedHubs` - One-time hub network seeding (callable)
- **Command:**
  ```bash
  cd firebase/functions
  npm install
  npm run build
  firebase deploy --only functions:buildRoutes,functions:buildLongRoutes,functions:buildLongHaulRoutes,functions:seedHubs
  ```

### 4. Hub Network Seeding
- **Status:** ⏳ PENDING (requires Cloud Functions deployed)
- **Action:** Seed 18 major US hubs
- **Method:** Call the `seedHubs` Cloud Function via Firebase Console
- **Location:** Functions > seedHubs > Run function
- **Hubs:** SF, LA, Seattle, Phoenix, Denver, SLC, Dallas, Houston, Chicago, Minneapolis, Detroit, Atlanta, Miami, Charlotte, DC, Philadelphia, NYC, Boston

## 🚀 Ready for Testing

Once all pending steps are complete:

1. **Enable Local Routes** (delivery.routes = true)
   - Test courier route feed
   - Test route acceptance
   - Verify 30% customer discount

2. **Enable Package Shipping** (customer.packageShipping = true)
   - Test package creation flow
   - Verify hub assignment
   - Test tracking page

3. **Enable Package Runners** (packageRunner.enabled = true)
   - Test onboarding flow
   - Test long route acceptance
   - Test long haul route acceptance

## 📊 Monitoring

After deployment:
- Monitor Cloud Functions execution in Firebase Console
- Track Firestore read/write costs (expected +20-30%)
- Set billing alerts
- Monitor user adoption via feature flags

## 🔗 Documentation

- Full PR Review: `docs/PR_11_REVIEW.md`
- Feature Flags JSON: `scripts/feature-flags.json`
- Firestore Rules: `firebase/firestore.rules` (lines 276-396)

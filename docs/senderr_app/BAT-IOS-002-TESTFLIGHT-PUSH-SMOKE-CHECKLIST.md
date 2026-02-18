# BAT-IOS-002 — TestFlight Archive Checklist + Push Smoke Sequence

Last updated: 2026-02-18
Owner branch: `V1/senderrapp/local`

## Goal
Ship a TestFlight build that can:
1. launch with production Firebase config,
2. receive push while app is foreground/background/terminated,
3. complete token wallet and job unlock flows in production.

---

## A) Archive Checklist (Before Upload)

### 1) iOS Signing + Bundle
- [ ] Bundle ID is `com.gosenderr.courier`.
- [ ] Release build uses APNs production entitlement (`APS_ENVIRONMENT=production`).
- [ ] Push Notifications capability enabled in target.
- [ ] Background Modes includes `remote-notification`.

### 2) Firebase + APNs
- [ ] `GoogleService-Info.plist` exists in target resources for release build.
- [ ] Firebase iOS app matches bundle ID `com.gosenderr.courier`.
- [ ] Firebase Cloud Messaging has valid APNs auth key configured.
- [ ] APNs key team/account matches app’s Apple developer team.

### 3) Build Metadata
- [ ] App icon set includes 1024 marketing icon and required device sizes.
- [ ] `MARKETING_VERSION` incremented for release.
- [ ] `CURRENT_PROJECT_VERSION` incremented for new build upload.

### 4) Runtime Config
- [ ] Functions deployed to production project `gosenderr-6773f`.
- [ ] `sendTestPush` callable available in production.
- [ ] Token policy enabled and pack(s) active in production settings.

---

## B) Xcode Archive + TestFlight Upload

1. Open workspace:
   - `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
2. Select scheme `Senderr` and Any iOS Device (arm64).
3. Product → Archive.
4. Distribute App → App Store Connect → Upload.
5. Confirm build appears in App Store Connect → TestFlight.

---

## C) Push Smoke Sequence (Physical iPhone, TestFlight Build)

## Preconditions
- Tester account is approved courier.
- User has logged in once and allowed notifications.
- Device has internet and notifications enabled for app in iOS settings.

## Step 1 — Token Registration
- [ ] Launch app and sign in.
- [ ] Open profile/settings once to ensure token/profile writes run.
- [ ] Confirm user doc has `courierProfile.fcmToken` (or `fcmToken`).

## Step 2 — Foreground Push
- [ ] While app is open, trigger `sendTestPush` for tester user.
- [ ] Verify in-app foreground banner/inbox update appears.

## Step 3 — Background Push
- [ ] Send app to background (home screen, app not killed).
- [ ] Trigger `sendTestPush` again.
- [ ] Verify iOS notification banner/sound appears.

## Step 4 — Terminated Push
- [ ] Force kill app from app switcher.
- [ ] Trigger `sendTestPush` again.
- [ ] Verify lock-screen/banner appears while app is terminated.

## Step 5 — Deep Open Behavior
- [ ] Tap push notification from lock screen.
- [ ] Verify app opens cleanly and no startup crash/log loop occurs.

---

## D) Token + Job Unlock Smoke (Production)

- [ ] Open jobs list and verify unclaimed jobs are masked.
- [ ] Tap **Unlock details with token** on an eligible job.
- [ ] Confirm details unlock and reservation is held.
- [ ] Claim same job and verify claim succeeds without second reserve.
- [ ] Verify wallet summary reflects expected reserve/commit movement.

---

## E) Fail-Fast Diagnostics

If terminated push fails:
1. Verify APNs key is present in Firebase Messaging config.
2. Verify app build is TestFlight/Release (not debug-only behavior).
3. Verify entitlement in built app resolves to `aps-environment=production`.
4. Use `sendTestPush` and inspect `adminActionLog` for provider error details.
5. Confirm iOS notification permission is not disabled at OS level.

---

## Exit Criteria
- [ ] TestFlight build installed and opens without critical startup warnings.
- [ ] Push notifications confirmed in foreground/background/terminated states.
- [ ] Token unlock + claim flow passes in production.
- [ ] BAT-IOS-002 checklist stored with pass/fail notes for each item.

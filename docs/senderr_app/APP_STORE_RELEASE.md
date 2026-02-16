# App Store Release + Metadata

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `per release`

Scope: operational checklist + metadata draft for Senderr iOS App Store submission.

## Release checklist

## 1) Pre-release gates
- [ ] Branch target is `senderr_app`; PR merged with required checks green.
- [ ] `pnpm lint` passes in repo root.
- [ ] `pnpm type-check` passes in repo root.
- [ ] `pnpm run ios:build:verify` passes.
- [ ] Smoke checklist completed: `docs/senderr_app/SMOKE_CHECKLIST.md`.
- [ ] Device matrix pass recorded: `docs/senderr_app/DEVICE_TEST_MATRIX.md`.

## 2) Build + archive
- [ ] Open `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`.
- [ ] Select scheme `Senderr`, configuration `Release`.
- [ ] Confirm bundle id + signing profile match release target.
- [ ] Confirm `GoogleService-Info.plist` for release project is present.
- [ ] Archive and upload in Organizer to App Store Connect.

## 3) App Store Connect
- [ ] Build appears in TestFlight processing.
- [ ] Internal testers validate critical courier flows.
- [ ] Regressions triaged and resolved before submission.
- [ ] Metadata fields completed from draft below.
- [ ] Screenshots updated for required device classes.
- [ ] Privacy nutrition labels reviewed against current SDK usage.

## 4) Submission and rollout
- [ ] Submit for review.
- [ ] Monitor App Review notes and respond same day.
- [ ] After approval, release manually (no auto-release).
- [ ] Post-release monitor crash/analytics + support inbox for 24h.

## App Store metadata draft

## Identity
- App Name: `Senderr Courier`
- Bundle ID: `com.gosenderr.courier`
- Primary Category: `Business`
- Secondary Category: `Productivity`

## Listing copy
- Subtitle: `Courier jobs, tracking, and delivery updates`
- Promotional Text:
  `Accept jobs, navigate routes, update delivery status, and stay synced with dispatch in real time.`
- Keywords:
  `courier,delivery,dispatch,driver,tracking,logistics,proof`
- Description:
  `Senderr Courier helps delivery partners manage active jobs from pickup through dropoff. View assigned jobs, update status with reliable sync, track courier location, and manage profile settings including package and food rate cards. Built for operational reliability with offline-safe workflows and real-time reconnect behavior.`

## Compliance and links
- Support URL: `https://gosenderr.com/support`
- Marketing URL: `https://gosenderr.com`
- Privacy Policy URL: `https://gosenderr.com/privacy`

## Ownership and approval flow

## RACI
- Product owner (`A`): `@bitquan`
- iOS release engineer (`R`): assigned on release PR
- QA approver (`R`): assigned from ops/test group
- Compliance reviewer (`C`): privacy/legal reviewer
- Stakeholders (`I`): support + operations

## Required approvals before submit
- [ ] Product approval (feature readiness + release notes)
- [ ] QA approval (checklist + device matrix)
- [ ] Compliance approval (privacy + data disclosure)
- [ ] Engineering approval (build/signing integrity)

## Release evidence (attach to PR or release issue)
- Build number + App Store Connect link
- TestFlight validation notes
- Known issues / mitigations
- Rollback plan (last stable build + steps)

# Phase 3 Package Runner Checklist

Operational checklist for Issue #14 (Package Runner System).

## Admin Approval Panel

- [ ] Review pending runner applications in /admin/runners
- [ ] Approve/reject and confirm status updates
- [ ] Confirm packageRunner custom claim is set on approval

## Feature Flags

- [ ] Enable packageRunner.enabled
- [ ] Enable packageRunner.hubNetwork
- [ ] Enable packageRunner.packageTracking

## Runner Onboarding

- [ ] Run through /runner/onboarding with test users
- [ ] Verify status set to pending_review
- [ ] Approve via /admin/runners

## Route Generation

- [ ] Confirm buildLongRoutes runs and creates routes
- [ ] Confirm buildLongHaulRoutes creates hub-to-hub routes
- [ ] Verify Firestore longHaulRoutes data shape

## Monitoring

- [ ] Inspect Cloud Functions logs for buildLongRoutes/buildLongHaulRoutes
- [ ] Verify route assignments appear for approved runners

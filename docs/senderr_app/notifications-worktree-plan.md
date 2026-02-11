# Notifications Worktree Plan (Senderrplace)

**Feature slug:** `notifications`

## Goal
Implement web FCM token registration and ensure native APNS/FCM adapters are confirmed and tested. Add emulator tests and function tests to validate end-to-end push flows.

## Scope
- Web: `apps/senderr-app` — request permission & register FCM token on login; write to `users/{uid}.fcmToken`
- Native: `apps/courieriosnativeclean` — audit and add tests for APNS/FCM token writing + adapter checks
- Cloud Functions: add tests for `triggers/notifications.ts` and an HTTP test helper
- Tests: emulator + Playwright or integration tests to confirm token write and test push

## Files to add/change
- `apps/senderr-app/src/services/notifications.ts` (register token)
- `apps/senderr-app/src/App.tsx` (init on login)
- `apps/courieriosnativeclean/src/services/notifications*` (audit + tests)
- `firebase/functions/test/sendPush.test.ts` (unit test for functions)
- `docs/senderr_app/notifications-worktree-plan.md` (this file)

## Acceptance
- Web client registers token and writes to user doc on login
- Function test for push trigger exists and passes in emulator

## Verification
- Manual: sign-in web, check `users/{uid}.fcmToken`
- Run function unit tests in emulator

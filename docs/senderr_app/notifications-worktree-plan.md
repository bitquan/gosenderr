# Notifications Worktree Plan

**Feature slug:** `notifications`

## Goal
Provide end-to-end notification support for both web and native clients: token registration, message types, server triggers, and testing.

## Scope
- Web FCM token registration & refresh (write to `users/{uid}.fcmToken`)
- Native APNS/FCM handling reviewed and validated
- Cloud Functions update to use canonical fields and test coverage for triggers
- Playwright e2e test to validate web push flow (if web push supported in environment)

## Files to update / create
- `apps/senderr-app/src/services/notifications.ts` (register & refresh)
- `apps/senderr-app/src/App.tsx` (init on login)
- `apps/courieriosnativeclean/src/services/notifications*` (validate adapters)
- `firebase/functions/src/triggers/notifications.ts` (tests & code review)
- Add an emulator test for push flow

## Acceptance
- Web clients have `users/{uid}.fcmToken` set on login
- Test push sends via `functions/http/sendTestPush.ts` and is received by clients
- Function test cases for push logic exist in codebase

---

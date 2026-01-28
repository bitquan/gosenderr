---
name: Remove Vendor Pages (Customer App)
about: Move vendor-related pages out of the customer app to vendor app or delete them
title: '[CHORE] Phase 2: Remove vendor pages from Customer App'
labels: chore, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Remove vendor-related routes and pages from the `customer-app` and prepare content for the `vendor-app`.

## 📋 Current State
- Vendor pages currently live under `apps/customer-app/src/pages/vendor/`.
- Vendor-specific workflows should be owned by the `vendor-app`.

## ✅ Tasks
- Copy any vendor pages that are still needed into `apps/vendor-app/src/pages/` (Phase 5 will finalize).
- Remove `apps/customer-app/src/pages/vendor/` directory.
- Ensure no routes or imports reference vendor pages.

## 🔧 Acceptance Criteria
- `apps/customer-app/src/pages/vendor/` directory removed.
- No missing imports or build failures.
- Routes in `customer-app` no longer include vendor paths.

## 🧪 Testing
- Start customer app dev server and browse customer routes.
- Verify vendor flows are not accessible in customer app.

## ⏱ Estimated Time
30 minutes

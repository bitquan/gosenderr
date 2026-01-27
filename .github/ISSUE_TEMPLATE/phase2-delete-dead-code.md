---
name: Delete Dead Code (Customer App)
about: Remove obsolete/duplicate files from the customer app and cleanup imports
title: '[CHORE] Phase 2: Delete dead code in Customer App'
labels: chore, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Remove duplicate and dead code from the `customer-app` to reduce maintenance cost and remove confusion for future work.

## 📋 Current State
- Duplicate pages and components exist in `apps/customer-app/src/pages/` and `apps/customer-app/src/components/`.
- Some UI components are duplicated across `apps/customer-app` and `packages/ui` or `packages/shared`.

## ✅ Tasks
- Identify and list all files to remove in a PR comment.
- Delete the listed files and update imports.
- Replace deleted components with shared `packages/ui` versions when available.
- Run build and type checks.

### Files to Remove (example)
```
apps/customer-app/src/pages/Dashboard.tsx
apps/customer-app/src/pages/Jobs.tsx
apps/customer-app/src/pages/JobDetail.tsx
apps/customer-app/src/pages/Profile.tsx
apps/customer-app/src/pages/Settings.tsx
apps/customer-app/src/pages/RequestDelivery.tsx
apps/customer-app/src/components/BottomNav.tsx  # Keep ui/BottomNav.tsx
```

## 🔧 Acceptance Criteria
- The above files (and any other confirmed duplicates) are removed.
- App builds and type checks pass (`pnpm --filter @gosenderr/customer-app build`, `pnpm type-check`).
- No runtime errors in dev (`pnpm --filter @gosenderr/customer-app dev`).

## 🧪 Testing
- Manual smoke test of main flows (signup/login, dashboard, packages, orders, profile).
- Run lint and tests.

## ⏱ Estimated Time
1 hour

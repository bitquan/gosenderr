---
name: Update Routes (Customer App)
about: Remove vendor routes and clean up routing table in `App.tsx`
title: '[FIX] Phase 2: Update routes for Customer App'
labels: bug, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Ensure `customer-app` routes only contain customer-related paths and remove vendor routes.

## 📋 Current State
`apps/customer-app/src/App.tsx` includes vendor routes such as:
```
<Route path="/vendor/apply" ... />
<Route path="/vendor/dashboard" ... />
<Route path="/vendor/items/new" ... />
```

## ✅ Tasks
- Remove vendor routes from `App.tsx`.
- Clean up any re-exported route constants that reference vendor paths.
- Update tests and snapshots if any.

## 🔧 Acceptance Criteria
- No vendor routes exist in `customer-app` routing.
- App builds and dev flows are unaffected.

## 🧪 Testing
- Navigate to removed paths -> should 404 or redirect to landing.
- Run `pnpm --filter @gosenderr/customer-app dev` and verify navigation.

## ⏱ Estimated Time
30 minutes

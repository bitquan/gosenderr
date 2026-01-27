---
name: Fix Login (Customer App)
about: Remove role switcher and make customer login customer-only
title: '[FIX] Phase 2: Fix login - customer-only'
labels: bug, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Simplify the login page in `customer-app` to only support the customer role and remove any vendor role switching.

## 📋 Current State
Current code in `apps/customer-app/src/pages/Login.tsx` contains role switcher state:
```tsx
const [role, setRole] = useState<'customer' | 'vendor'>('customer')
```

## ✅ Tasks
- Remove role state and UI selectors for role switching.
- Ensure signup and login flows set the user role to `customer` by default.
- Update tests and any helper logic that branches by role.

## 🔧 Acceptance Criteria
- Login page has no role switcher.
- Login and signup flows create users with role `customer` by default.
- All tests pass.

## 🧪 Testing
- Try login flows for customer and vendor (vendor path must be absent).
- Manual test signup and verify user role in Firestore.

## ⏱ Estimated Time
30 minutes

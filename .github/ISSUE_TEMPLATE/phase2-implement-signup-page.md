---
name: Implement Signup Page (Customer App)
about: Create a proper signup page for customers with email verification and default role
title: '[FEAT] Phase 2: Implement customer Signup page'
labels: enhancement, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Add a full-featured signup page for customer accounts with email verification and default role set to `customer`.

## 📋 Current State
- Signup UI is incomplete or reuses login page with role switcher removed.
- No explicit email verification step on signup.

## ✅ Tasks
- Create `apps/customer-app/src/pages/Signup.tsx` with a robust form (email, password, name, phone optional).
- Call registration cloud function or auth API and trigger email verification.
- Auto-set created user's role to `customer` in Firestore/user claims.
- Add client-side validation and tests.

## 🔧 Acceptance Criteria
- Signup page exists and validates input.
- New users receive email verification and `role: customer` is set.
- App builds and tests pass.

## 🧪 Testing
- Sign up a test user and verify Firestore user doc has role set.
- Verify email verification link works.

## ⏱ Estimated Time
1 hour

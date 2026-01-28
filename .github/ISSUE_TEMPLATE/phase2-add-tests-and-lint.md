---
name: Add Tests & Lint (Customer App)
about: Add unit/integration tests and ensure linting and type checks for Phase 2 changes
title: '[TEST] Phase 2: Add tests and lint for customer app changes'
labels: test, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Add tests for changes made in Phase 2 and ensure lint/type checks are green.

## 📋 Current State
- Some areas lack unit tests (signup flow, route changes, nav behavior).

## ✅ Tasks
- Add unit tests for signup page behavior and validation.
- Add tests for routing and nav items.
- Add unit tests for any utility functions changed during cleanup.
- Run `pnpm lint` and `pnpm type-check` and fix issues.

## 🔧 Acceptance Criteria
- New tests added and passing.
- Lint and type-check pass for the repo.

## 🧪 Testing
- Run test suite: `pnpm test` or `pnpm --filter @gosenderr/customer-app test`.
- Run lint: `pnpm lint`.
- Run type checks: `pnpm type-check`.

## ⏱ Estimated Time
30-60 minutes

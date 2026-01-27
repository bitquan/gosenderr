---
name: Update Navigation (Customer App)
about: Implement final 4-tab customer navigation and replace deprecated nav components
title: '[FEAT] Phase 2: Update customer navigation'
labels: enhancement, customer-app, phase:2, priority:P0
assignees: ''
---

## 🎯 Objective
Replace existing navigation with the final customer nav of 4 tabs and ensure shared `ui/BottomNav` is used.

## 📋 Current State
- Multiple nav components exist; some duplicate implementation lives in app.

## ✅ Tasks
- Implement `customerNavItems`:
```ts
export const customerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "📦", label: "Packages", href: "/packages" },
  { icon: "🛒", label: "Orders", href: "/orders" },
  { icon: "👤", label: "Profile", href: "/profile" },
];
```
- Replace app-level BottomNav with shared `ui/BottomNav` and pass `customerNavItems`.
- Update any route names and active state handling.

## 🔧 Acceptance Criteria
- Customer nav shows 4 tabs and navigates correctly.
- Shared UI component is used.
- App builds and tests pass.

## 🧪 Testing
- Verify each tab renders correct page and deep links work.

## ⏱ Estimated Time
30 minutes

# Admin Desktop Audit & Overhaul Plan

Owner: GoSenderr
Date: 2026-02-01
Status: Proposed
Scope: apps/admin-desktop (Electron) + shared dependencies in packages/shared

## Goals
- Define what admin-desktop **must** do in Phase 1 vs. later phases.
- Remove dead or redundant UI/flows to reduce maintenance.
- Align with security best practices for Electron.
- Establish a stable build/packaging/CI pipeline and smoke tests.

## In-Scope
- Admin desktop app architecture, navigation, and core workflows
- Data access (Firestore/Functions), auth, and role enforcement
- Feature flags integration
- Offline storage and sync strategy
- Packaging & release process (macOS/Windows)
- QA smoke tests & runbooks

## Out of Scope (for Phase 1)
- New complex analytics dashboards
- Advanced A/B testing tools
- Major redesign of admin-app web portal (unless required for desktop parity)

## Current State Inventory (to fill)
### Entry Points & Layout
- Renderer entry: `src/main.tsx` with `App.tsx`
- Auth wrapper: `AuthProvider` + `ProtectedRoute`
- Layout: `AdminSidebar` + `PageHeader` + content routes
- Global search modal (`Cmd+K`) and quick nav (`Cmd+1-5`)

### Electron Main/Preload
- `electron/main.ts`
   - `contextIsolation: true`, `nodeIntegration: false`
   - Default menu + logs + error handling
   - Renderer load: Vite dev (`:5176`) or `dist/index.html`
   - Handles new window and nav
- `electron/preload.ts`
   - Exposes `electron` API with `openExternal`

### Routing Inventory (App.tsx)
- Core: Dashboard, Users, Jobs, Disputes, Messaging
- Approvals: Courier Approval, Seller Approval
- Marketplace: Items, Orders, Item Detail, Order Detail, Categories, Flagged Content
- Finance: Revenue, Payment Settings
- System/Tools: System Check, Audit Logs, Feature Flags, Admin Flow Logs, Secrets, Settings, Rate Cards Comparison

### Navigation Groups (AdminSidebar)
- Overview
- User Management
- Communications
- Operations
- Marketplace
- Finance
- System

### Build & Packaging
- Scripts: `pnpm build`, `pnpm dist`, `pnpm test:e2e` (Playwright)
- Packaging via `electron-builder.yml` (macOS DMG, Windows NSIS)
- Output: `dist-electron/`

### Data Access Inventory (Firestore)
- users
- jobs
- orders
- marketplaceItems
- disputes
- categories
- adminLogs
- adminFlowLogs (+ entries subcollection)
- adminMessages
- featureFlags
- platformSettings
- sellerApplications
- jobEvents (components)

Notes:
- Several pages query entire collections (`orders`, `users`, `jobs`, `marketplaceItems`).
- SystemCheck writes test records into multiple collections.

## Gaps & Risks (initial)
- Missing/unclear feature ownership between admin-app and admin-desktop
- Potential security risks (nodeIntegration, contextIsolation, preload bridge)
- Inconsistent data loading and offline support
- Lack of smoke tests and CI verification for desktop builds

## Proposed Keep/Remove/Defer (Phase 1)
### Keep (Phase 1 Must-Have)
- Dashboard
- Users + User Detail
- Jobs
- Disputes
- Courier Approval
- Seller Approval
- Marketplace Items + Item Detail
- Marketplace Orders + Order Detail
- Feature Flags
- Audit Logs
- Settings (core platform settings only)

### Defer (Phase 2)
- Messaging
- Flagged Content
- Categories
- Revenue (if data incomplete)
- Rate Cards Comparison (if data incomplete)
- System Check
- Admin Flow Logs
- Secrets (move behind admin-only + audit trail)

### Remove (if redundant with admin-app)
- Duplicate settings pages (email/security/payment) unless required for desktop parity
- Experimental pages with no backing data or owner

## Proposed Phase 1 Scope (Must-Have)
- Secure Electron defaults (contextIsolation, sandbox, preload API)
- Authentication + admin-only access
- Feature Flags management UI
- Basic operational dashboards (users, jobs, disputes, payouts)
- Log/alert viewing (lightweight)
- Offline cache for critical read-only views
- Packaging + CI build for macOS & Windows

## Proposed Phase 1 Removals (Nice-to-remove)
- Unused tabs/screens
- Duplicate tools already in admin-app
- Experimental pages with no data backing

## Plan of Work
1) **Audit & Inventory**
   - Enumerate screens and features
   - Identify “keep / remove / defer”
   - Map data sources and required rules

2) **Security & Architecture**
   - Harden Electron config
   - Define preload API surface
   - Validate least-privilege access

3) **Core Features**
   - Implement/confirm Phase 1 must-haves
   - Feature-flag all new work

4) **Offline & Sync**
   - Define cache strategy
   - Add background refresh

5) **Packaging & CI**
   - Build macOS/Windows artifacts
   - Add smoke test steps

6) **QA & Docs**
   - Smoke test checklist
   - Admin runbook updates

## Acceptance Criteria
- Phase 1 feature list is implemented and documented
- All non-critical features removed/hidden
- CI builds for macOS/Windows pass
- Smoke tests documented and validated
- Security review checklist completed

## Checklist
- [ ] Complete screen inventory
- [ ] Tag features as Keep/Remove/Defer
- [x] Security hardening checklist (admin gate + limited routes)
- [x] Offline cache enabled (Firestore persistence)
- [ ] CI build + packaging verified
- [ ] Smoke tests added and run

## Notes
- Use feature flags for any new functionality.
- Keep the UI minimal and operationally focused.

# PR Draft — Admin Desktop Phase 1 Cleanup

## Summary
- Trim admin-desktop navigation and routes to Phase 1 must-haves
- Remove deferred/duplicate pages from sidebar and routing
- Align UI surface with audit plan
- Enforce adminProfiles gate in app shell
- Enable Firestore offline persistence
- Limit collection reads and use aggregate queries where possible

## Scope
**Keep (Phase 1):**
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
- Settings (core)

**Deferred/Hidden:**
- Messaging
- Flagged Content
- Categories
- Revenue
- Rate Cards Comparison
- System Check
- Admin Flow Logs
- Secrets
- Payment/Email/Security settings

## Files Changed
- apps/admin-desktop/src/App.tsx
- apps/admin-desktop/src/components/AdminSidebar.tsx
- apps/admin-desktop/src/lib/firebase.ts
- apps/admin-desktop/src/pages/Dashboard.tsx
- apps/admin-desktop/src/pages/Users.tsx
- apps/admin-desktop/src/pages/Jobs.tsx
- apps/admin-desktop/src/pages/Disputes.tsx
- apps/admin-desktop/src/pages/Marketplace.tsx
- apps/admin-desktop/src/pages/MarketplaceOrders.tsx
- apps/admin-desktop/src/pages/UserDetail.tsx
- docs/issues/ADMIN_DESKTOP_AUDIT.md
- docs/issues/ADMIN_DESKTOP_AUDIT_PR.md

## Checklist
- [ ] Routes aligned to Phase 1 keep list
- [ ] Sidebar matches routes
- [ ] Defer list captured in audit plan
- [ ] QA smoke tests updated (if needed)

## Follow-ups
- Implement feature-flag gating for deferred pages
- Data access hardening (limit collection-wide queries)
- Offline cache strategy
- CI packaging and smoke tests

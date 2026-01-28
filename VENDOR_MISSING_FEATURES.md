# Vendor Missing Features & Priorities ⚑

This document lists missing or incomplete features for the vendor/marketplace flow and ranks them by priority.

## Priority: Critical
1. Collection canonicalization (items vs marketplaceItems)
   - Problem: Two collections are used in different places; vendor items may not be visible.
   - Fix: Choose one canonical collection and update both client and helpers. Migrate or copy existing docs as needed.

2. Firestore security rules for `vendorApplications` and marketplace collection
   - Problem: `vendorApplications` and `marketplaceItems` are written by client but not present in `firebase/firestore.rules`.
   - Fix: Add `match` blocks with field validation and ownership rules.

3. Storage rules for vendor item images
   - Problem: Upload path `marketplace/{uid}/...` is not covered by `firebase/storage.rules` which covers `items/{userId}/...` only.
   - Fix: Add `match /marketplace/{userId}/{file}` or change uploads to follow `items/{userId}/{file}`.

## Priority: High
4. Admin approval workflow
   - Problem: No admin UI or Cloud Function to approve vendor applications and promote user to vendor profile.
   - Fix: Add admin listing for `vendorApplications`, allow approve/reject, update `users/{uid}.vendorProfile` or `role` on approval.

5. Client-side invocation of `marketplaceCheckout` (Stripe)
   - Problem: Marketplace item page navigates to `request-delivery`; unclear if `marketplaceCheckout` is called.
   - Fix: Confirm intended UX. If direct purchase is desired, add button calling callable function and handle checkout flow.

## Priority: Medium
6. Vendor item edit page
   - Problem: Link to `/vendor/items/{id}/edit` exists but the page is missing.
   - Fix: Implement edit page and permission checks.

7. E2E tests that cover full vendor lifecycle
   - Problem: No E2E tests validating apply → approve → list → purchase flows.
   - Fix: Add Playwright tests that use the emulator or test environment to assert end-to-end behavior.

## Priority: Low
8. Documentation & onboarding text
   - Problem: Limited docs about vendor workflow & admin steps.
   - Fix: Add short docs and update deploy checklist for Stripe Connect and function deployment.

---

If you'd like, I can open PRs for the top critical items in small chunks (one per PR):
- PR 1: Reconcile collections + migration script
- PR 2: Add Firestore rules for `vendorApplications` & marketplace items
- PR 3: Fix storage rules or client upload path
- PR 4: Add admin approval UI or Cloud Function

Say “Open PRs” and I’ll begin with PR 1 (collection reconciliation) or tell me which PR to prioritize.
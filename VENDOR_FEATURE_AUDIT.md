# Vendor Feature Audit 🚨

## Summary
- Scope: vendor application, vendor item creation, vendor dashboard, public marketplace display, storage & rules, Stripe marketplace checkout.
- Status: Client flows exist for vendor application and vendor listing, Cloud Functions for Stripe exist, but there are several critical mismatches in collections and security rules that will block or expose vendor functionality.

## Key Findings (High Priority)
1. Collection mismatch (CRITICAL)
   - Vendor flows write to `marketplaceItems`, but marketplace browsing and helper functions use `items`.
   - Files:
     - Vendor create: `apps/marketplace-app/src/pages/vendor/items/new/page.tsx` (addDoc -> `marketplaceItems`)
     - Vendor dashboard: `apps/marketplace-app/src/pages/vendor/dashboard/page.tsx` (query -> `marketplaceItems`)
     - Marketplace helpers: `apps/marketplace-app/src/lib/v2/items.ts` (queries -> `items`) 
   - Impact: items created by vendors may not appear in public marketplace listings.

2. Storage path vs rules mismatch (HIGH)
   - Vendor images uploaded to `marketplace/${uid}/...` (client code), but `firebase/storage.rules` only allows `items/{userId}/{photoFile}`.
   - Files:
     - Client upload: `apps/marketplace-app/src/pages/vendor/items/new/page.tsx` (uploads to `marketplace/${uid}/...`) 
     - Storage rules: `firebase/storage.rules` (match `/items/{userId}/{photoFile}` only)
   - Impact: vendor image uploads will be blocked by security rules or operate outside intended protections.

3. Missing/insufficient Firestore rules (CRITICAL)
   - No `match /vendorApplications/{id}` or `match /marketplaceItems/{id}` blocks in `firebase/firestore.rules`.
   - Files:
     - Writes: `apps/marketplace-app/src/pages/vendor/apply/page.tsx` (writes `vendorApplications/${uid}`) 
     - Rules: `firebase/firestore.rules` (contains `match /items/{itemId}` but not `marketplaceItems` or `vendorApplications`)
   - Impact: client writes could fail in production or be ungoverned.

4. Missing vendor edit page (MEDIUM)
   - Dashboard links to `/vendor/items/{id}/edit` but no edit page exists; only `new` exists.
   - Files: `apps/marketplace-app/src/pages/vendor/dashboard/page.tsx` (link to edit) and pages tree lacking `edit` route.

5. Admin approval & lifecycle gaps (HIGH)
   - Client submits vendor application and updates `users/{uid}.vendorApplication`, but there's no explicit admin workflow to approve and set `vendorProfile` or role automatically.
   - Admin UI can set user role manually, but no documented automated approval path.

6. Stripe Cloud Functions presence (INFO)
   - `firebase/functions/src/stripe/marketplaceCheckout.ts` and `stripeConnect.ts` exist and are exported.
   - Need to confirm client-side invocation and E2E for checkout; marketplace item page shows "Request delivery" not a direct checkout button.

## Recommendations (short)
- Decide canonical data model: use `items` OR `marketplaceItems`. Update all client code + helpers accordingly, and migrate existing items.
- Add Firestore rules for `vendorApplications` and `marketplaceItems` (or adapt to chosen canonical collection). Ensure create/update/delete permissions are appropriate.
- Fix storage rules to cover `marketplace/` uploads or change client upload path to `items/{uid}/...`.
- Implement vendor edit page and add E2E tests covering vendor creation → publish → visible in marketplace.
- Add an admin approval UI / Cloud Function to convert a `vendorApplication` into an approved `vendorProfile` and set the `users/{uid}.role` or profile flags.

---

> Evidence gathered from code & rules in the repository; see `VENDOR_MISSING_FEATURES.md` and `VENDOR_IMPLEMENTATION_GUIDE.md` for prioritized fixes and concrete rule/code snippets.
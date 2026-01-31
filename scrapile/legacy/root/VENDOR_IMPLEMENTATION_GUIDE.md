# Vendor Implementation Guide 🛠️

This guide provides concrete changes and code/rule snippets to fix the vendor feature gaps found in the audit.

## 1) Decision: canonical collection
Option A (recommended for minimal change): Make `items` the canonical public marketplace collection and update vendor pages to create documents in `items`. Update vendor dashboard to query `items` where `vendorId == uid`.

Option B: Keep `marketplaceItems` and update marketplace helpers in `apps/customer-app/src/lib/v2/items.ts` to read from `marketplaceItems` (plus add indexes).

Migration strategy (if switching):
- Add a small one-off script (Node/Firebase Admin) to copy docs from `marketplaceItems` → `items` preserving fields and timestamps, or vice-versa.
- Run in staging, confirm read path and marketplace display, then run in production.

## 2) Firestore rules (examples)
Add the following to `firebase/firestore.rules` (adjust helpers & validation as desired):

```text
// Marketplace items (if using marketplaceItems)
match /marketplaceItems/{itemId} {
  allow read: if true;
  allow create: if signedIn() && request.resource.data.vendorId == request.auth.uid
    && request.resource.data.title is string
    && request.resource.data.price is number
    && request.resource.data.images is list;
  allow update, delete: if signedIn() && resource.data.vendorId == request.auth.uid;
  allow read, write: if isAdmin();
}

// Vendor applications
match /vendorApplications/{userId} {
  allow create: if isSelf(userId) && request.resource.data.status == 'pending';
  allow read: if isSelf(userId) || isAdmin();
  allow update: if isAdmin();   // only admins approve/reject
  allow delete: if isAdmin();
}
```

Notes:
- Replace `signedIn()`, `isAdmin()` helpers as defined in repo rules.
- Add stricter validation on fields as appropriate.

## 3) Storage rules (example)
Add a `marketplace` match or change client to `items/{userId}`. Example:

```text
match /marketplace/{userId}/{photoFile} {
  allow write: if isSignedIn() && uid() == userId && isValidImage();
  allow read: if true;
}
```

Or update client uploads to use `items/{uid}/{filename}` to match existing rules.

## 4) Admin approval workflow
- UI: Add a page in Admin app listing `vendorApplications` documents; show applicant data and provide Approve/Reject actions.
- Approve action (Cloud Function or admin client call):
  - Set `users/{uid}.vendorProfile = {status: 'active', approvedAt: serverTimestamp(), ...}`
  - Optionally set `users/{uid}.role = 'vendor'` or rely on `vendorProfile` checks in apps.
  - Move/hide `vendorApplications/{uid}` or set status to `approved`.

## 5) UI changes
- Vendor edit page: implement route `apps/customer-app/src/pages/vendor/items/[id]/edit/page.tsx` to fetch document and allow update/delete.
- Marketplace purchase path: decide intended UX (direct checkout vs request-delivery). If direct purchase, call `marketplaceCheckout` callable and redirect to Stripe Checkout URL returned by function.

## 6) Tests
- Playwright tests to cover:
  - Vendor apply form (submit -> users doc vendorApplication.status == 'pending')
  - Admin approves applicant -> users vendorProfile/status becomes active
  - Vendor creates item -> item appears in public marketplace
  - Purchase flow calls `marketplaceCheckout` and completes (mocked or sandbox)

## 7) Rollout checklist
- Add Firestore & Storage rules changes to PR and run emulator tests.
- Add migration script to move existing items (if changing canonical collection).
- Add unit/e2e tests and run in CI.
- Deploy Cloud Functions (if adding approval function) and confirm logs.
- Deploy rules and watch for errors in staging then prod.

---

If you want, I can: create the PRs for the top critical items (collection reconciliation + rules + storage fix) in that order. Say “Open PRs” to proceed and I’ll start with PR 1.
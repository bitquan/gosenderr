## Vendor item edit — auth race condition fix

Summary
- Issue: In dev/hot-reload scenarios the vendor edit page could attempt an ownership check before Firebase Auth finished initializing, causing `uid` to be `undefined` and incorrectly showing "You are not authorized to edit this item" and redirecting vendors away from the form.

Fix
- Guard added in `apps/customer-app/src/pages/vendor/items/[itemId]/edit/page.tsx`:
  - Wait for auth to finish before loading the item or doing owner checks.
  - If auth initializes and there's no user, redirect to `/login`.
  - Added dev-only logging and a more informative alert in non-production to aid debugging.

Tests
- Added Playwright E2E test `tests/e2e/vendor-edit.spec.ts :: "edit form appears only after auth loads"` that:
  - Creates a test item in the Firestore emulator.
  - Opens the edit page in an unauthenticated context and asserts the edit form does not appear and the user is redirected to `/login`.
  - Signs in in the same context and asserts the edit form becomes visible and `window.__GOSENDERR_EDIT_FORM_READY` is set.

Artifact
- Screenshot demonstrating the original issue (user saw the unauthorized alert before auth finished): `tmp/vendor-edit-after-ready.png` (attached to PR if available / see test artifacts for failures).

Notes
- This is a small, focused fix to prevent a spurious authorization alert caused by an auth initialization race — it keeps user-facing behavior unchanged while improving reliability for dev and CI E2E runs.

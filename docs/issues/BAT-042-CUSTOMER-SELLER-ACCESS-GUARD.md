# BAT-042 Customer/Seller Access Guard Disposition

Date: 2026-02-16
Branch: `bat042/marketplace-test-runner-split`

## Scope

Customer profile/settings experience exposed seller management entry points and seller dashboard navigation.

Targets:

- Sidebar/dashboard nav role visibility
- Profile marketplace CTA behavior by role
- Seller-profile management routes (`/profile/listings`, `/profile/seller-settings`, `/profile/stripe-onboarding`)

## Action Taken

1. Updated role-aware sidebar section builder so `Seller Dashboard` only appears for `seller`/`admin` users.
2. Updated shell integration to pass `isAdmin` into navigation visibility logic.
3. Wrapped seller-profile routes in `RoleGuard` (`allowedRoles=['admin','seller']`).
4. Updated customer profile marketplace card to:
   - show seller management links only for seller/admin users
   - show seller application CTA for non-seller customers

## Verification

- Marketplace app build passes after changes.
- Customer role no longer receives seller dashboard nav link from shell navigation model.
- Direct navigation to seller-profile management routes now role-blocked for non-seller users.

## Files

- `apps/marketplace-app/src/lib/navigation/shellNav.ts`
- `apps/marketplace-app/src/components/layout/SenderrplaceShell.tsx`
- `apps/marketplace-app/src/App.tsx`
- `apps/marketplace-app/src/pages/profile/page.tsx`

# BAT-041 Admin Rescue Disposition

Date: 2026-02-16
Branch: `bat041/admin-rescue-parity`

## Scope

Recovery BAT target:

- `adminNav.ts`
- `PaymentSettings` test

## Action Taken

Integrated rescued artifacts into canonical admin web lane.

1. Added centralized admin navigation config in `apps/admin-app/src/lib/navigation/adminNav.ts`.
2. Refactored `AdminSidebar` to consume shared navigation config and eliminate inline nav drift.
3. Added `PaymentSettings` regression test in `apps/admin-app/src/pages/__tests__/PaymentSettings.spec.tsx`.

## Verification

- Admin app tests pass including the restored payment settings test.
- Admin app build passes with navigation refactor.

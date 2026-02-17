# BAT-036 Settings + Shell Parity Disposition

Date: 2026-02-16
Branch: `bat036/senderr-web-production-refactor`

## Scope

Deliver production-ready courier web parity for:

- profile basics in courier settings surfaces
- payout mode selector dropdown
- token wallet visibility controls
- responsive shell/nav behavior and dashboard usability

## Gaps Found

1. Courier dashboard contained multiple placeholder-only cards/actions (dummy charts, placeholder operations blocks, no real lifecycle-focused workflow).
2. This made the web surface feel non-production even though lifecycle/settings features existed elsewhere.

## Action Taken

1. Refactored courier dashboard in `apps/senderr-app/src/pages/dashboard/page.tsx` to remove placeholder widgets and replace with real, contract-aligned sections:
   - active delivery status with resume action
   - queue summary (open jobs, offers waiting, payment-locked jobs, cancellation rate)
   - compliance + payout readiness (approval state, Stripe readiness)
   - operational quick links to earnings, rate cards, equipment, and settings
2. Retained/validated existing settings parity implementation in `settings/page.tsx`:
   - payout mode selector (`courierProfile.payoutMode`)
   - token wallet visibility toggle (`courierProfile.showTokenWallet`)
   - profile basics + operational settings persistence (`isOnline`, `serviceRadius`, `taxState`, notifications)
3. Confirmed responsive shell/nav parity via `CourierLayout.tsx`:
   - desktop top nav (`lg:block`)
   - mobile bottom nav (`lg:hidden`)

## Verification

- `pnpm --filter @gosenderr/senderr-app build` passes after dashboard refactor.
- Settings page includes persisted payout mode + token wallet controls and profile basics.
- Shell layout supports phone/tablet/desktop nav presentation split.

## Files

- `apps/senderr-app/src/pages/dashboard/page.tsx`
- `apps/senderr-app/src/pages/settings/page.tsx`
- `apps/senderr-app/src/layouts/CourierLayout.tsx`

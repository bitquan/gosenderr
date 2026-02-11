# Payments Worktree Plan (Senderrplace)

**Feature slug:** `payments`

## Goal

Create a robust payments integration for order capture and payouts that can be tested locally using the emulator and Stripe test keys.

## Scope

- Payment capture at checkout (marketplace)
- Payout transfers to sellers/couriers (Stripe Connect flows) and admin reconciliation UI
- Cloud Functions unit tests for `capturePayment` and `transferPayout`
- Test scripts for local Stripe emulation and test keys

## Files to add/change

- `apps/marketplace-app` — checkout integration & test harness
- `apps/admin-app` — payouts UI stub `src/pages/payouts/*`
- `firebase/functions/test/*` — add tests for capture/transfer triggers
- `packages/shared/src/types/payments.ts` — payment-related types

## Acceptance

- Unit tests for capture/transfer pass locally with emulator and test Stripe keys
- Admin can view payouts (admin UI stub)

## Verification

- Run emulator, create test order, run capture function test, simulate payout

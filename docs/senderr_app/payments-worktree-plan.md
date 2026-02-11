# Payments & Payouts Worktree Plan

**Feature slug:** `payments`

## Goal
Implement and harden Stripe integration for payments capture, refunds, and payouts; ensure server-side reliability and tests.

## Scope
- Payment capture on job completion (Stripe integration)
- Payout transfers to couriers (Stripe Connect flows)
- Tests for function triggers: capturePayment, transferPayout
- Admin UI for payouts & reconciliation (`apps/admin-app`)
- E2E testing for end-to-end flow with test Stripe keys

## Files to update / create
- `firebase/functions/src/triggers/*` (payment-related triggers & tests)
- `apps/admin-app/src/pages/payouts/*` — admin reconciliation UI
- `scripts/test-payments.sh` — local test scripts using Stripe test keys
- Add monitoring/alerts for payment failures

## Acceptance
- Payment capture events succeed in emulator tests
- Payout transfer events succeed in integration tests
- Admin can view reconciliation data and trigger retries

---

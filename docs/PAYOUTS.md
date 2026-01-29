# Payouts & transferPayout Function

This doc summarizes the recent work implementing payouts to couriers.

## Implemented
- Function: `firebase/functions/src/stripe/transferPayout.ts`
  - Trigger: `deliveryJobs/{jobId}` onUpdate
  - Behavior: when customer confirms and paymentStatus === 'captured', attempts to transfer courier earnings to courier's Stripe Connect account and records a `payouts/{id}` doc and updates the `deliveryJobs/{jobId}.payout` field.
  - Edge handling: marks `payout.status = 'pending_setup'` when courier missing Stripe account; marks `payout.status = 'failed'` on transfer error and logs error.

## Tests
- Integration tests added: `firebase/functions/test/paymentFlow.spec.ts`
  - Happy path: creates transfer via mocked Stripe client and verifies `payouts` doc and `deliveryJobs` updated.
  - Missing Stripe account: verifies `pending_setup` behavior.

## Next steps
- Add full E2E payment flow tests (Stripe test-mode or stripe-mock), including transfer failure simulations and auto-confirmation scheduling.
- Add monitoring & alerting for payout failures in production.

## Notes
- Implementation is idempotent in behavior by checking existing `payout.status` before creating transfers.
- Uses `STRIPE_SECRET_KEY` from environment; ensure appropriate secrets are configured in CI and production.

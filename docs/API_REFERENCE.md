# API Reference

Source of truth: [firebase/functions/src/index.ts](../firebase/functions/src/index.ts)

## Cloud Functions

### Callable (httpsCallable)
Admin/ops:
- `setAdminClaim`
- `setPackageRunnerClaim`
- `banUser`
- `createUserForAdmin`
- `runTestFlow`
- `getPublicConfig`

Payments/marketplace:
- `createPaymentIntent`
- `stripeConnect`
- `marketplaceCheckout`
- `createMarketplaceOrder`
- `transferPayout`
- `marketplaceCreateConnectAccount`
- `marketplaceGetConnectOnboardingLink`
- `marketplaceGetConnectAccountStatus`
- `marketplaceCreatePaymentIntent`

### HTTP (onRequest)
- `stripeWebhook` (Stripe webhooks)

> Some Stripe marketplace functions export an internal webhook handler; use `stripeWebhook` as the public endpoint.

## Firestore Collections (high-level)
Source of truth: [firebase/firestore.rules](../firebase/firestore.rules)

- `users/{uid}` — profile, roles, and per-role subprofiles.
- `adminProfiles/{uid}` — admin-only access control.
- `adminFlowLogs/{logId}` (+ `entries/`) — admin test flow logs.
- `items/{itemId}` — marketplace listings.
- `marketplaceOrders/{orderId}` — order lifecycle + payment metadata.
- `deliveryJobs/{jobId}` — delivery job lifecycle, status transitions, and participant access.

## Conventions
- Timestamps: use `serverTimestamp()` for created/updated fields.
- Authorization: enforced via Firestore rules and admin callable checks.
- Prefer shared types from [packages/shared](../packages/shared) where available.

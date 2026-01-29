# API Reference (Draft)

## Cloud Functions
- `transferPayout` — invoked on job updates; see `firebase/functions/src/stripe`.
- `createMarketplaceOrder` — order creation helper.

## Firestore Collections
- `deliveryJobs` — job lifecycle fields and statuses
- `users` / `courierProfiles` — profile shape and required fields

## Conventions
- Timestamps: use `serverTimestamp()` for created/updated fields
- Read/write security: follow `firebase/firestore.rules`

(Expand each endpoint/collection with types, example requests, and expected security rules.)

# Senderr iOS Profile Schema Migration

This document tracks profile schema evolution for the courier app and keeps domain models isolated from backend raw fields.

## Current version

- Domain version: `1`
- App type source: `apps/courieriosnativeclean/src/types/profile.ts`
- Service mapper source: `apps/courieriosnativeclean/src/services/profileService.ts`

## Raw storage contract (v1)

User document path: `users/{uid}`

Nested key written by app: `courierProfileV1`

```ts
courierProfileV1: {
  version: 1,
  fullName: string,
  contact: {
    email: string,
    phoneNumber: string,
  },
  availability: 'available' | 'busy' | 'offline',
  vehicle: {
    makeModel: string,
    plateNumber: string,
    color: string,
  },
  settings: {
    acceptsNewJobs: boolean,
    autoStartTracking: boolean,
  },
  rateCards: {
    packages: {
      baseFare: number,
      perMile: number,
      perMinute: number,
      optionalFees: Array<{name: string, amount: number}>,
    },
    food: {
      baseFare: number,
      perMile: number,
      restaurantWaitPay: number,
      optionalFees: Array<{name: string, amount: number}>,
    },
  },
  updatedAt: string,
}
```

## Validation guardrails (v1)

- `packages.baseFare >= 3.00`
- `packages.perMile >= 0.50`
- `packages.perMinute >= 0.10`
- `food.baseFare >= 2.50`
- `food.perMile >= 0.75`
- `food.restaurantWaitPay >= 0.15`

These minimums match the shared project rate-card rules and keep courier pricing contracts consistent.

## Migration rules

When profile schema changes:

1. Add a new typed version in `src/types/profile.ts`.
2. Keep old mappers readable in `profileService.ts`.
3. Add migration logic from old raw shape to newest domain shape.
4. Update this document with:
   - new version number
   - field diff
   - fallback/default behavior
5. Add tests for load/save behavior across versions.

## Notes

- UI forms must not read/write raw Firestore fields directly.
- Business rules and validation stay in service layer (`profileService`).
- If Firebase is offline, local cached profile values are treated as source of truth until sync recovers.

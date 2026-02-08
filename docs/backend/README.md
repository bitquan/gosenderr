# Backend Canonical Template

This is the canonical docs template for backend work (`firebase/functions` + shared contracts).

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-09`
> - Review cadence: `weekly`

## Product Role

- Backend is the source of truth for business rules, validation, authz, and state transitions.
- Senderrplace V2 contracts must be enforced server-side first.

## Scope

- Callable/HTTP Functions
- Firestore-triggered workflows
- Auth and role enforcement
- Availability and booking decision logic
- Payment orchestration (Stripe optional support)
- Ads, badges, and feature-flag governance data paths

## Canonical References

- `firebase/functions/README.md`
- `docs/senderrplace_v2/V2_PLANNING_TEMPLATE.md`
- `docs/senderrplace_v2/AUDIT.md`


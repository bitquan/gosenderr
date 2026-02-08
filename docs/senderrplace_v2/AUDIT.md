# Senderrplace V2 Audit

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `weekly`

## Scope

Audit target:

- `apps/marketplace-app`
- `firebase/functions` marketplace + stripe paths
- canonical docs under `docs/`

Purpose:

- identify gaps before Senderrplace V2 build-out
- define what must be locked before feature implementation

## Executive Summary

The Senderrplace app is functional but carries significant architecture drift and flow inconsistency. The current implementation mixes legacy and V2 patterns, has multiple Firebase client entry points, and includes production-path mock fallbacks in payment flows. The highest-risk gaps are order/payment consistency, feature-flag defaults, and missing product contracts for food-delivery confirmation + courier availability.

## Findings

### Critical

1. Checkout writes orders client-side in mock path
- File: `apps/marketplace-app/src/pages/checkout/page.tsx`
- `MockPaymentForm` writes `orders` directly with `addDoc(...)`, bypassing server-side validation and canonical order contract.
- Risk: schema drift, inconsistent status transitions, security/rules mismatch.

2. Senderrplace type/model drift
- File: `apps/marketplace-app/src/types/marketplace.ts`
- Item categories do not include food/restaurant concepts while runtime code uses food-specific fields (for example `isFoodItem`, `foodDetails`) in checkout/request-delivery flows.
- Risk: type safety and data contract mismatches between UI, Firestore docs, and Functions.

3. Environment-dependent behavior can silently default unsafe
- File: `apps/marketplace-app/src/hooks/useFeatureFlags.ts`
- If feature flags config doc is missing, defaults enable broad capabilities.
- Risk: accidental feature exposure in new environments.

### High

4. Multiple Firebase client layers in same app
- Files: `apps/marketplace-app/src/lib/firebase.ts`, `apps/marketplace-app/src/lib/firebase/client.ts`, `apps/marketplace-app/src/lib/firebase/firestore.ts`
- Different modules initialize/connect differently (including emulator handling).
- Risk: mixed SDK instances, offline/emulator confusion, hard-to-debug behavior.

5. Legacy + V2 route/component overlap
- Files: `apps/marketplace-app/src/App.tsx`, `apps/marketplace-app/src/pages/*`, `apps/marketplace-app/src/components/*`, `apps/marketplace-app/src/components/v2/*`
- Duplicated page paradigms (`RequestDelivery.tsx` and `request-delivery/page.tsx`, `Dashboard.tsx` and `dashboard/page.tsx`, etc.).
- Risk: regressions from touching the wrong path, duplicated logic.

6. Payment/Stripe flow contains dev mock fallback in main service
- Files: `apps/marketplace-app/src/services/stripe.service.ts`, `apps/marketplace-app/src/services/stripe.service.dev.ts`
- Production code path can fallback to mock behavior under some failures/contexts.
- Risk: false-positive “working” checkout during QA and staging.

### Medium

7. Search implementation not production-grade
- File: `apps/marketplace-app/src/services/marketplace.service.ts`
- Explicit backlog item for Algolia/full-text search; current search is client-side filtered list.
- Risk: poor scalability and ranking quality.

8. Address handling incomplete in key areas
- File: `apps/marketplace-app/src/pages/addresses/page.tsx`
- Backlog markers for geocoding/autocomplete.
- Risk: weak delivery quality and downstream dispatch errors.

9. Debug/test artifacts inside app tree
- Paths under `apps/marketplace-app/tests/e2e/tmp` and similar.
- Risk: noisy repo and accidental packaging/CI confusion.

## Product Gaps for Food Delivery Senderrplace V2

The requested product model (restaurant entry reuse + pickup confirmation number + no booking when no courier is available + seller-share links + optional Stripe + dual-role accounts) is not yet represented as a clean domain contract.

Missing canonical entities and rules:

- Merchant/Restaurant directory with dedupe + moderation
- Food order reference model (confirmation number schema and validation)
- Booking eligibility service (courier availability by time window + service area + equipment + capacity)
- Reservation/hold semantics (temporary lock before payment capture)
- explicit fallback UX when no courier is available
- Seller-generated booking-link contract (creation, expiry, revocation)
- Optional Stripe contract where delivery booking can proceed without Stripe checkout
- Dual-role user model where one account can act as customer and seller
- Ad monetization model (seller-paid promotions with policy + measurement)
- Badge system contract (trust/reputation/compliance badges)
- Feature-flag governance contract for staged release
- Admin surface policy (Admin Web as canonical control plane for V2)
- Explicit replacement policy for legacy courier web by Senderr Web
- Shared visual system contract between Senderr app, Senderr Web, and Senderrplace

## Recommended Lock-Ins Before Building V2

1. Canonical architecture decision
- One Firebase client module for the app (`src/lib/firebase/client.ts`) and one public import surface.

2. Canonical order/payment contract
- All order creation and status transitions through Functions-owned endpoints.
- No client direct creation in production path.

3. Canonical senderrplace domain model
- Add food-delivery entities and states to shared types.
- Remove parallel “implicit” fields.

4. Feature-flag safety contract
- Default deny for V2-only flows until explicitly enabled.

5. Route consolidation rule
- Mark legacy routes/components as deprecated and remove after migration.

6. Commerce identity and link contract
- Support same UID in customer and seller contexts.
- Add auditable seller link booking flow with abuse controls.

7. Monetization + governance lock-in
- Define ad products, pricing, placement rules, and disclosure.
- Define badge assignment rules and admin override policy.
- Require every V2 capability behind explicit feature flags with default-deny.

8. Admin control-plane lock-in
- For V2, all admin operations must be implemented in `apps/admin-app`.
- Do not add new V2 admin dependencies to `apps/admin-desktop` until web parity is complete.

## Suggested First Issue Batch (Senderrplace V2 Foundation)

1. `senderrplace-v2: unify firebase client and imports`
2. `senderrplace-v2: enforce server-only order creation`
3. `senderrplace-v2: define food booking domain contract (merchant + confirmation + availability)`
4. `senderrplace-v2: feature-flag default deny and environment matrix`
5. `senderrplace-v2: deprecate duplicate legacy routes/components`

---
title: Senderrplace v2 Hosting & Feature Flag Checklist
---

# Senderrplace v2 Hosting & Feature Flag Checklist

This checklist captures the configuration changes that must land so Senderrplace can publicly replace the legacy Marketplace site while keeping `marketplace_v2` behind a feature gate until parity is verified.

## Firebase Hosting Targets

| Site | Current role | Senderrplace plan |
| --- | --- | --- |
| `gosenderr-6773f` | Internal preview site (`apps/marketplace-app`) | Continue using for staging/previews; keep alias until Senderrplace stable. |
| `gosenderr-marketplace` | Public Marketplace web app (currently `gosenderr-marketplace.web.app`) | Gradually point this site to the Senderrplace build by swapping content in `firebase.json` and ensuring the hosting target uses the latest `apps/marketplace-app/dist`. |

### Actions
1. **Build artifact**: `pnpm --filter @gosenderr/marketplace-app build` outputs to `apps/marketplace-app/dist`. Ensure deployment steps push this artifact to both hosting targets until the `marketplace` staging can be retired.
2. **Firebase config**: `firebase.json` already rewrites both hosting targets to `index.html`. Once Senderrplace is ready, we can keep the same rewrites but add a new hosting target (e.g., `gosenderr-senderrplace`) if we want a dedicated alias before redirecting the marketplace domain.
3. **DNS/redirects**: coordinate with networking to map `senderrplace.gosenderr.com` (or an agreed alias) to whichever Firebase site will host the new experience. Keep the existing `marketplace.gosenderr.com` CNAME pointed to `gosenderr-marketplace.web.app` until the swap.

## Feature Flags

Senderrplace v2 should continue to respect the following flags (see `docs/senderr_app/FEATURE_FLAGS.md` for context):

| Flag | Purpose |
| --- | --- |
| `marketplace_v2` | Master switch for the Senderrplace experience. Keep disabled until home/detail/review flows are verified. |
| `seller_portal_v2` | Controls the new seller dashboard/listing features. |
| `listing_create_v1` | Protects forms such as booking link creation + media uploads. |
| `checkout_v2` | Enables Senderrplace branding inside checkout and tracking UI. |
| `messaging_v1` | Keeps the Senderrplace chat experience separate from legacy conversations until stabilized. |

### Actions
1. Confirm flag defaults in Firebase Remote Config or `publish` scripts.
2. Add any missing flags to admin UI so release managers can toggle them during rollout.
3. Document escape hatch: a single toggle off for `marketplace_v2` should route users back to the legacy experience if something is broken.

## Stripe & Payments

Senderrplace reuses the existing Stripe functions (`firebase/functions/src/stripe*`, `capturePayment`, `refundPayment`). Ensure metadata added to payment intents references Senderrplace (e.g., `description: 'Senderrplace order'`) and that any hosted Checkout or Connect branding points to the new domain.

## Monitoring & Post-Deployment

1. After the first Senderrplace deployment, monitor `PRODUCTION_MONITORING.md` entries and add the new Senderrplace URL alongside the existing marketplace links.
2. Keep `docs/senderrplace-v2-plan.md` updated with milestones so design, QA, and ops teams know when the old Marketplace domain can be retired.
3. Track QA checks (bookings, messaging, ratings) in a shared checklist (e.g., `docs/senderrplace-v2-plan.md` or new `docs/senderrplace-v2-smoke-checklist.md`) before flipping the master flag.

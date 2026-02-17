# BAT-043 Courier UX Refresh Plan

Date: 2026-02-16
Status: in-progress
Owner: Senderr Web

## Goal

Refactor `senderr-app` to feel like a production courier product (not demo UI), while matching `senderrplace` visual system primitives and preserving courier-specific identity and workflows.

## User-Reported Problems

1. Current bottom navigation pattern is not acceptable for courier UX.
2. Token wallet is missing from primary courier surfaces.
3. Payout experience appears Stripe-only.
4. Visual language feels like a demo and not aligned enough with senderrplace baseline.

## Guardrails

- Reuse existing backend contracts and data paths; no schema drift.
- Keep canonical lifecycle flow unchanged:
  `open -> assigned -> enroute_pickup -> arrived_pickup -> picked_up -> enroute_dropoff -> arrived_dropoff -> completed`.
- Match senderrplace theme primitives (surface layering, gradients, spacing rhythm, border styles), but avoid cloning marketplace IA.
- Courier app remains operations-first: next action, route context, payout confidence, risk/error states.

## Implementation Plan

### Phase 1 — Courier Shell + Navigation Redesign

- Replace the current fixed emoji bottom bar with a courier taskbar/shell pattern:
  - mobile: compact action rail + primary action affordance
  - tablet/desktop: left rail/top hybrid preserving quick access to active job
- Keep responsive parity (`phone/tablet/desktop`) using existing layout breakpoints.
- Add explicit active-delivery quick jump at shell level.
- Preserve accessibility/touch behavior and safe-area handling.

### Phase 2 — Primary Wallet Visibility

- Surface token wallet in first-class courier locations:
  - dashboard summary card
  - earnings/payout center
  - optional shell quick balance chip (controlled by `courierProfile.showTokenWallet`)
- Read from existing wallet fields (no new backend shape).
- Add loading/empty/error states for wallet display.

### Phase 3 — Payout Experience Expansion

- Keep Stripe Connect integration, but decouple UI framing from Stripe-only language.
- Introduce payout experience model in UI:
  - payout mode (`stripe_auto` vs `manual_review`)
  - readiness/requirements state
  - payout timeline/status summary
- Move provider-specific actions under a provider panel instead of making provider the page identity.

### Phase 4 — Courier Visual System Alignment

- Apply senderrplace-aligned primitives across shell/cards/buttons:
  - shared gradient/surface hierarchy
  - consistent border radius and elevation rhythm
  - tighter typography hierarchy and reduced placeholder copy
- Keep courier-distinct cues (operational status chips, action-first panels).

### Phase 5 — Validation + Rollout

- Build validation: `pnpm --filter @gosenderr/senderr-app build`.
- Manual smoke:
  - mobile nav usability and active-job jump
  - token wallet visibility toggle behavior
  - payout mode + readiness states
  - lifecycle action flow unchanged
- Record disposition and evidence when implementation is complete.

## Files Expected to Change

- `apps/senderr-app/src/layouts/CourierLayout.tsx`
- `apps/senderr-app/src/components/BottomNav.tsx` (or replacement courier shell nav component)
- `apps/senderr-app/src/pages/dashboard/page.tsx`
- `apps/senderr-app/src/pages/earnings/page.tsx`
- `apps/senderr-app/src/pages/settings/page.tsx` (wallet/payout control parity)

## Acceptance Criteria

- Courier navigation is production-usable and distinct from current bottom tab demo style.
- Wallet balance is visible in primary courier flows (not only buried in settings).
- Payout UX no longer reads as Stripe-only product framing while still supporting Stripe operations.
- Theme alignment with senderrplace primitives is visibly consistent, with courier-specific IA maintained.
- Build passes and lifecycle/payment/proof guards remain intact.

## Progress Update (2026-02-16)

Completed now:

- Phase 1 initial delivery:
  - mobile courier command rail replaces generic tab style
  - shell-level active-delivery quick jump added
  - desktop shell restyled with courier-specific identity and senderrplace-aligned dark gradient primitive
- Phase 2 initial delivery:
  - wallet visibility + balance surfaced in shell, dashboard, and earnings payout center
  - payout mode shown in dashboard and earnings payout center
  - payout framing shifted from Stripe-only copy to payout-mode/provider-readiness model

Pending:

- Phase 3 refinements: provider panel polish and payout timeline communication cleanup
- Phase 4 visual alignment pass across remaining courier pages
- full manual smoke evidence capture and final disposition closeout

## Progress Update (2026-02-16, later)

Completed now:

- Phase 3 refinements delivered:
  - earnings payout center now includes provider-readiness details (account connected state, due and past-due requirement counts)
  - payout guidance language shifted to payout-mode/provider framing
- Phase 4 targeted visual alignment delivered for key courier surfaces:
  - `Jobs` page updated to courier shell-aligned tone and reduced demo-like emoji-heavy presentation
  - `jobs/[jobId]` detail header/loading states aligned with courier shell visual hierarchy
  - `settings` section headers and payout copy cleaned to reduce demo-like feel and Stripe-only wording
- Build validation passed after these updates.

Remaining:

- manual smoke and final closeout disposition

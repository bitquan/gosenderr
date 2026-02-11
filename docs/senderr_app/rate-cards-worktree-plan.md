# Rate Cards Worktree Plan

**Feature slug:** `rate-cards`

## Goal
Implement a consistent rate-card pricing system covering **Admin**, **Seller**, **Customer**, and **Senderr** (courier) so calculations, UI, and rules align across the platform.

## Scope
- Rate card model & storage in Firestore (admin-managed)
- Admin UI to create/edit rate cards (`apps/admin-app`)
- Customer & Seller pricing display & checkout integration (`apps/marketplace-app`) 
- Senderr pricing & fare estimation in `apps/senderr-app` and courier UI
- Tests and e2e flows across apps

## Files to update / create
- `packages/shared/types/rate-card.ts` — canonical type definitions
- `firebase/firestore.rules` — read/write permissions & validations
- `apps/admin-app/src/pages/rate-cards/*` — CRUD UI
- `apps/marketplace-app` — show rates in checkout
- `apps/senderr-app` — fare estimate API call & UI
- `scripts/migrate-rate-cards.js` (if migrating existing data)

## Acceptance criteria
- Admin can create/update rate cards and data validates under rules
- Customers see consistent fare estimates during checkout and job creation
- Playwright e2e verifying rate calculation across Customer→Job creation→Senderr acceptance

## Verification
1. Create a new rate card via Admin UI. 2. Create a checkout/order in marketplace and confirm price matches rate card. 3. Create a job in Senderr that uses the same rate card and confirm courier/fare displays correctly.

---

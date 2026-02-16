# Admin App — Baseline README

Operations/control-plane web app for policy, approvals, payouts, and launch safety checks.

## Run

1. From repo root:
   - `pnpm install --frozen-lockfile`
2. Start app:
   - `pnpm --filter @gosenderr/admin-app dev`
3. Build check:
   - `pnpm --filter @gosenderr/admin-app build`

## Baseline Responsibilities

1. Payment policy and fee controls.
2. Token policy controls (packs, costs, gating toggles).
3. Approval and lifecycle intervention actions.
4. Production safety gates (disable dev-only paths on live).

## Rules

1. Admin labels and status vocabulary must match shared contracts.
2. Admin controls should update canonical docs:
   - `platformSettings/payment`
   - `platformSettings/tokenPolicy`
3. Avoid creating admin-only behavior names that do not exist in runtime surfaces.

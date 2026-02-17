# Senderr Web — Systems Audit (2026-02-17)

Summary
- Scope: audit Senderr Web (courier shell) implementation against SYSTEMS contracts and MVP expectations.
- Result: **Mostly compliant** with SYSTEMS requirements. Key production gaps remain (see Remediation). ✅

What I checked
- SYSTEMS sources: `SYSTEMS/SENDERR_WEB_SYSTEM.md`, `SYSTEMS/PAYMENT_TOKEN_SYSTEM.md`, `SYSTEMS/BACKEND_FUNCTIONS_SYSTEM.md`, `SYSTEMS/SHARED_CONTRACTS_SYSTEM.md`.
- Senderr web code (smoke worktree): `apps/senderr-app` (V1-senderrplace-smoke).
- Firebase functions: `firebase/functions/src/stripe/*` and Firestore rules: `firebase/firestore.rules`.

High-level compliance (by SYSTEMS MVP item)
1) Login/logout & protected routes — Compliant
  - Evidence: `src/contexts/AuthContext.tsx`, `src/routes/ProtectedRoute.tsx` ✅
2) Session restore — Compliant
  - Evidence: `AuthContext.tsx` (onAuthStateChanged + user doc ensure) ✅
3) Job feed / detail / commands — Mostly compliant
  - Evidence: `src/hooks/v2/useOpenJobs.ts`, `src/pages/jobs/[jobId]/page.tsx`, `src/features/jobs/courier/CourierJobActions.tsx` ✅
  - Note: server-side Firestore rules enforce actor-only transitions; client now passes `courierUid` into commands. 
4) Settings / payout-mode / token-wallet visibility — Compliant (UI surfaced)
  - Evidence: `src/pages/settings/page.tsx`, `src/pages/earnings/page.tsx`, `layouts/CourierLayout.tsx` ✅
5) Responsive shell + bottom-nav safe area — Compliant (overlap bug fixed)
  - Evidence: `src/components/BottomNav.tsx`, `src/layouts/CourierLayout.tsx` ✅

Gaps, risk level, and recommended remediation (prioritized)
- P0 — Architectural (must-fix for systems compliance)
  1) Client-side protected status writes vs. canonical rule
     - Issue: `claimJob()` and `updateJobStatus()` are implemented as client-side Firestore transactions (`src/lib/v2/jobs.ts`) even though SYSTEMS/BACKEND_FUNCTIONS_SYSTEM.md states “No client-side direct status writes for protected transitions.”
     - Risk: audit/observability, idempotency, server-side orchestration guarantees.
     - Recommendation: migrate `claimJob` / `updateJobStatus` to server-side callable endpoints (cloud functions) and make client callables-only for protected transitions. Add server telemetry + idempotency keys.
     - Estimated effort: medium (3–5 dev-days). Suggested BAT: create new BAT (P0) or schedule under repo governance (recommend: spawn BAT-044 - lifecycle command hardening).
- P1 — Feature parity / payments
  2) Token-wallet callable/client parity (BAT-040)
     - Issue: backend token-wallet functions + tests exist (`firebase/functions/src/stripe/tokenWallet.ts`) but the web client does not call the callable surface (no client wrappers/UI actions for top-up/adjust).
     - Risk: incomplete payout/token feature parity at launch.
     - Recommendation: add client wrappers for `getTokenWalletSummary` and admin callable `adjustTokenWalletBalance`, add top-up / wallet-adjust UI flows, and end-to-end tests using the emulator. Map to BAT-040. Effort: small→medium.
  3) Idempotency for wallet-changing commands
     - Issue: server ledger exists but replay/idempotency keys for offline replay are not implemented.
     - Recommendation: add idempotency-key support + tests (back-end + client queue replay). Effort: small.
- P1 — Reliability / UX
  4) Web offline command queue
     - Issue: mobile web currently blocks lifecycle commands when offline (CourierJobActions shows offline message). Native plans include a pending status queue; web does not.
     - Recommendation: implement a lightweight command queue for web (persist to IndexedDB/localStorage, replay with idempotency keys). Effort: small→medium.
- P1 — Test coverage
  5) Front-end tests missing (unit + integration)
     - Issue: `apps/senderr-app` lacks unit tests for critical components (CourierJobActions, BottomNav, CourierLayout, dashboard accept/retry).
     - Recommendation: add Jest + React Testing Library tests and a smoke integration test that runs against the Firestore emulator. Effort: small.

Systems/Rules compliance notes
- Firestore security rules correctly enforce courier-only transitions (`firebase/firestore.rules` — `deliveryJobs` / `jobs` match). ✅
- Backend functions exist for token wallet and payout orchestration (`firebase/functions/src/stripe/*`) and have unit tests. ✅
- The remaining non-compliance is architectural (client-side protected writes) — this is a SYSTEMS non-negotiable and should be scheduled as P0.

Proposed next actions (docs-only, per request)
1) Create BAT for lifecycle-command hardening (P0) — recommended label: `BAT-044` (or let governance assign).
2) Move token-wallet client wiring into BAT-040 (P1) and schedule small PR.
3) Add front-end unit tests for lifecycle flows (BAT listing / small PR) — target before final closeout of BAT-043.
4) Add idempotency keys to token-wallet commands and document replay policy in `SYSTEMS/PAYMENT_TOKEN_SYSTEM.md`.

Files I used as evidence
- Client
  - `apps/senderr-app/src/features/jobs/courier/CourierJobActions.tsx`
  - `apps/senderr-app/src/lib/v2/jobs.ts`
  - `apps/senderr-app/src/layouts/CourierLayout.tsx`
  - `apps/senderr-app/src/components/BottomNav.tsx`
  - `apps/senderr-app/src/pages/settings/page.tsx`
  - `apps/senderr-app/src/pages/dashboard/page.tsx`
- Backend / Rules
  - `firebase/firestore.rules` (deliveryJobs / jobs guards)
  - `firebase/functions/src/stripe/tokenWallet.ts`
  - `firebase/functions/src/stripe/transferPayout.ts`

Audit disposition / recommended priorities (short)
1. P0: Migrate lifecycle commands → server callable (create BAT) — high priority
2. P1: Token-wallet client parity (BAT-040) + idempotency — medium priority
3. P1: Add web offline command queue + idempotency replay — medium priority
4. P1: Add front-end unit/integration tests — medium priority

Do you want me to (pick one):
- A) Open PRs for P0/P1 fixes now (I will create branches + PRs),
- B) Run the BAT-043 manual smoke checklist, or
- C) Only keep this audit doc (no code changes). ← you already selected C.

---
Audit created: `docs/issues/AUDIT-SENDERR-WEB-2026-02-17.md`
If you want, I can: create BATs, open PRs (small incremental PRs), or run the emulator smoke checklist next. Which should I do next? (reply or use the quick action buttons in this thread)

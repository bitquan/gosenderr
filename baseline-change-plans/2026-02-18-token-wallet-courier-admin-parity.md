# Baseline Change Plan: token-wallet-courier-admin-parity

Date: 2026-02-18
Baseline source: `senderrplace`
Owner(s): @bitquan
Execution follow doc: `baseline-change-plans/2026-02-18-token-wallet-courier-admin-parity-execution.md`

## 1. Baseline Change Summary

Token-wallet behavior and courier offer handling were unified across backend and clients so courier web, admin web, and callable command pathways now align on the same wallet source and reject semantics.

Key baseline updates:
- Courier token-gated offer flow hardened (unlock -> claim, release on reject/switch/exit).
- Courier/admin identity parity surfaced via linked UID in UI.
- Admin token ledger/account selection persistence added.
- `declineCourierJobOffer` made idempotent-safe for queue race conditions.
- Callable wiring fixed so `getTokenWalletSummary` uses command-backed ledger wallet (`tokenWallets/{uid}`) instead of legacy user-doc wallet fields.

## 2. Impacted Domains

- lifecycle
- feed visibility
- payout
- map/route

## 3. Impacted Surfaces

- [x] iOS courier
- [x] admin app
- [x] shared contracts
- [x] backend/functions
- [x] docs/checklists

## 4. Task List

| ID | Surface | Priority | Task | Status |
|---|---|---|---|---|
| BAT-TW-001 | backend/functions | P0 | Unify `getTokenWalletSummary` callable export to command-backed wallet implementation | done |
| BAT-TW-002 | backend/functions | P0 | Make `declineCourierJobOffer` idempotent for queue transition races | done |
| BAT-TW-003 | courier web | P0 | Add wallet sync hardening + explicit manual refresh in map shell | done |
| BAT-TW-004 | admin web | P1 | Persist selected token target and restore after page switch | done |
| BAT-TW-005 | courier + admin UX | P1 | Add linked UID display for cross-surface parity checks | done |
| BAT-TW-006 | release evidence | P0 | Deploy courier/admin hosting + targeted functions and collect production validation evidence | done |

## 5. Validation Plan

- Callable checks:
  - `getTokenWalletSummary` returns canonical ledger-backed values for active courier UID.
  - `adminGetTokenWalletView` matches same UID values in `tokenWallets/{uid}`.
- Courier manual smoke:
  - Refresh tokens in map shell updates current balance.
  - Unlock/reject flow does not hard-fail on offer queue race.
- Admin manual smoke:
  - Account lookup persists selected target across navigation.
  - Ledger rows and wallet summary align for selected UID.

## 6. Completion Criteria

- [x] execution follow doc created and linked
- [x] tasks complete
- [x] drift checklist updated/passed (no unresolved drift items for this scope)
- [x] task board updated (captured in this baseline checkpoint)
- [x] linked app checklists updated (senderr/app token parity validation)

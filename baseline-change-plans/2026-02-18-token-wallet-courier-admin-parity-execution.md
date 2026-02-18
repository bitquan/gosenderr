# Baseline Execution Follow Doc: token-wallet-courier-admin-parity

Date: 2026-02-18
Plan doc: `baseline-change-plans/2026-02-18-token-wallet-courier-admin-parity.md`
Owner(s): @bitquan

## 1. Task Execution Log

| Task ID | Surface | Action | Status | Evidence |
|---|---|---|---|---|
| BAT-TW-001 | backend/functions | Re-routed `getTokenWalletSummary` export to command-backed wallet path in `firebase/functions/src/index.ts`; removed legacy export from `firebase/functions/src/stripe/index.ts` | done | production deploy success for `functions:getTokenWalletSummary` |
| BAT-TW-002 | backend/functions | Updated `declineCourierJobOffer` to no-op when courier is no longer in queue | done | production deploy success for `functions:declineCourierJobOffer` |
| BAT-TW-003 | courier web | Added map shell token wallet refresh on focus/interval/manual and pre-unlock refresh | done | courier hosting deploy + live UI verification |
| BAT-TW-004 | admin web | Added local persistence/auto-restore for selected token account in Token Operations page | done | admin hosting deploy + cross-page validation |
| BAT-TW-005 | courier + admin UX | Added linked UID readout for parity checks | done | side-by-side courier/admin screenshot verification |
| BAT-TW-006 | release evidence | Deployed targeted hosting/functions and validated with production logs and user smoke | done | Firebase deploy outputs + runtime logs |

## 2. Validation Evidence

- tests:
  - Type diagnostics clean for changed TS files.
- manual smoke:
  - Courier and admin now reference same UID for token checks.
  - Reject flow no longer throws user-blocking 403 on queue transition race.
- screenshots/logs:
  - Side-by-side courier/admin parity screenshots.
  - Cloud Functions deployment logs for token wallet and decline callables.

## 3. Drift Findings

- Root drift identified and closed:
  - Duplicate callable symbol (`getTokenWalletSummary`) existed in two modules; runtime export precedence caused courier to hit legacy wallet source while admin used canonical ledger source.

## 4. Blockers and Variances

- No blockers remain for this baseline scope.
- Note: Function build image cleanup warning observed in Firebase deploy output; non-blocking for runtime behavior.

## 5. Closeout

- [x] all task IDs from plan executed or explicitly blocked
- [x] task board statuses aligned with real status
- [x] checklist pass/fail recorded with evidence
- [x] plan marked complete or carries explicit follow-ups

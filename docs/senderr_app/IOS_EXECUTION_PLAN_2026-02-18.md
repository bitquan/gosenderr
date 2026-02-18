# Senderr iOS Execution Plan (System-Aligned)

Date: 2026-02-18
System references:
- `SYSTEMS/SENDERR_IOS_SYSTEM.md`
- `SYSTEMS/BACKEND_FUNCTIONS_SYSTEM.md`
- `SYSTEMS/SHARED_CONTRACTS_SYSTEM.md`
- `SYSTEMS/PAYMENT_TOKEN_SYSTEM.md`
- `SYSTEMS/RELEASE_GOVERNANCE_SYSTEM.md`

## Goal

Ship Senderr iOS completion to production-ready parity with the stabilized command-driven backend behavior and token wallet model, with no direct status mutation and no drift from shared contracts.

## Scope Boundaries (from SYSTEMS)

In-scope:
1. Courier auth/session reliability.
2. Job feed visibility + claim eligibility parity.
3. Lifecycle action reliability (`accept -> pickup -> dropoff -> complete`).
4. Proof capture flow.
5. Settings/profile payout + token-aware UX.

Out-of-scope for this wave:
- New monetization models.
- Net-new role/surface expansion.
- Redesign work not required for lifecycle reliability.

## Delivery Tracks

### Track A — Contract & Command Parity
- Verify iOS uses callable command pathways for claim/advance/cancel/decline only.
- Remove/guard any direct Firestore status writes from iOS action paths.
- Validate status vocabulary strictly matches shared contracts.

### Track B — Token Wallet & Offer Gating Parity
- iOS wallet reads must use canonical utility wallet summary callable.
- Enforce unlock-before-claim behavior for token-priced offers.
- Add reject/release semantics parity (safe no-op for stale queue race).
- Add linked UID debug visibility in non-production debug panel.

### Track C — Feed, Queue, and Map Shell Reliability
- Ensure selected offer state persists across map/sheet interactions.
- Handle queue churn gracefully (offer removed/switch race).
- Confirm fallback messaging is actionable (not generic failure).

### Track D — Evidence, QA, and Release
- Simulator + physical-device smoke across `SMOKE_CHECKLIST.md` and `TESTFLIGHT_QA_CHECKLIST.md`.
- Capture logs/screenshots per BAT evidence rules.
- Run release gate checks before TestFlight/production promote.

## BAT-Style Work Plan (Ordered)

1. **BAT-IOS-001: Command Path Audit + Fixes**
   - Inventory iOS lifecycle mutations.
   - Route all lifecycle writes through callables.

2. **BAT-IOS-002: Token Wallet Source Unification**
   - Confirm iOS wallet UI reads canonical callable output.
   - Add fallback/retry and visible sync states.

3. **BAT-IOS-003: Offer Unlock/Reject Reliability**
   - Enforce token unlock requirement before claim.
   - Implement queue-race-safe reject behavior.

4. **BAT-IOS-004: Map Shell Lifecycle Stability**
   - Validate active/idle/online state transitions and selected offer behavior.
   - Ensure no state desync on navigation/background/foreground.

5. **BAT-IOS-005: Proof Capture + Completion Reliability**
   - Validate pickup/dropoff proof capture and upload paths.
   - Ensure completion guards and error recovery are deterministic.

6. **BAT-IOS-006: Release Gate + Rollback Readiness**
   - Complete smoke + checklist evidence.
   - Prepare rollback toggles / known-good baseline reference.

## Acceptance Criteria

- All lifecycle transitions are callable-driven and contract-valid.
- Token balance and eligibility in iOS matches admin ledger for same UID.
- Reject/unlock flows do not dead-end courier due to offer queue races.
- Smoke checklist pass recorded for simulator + at least one physical device lane.
- Release readiness documented with explicit rollback path.

## Evidence Requirements

For each BAT:
- Changed files list.
- Command/test output.
- Manual smoke outcome.
- Screenshots/log snippets for critical flows.

## Next Action

Start BAT-IOS-001 in `apps/courieriosnativeclean` and open a paired execution log doc for daily evidence capture.

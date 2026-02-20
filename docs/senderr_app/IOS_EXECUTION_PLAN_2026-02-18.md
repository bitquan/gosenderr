# Senderr iOS Execution Plan (System-Aligned)

Date: 2026-02-18

## Canonical System Inputs

- `SYSTEMS/SENDERR_IOS_SYSTEM.md`
- `SYSTEMS/BACKEND_FUNCTIONS_SYSTEM.md`
- `SYSTEMS/SHARED_CONTRACTS_SYSTEM.md`
- `SYSTEMS/PAYMENT_TOKEN_SYSTEM.md`
- `SYSTEMS/RELEASE_GOVERNANCE_SYSTEM.md`

## Goal

Deliver Senderr iOS parity with the command-driven backend and shared contracts, using the existing iOS app stack and existing QA docs/checklists as the execution baseline.

## Non-Negotiable Rules

1. Command-driven transitions only (no direct protected status mutation from iOS UI paths).
2. Shared contracts first, app implementation second.
3. One BAT wave at a time with evidence per BAT.
4. Release gate must pass before TestFlight promotion.

## Reuse-First Asset Map (What We Already Have)

Implementation base:
- `apps/courieriosnativeclean`

Current parity/tracking docs:
- `COURIER_SPEC_IMPLEMENTATION_CHECKLIST.md`
- `COURIER_EXPERIENCE_SPEC.md`
- `docs/senderr_app/MAP_SHELL_ACCEPTANCE_MATRIX.md`
- `docs/senderr_app/SMOKE_CHECKLIST.md`
- `docs/senderr_app/DEVICE_TEST_MATRIX.md`
- `docs/senderr_app/TESTFLIGHT_QA_CHECKLIST.md`

Governance/release controls:
- `BASELINE_CHANGE_WORKFLOW.md`
- `BASELINE_DRIFT_AUDIT_CHECKLIST.md`
- `LAUNCH_READINESS_DASHBOARD.md`

## Scope (This Wave)

In scope:
1. Courier auth/session reliability.
2. Feed and claim eligibility parity.
3. Lifecycle progression parity (`accept -> enroute_pickup -> arrived_pickup -> picked_up -> enroute_dropoff -> arrived_dropoff -> completed`).
4. Payment lock and proof capture enforcement.
5. Settings/profile parity needed for operational readiness.

Out of scope:
- New feature families unrelated to lifecycle reliability.
- Design-only refresh work.
- New role models beyond existing courier system boundaries.

## Execution Tracks

### Track A — Contract and Lifecycle Command Parity

- Audit all iOS lifecycle action entrypoints.
- Confirm each protected transition goes through callable command pathways.
- Remove or hard-guard any direct write path that can mutate protected lifecycle state.
- Verify status vocabulary exactly matches shared contracts.

### Track B — Feed, Eligibility, and Token Policy Parity

- Align open/offered/assigned feed behavior with source rules.
- Validate eligibility gates: mode, radius, status, rate card, capability/equipment checks.
- Ensure token wallet reads use canonical callable summary and UI reflects unlock requirements.

### Track C — Map Shell and Active Job Reliability

- Stabilize selected-offer behavior through queue churn and screen transitions.
- Validate panel state behavior against map-shell acceptance matrix.
- Keep one primary CTA visible/accurate with reliable unlock on async failure.

### Track D — Proof, Completion, and Recovery

- Enforce pickup/dropoff proof requirements and payload persistence.
- Validate payment authorization lock behavior.
- Add deterministic recovery UX for upload/action failures.

### Track E — Release Evidence and Gate

- Run simulator and physical-device smoke lanes.
- Capture artifacts per BAT: logs, screenshots, and command outputs.
- Complete release gate and rollback readiness before TestFlight promote.

## Ordered BAT Plan

1. **BAT-IOS-001: Lifecycle Command Audit and Closure**
   - Output: action-path inventory + direct-write closure PR.

2. **BAT-IOS-002: Feed and Eligibility Contract Parity**
   - Output: verified query/eligibility behavior with evidence.

3. **BAT-IOS-003: Token Wallet and Unlock Gating Reliability**
   - Output: canonical wallet-source parity + unlock/reject resilience.

4. **BAT-IOS-004: Map Shell Action Stability**
   - Output: no CTA lock/desync across state transitions and queue updates.

5. **BAT-IOS-005: Proof + Completion Guard Enforcement**
   - Output: required proof + payment lock behavior validated end-to-end.

6. **BAT-IOS-006: Release Gate and Rollback Readiness**
   - Output: full evidence pack + launch/rollback signoff.

## Definition of Done (Wave)

- Lifecycle transitions are callable-driven and contract-valid.
- Eligibility and token unlock behavior in iOS matches backend/admin reality for same UID.
- Proof and payment locks are enforced without dead-end UX.
- Smoke checklists pass on simulator plus at least one physical device lane.
- Release gate artifacts are complete and linked in launch docs.

## Evidence Template (Per BAT)

For each BAT capture:
1. Changed files.
2. Automated test output.
3. Manual smoke results.
4. Screenshots/log evidence.
5. Known risks and rollback note.

## Immediate Next Steps

1. Start BAT-IOS-001 in `apps/courieriosnativeclean`.
2. Open/update a daily execution log in `docs/senderr_app` for BAT-IOS-001 evidence.
3. Run branch save/checkpoint after each BAT with conventional commit summaries.

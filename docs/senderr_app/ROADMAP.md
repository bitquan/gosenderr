# Senderr iOS Roadmap

Last updated: 2026-02-07
Source: GitHub issues with label `scope:courier`

## Snapshot

- Total tracked courier iOS issues in current plan set (`#122`-`#150`, `#161`, `#165`): `31`
- Done: `16`
- Remaining: `15`
- Completion: `51.6%`

## In Progress

- No active PR-review blockers in this issue set.

## Closeout Queue (Merged PR, Issue Still Open)

- `#149` iOS Senderr: Consolidate iOS build scripts
  - PR: `#169` (merged) https://github.com/bitquan/gosenderr/pull/169
  - Status: verify on current `senderr_app` head, then close issue
- `#148` iOS Senderr: API/client config cleanup for native target
  - PR: `#168` (merged) https://github.com/bitquan/gosenderr/pull/168
  - Status: close issue after final acceptance check
- `#130` iOS Senderr: Add build-time env config (dev/staging/prod)
  - PR: `#164` (merged) https://github.com/bitquan/gosenderr/pull/164
  - Status: close issue after env profile verification pass

## Next Up (Priority Order)

1. `#149` iOS build scripts closeout (post-merge validation + issue close)
2. `#130` Env config closeout verification + issue close
3. `#126` Document build fixes in app README (closeout pass)
4. `#139` Smoke test checklist + CI script
5. `#140` Device testing matrix (iPhone 12-15, iOS 16-17)
6. `#141` TestFlight build + internal QA checklist
7. `#142` Native dependency audit for iOS 16 compatibility

## Feature Backlog (P2/P3)

- `#137` Push notifications setup + local testing
- `#138` Unit tests for critical screens
- `#143` Mapbox/Maps integration validation
- `#145` Offline mode for active job flow
- `#146` Crash/analytics integration
- `#147` Release checklist + App Store metadata
- `#128` Update icons + launch screen

## Done (Key Milestones)

- `#122` gRPC/BoringSSL iOS build failure fix
- `#123` Pod install + clean build workflow stabilization
- `#124` Header search/modulemap alignment
- `#125` Debug + Release build verification
- `#127` App identity renamed to Senderr
- `#129` Bundle IDs + provisioning verified
- `#131` Base navigation structure confirmed
- `#132` Base screen scaffolds implemented
- `#134` Auth integration
- `#135` Jobs list + detail read
- `#136` Job status updates + actions
- `#144` Location permissions + tracking
- `#150` MVP acceptance criteria
- `#161` Canonical iOS cleanup (single active app path)
- `#165` Storage hardening + regression tests

## Working Rule

- Keep all native work in `apps/courieriosnativeclean` only.
- Open PRs against `senderr_app` with one issue-focused change set per PR.

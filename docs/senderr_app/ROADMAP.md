# Senderr iOS Roadmap

Last updated: 2026-02-07  
Source: GitHub issues labeled `scope:courier`

## Snapshot

- Total `scope:courier` issues: `34`
- Closed: `25`
- Open: `9`
- Completion: `73.5%`

## Active Queue (Open)

P1:

1. `#182` docs(senderr-ios): refresh roadmap from live issue state and define update cadence

P2:

1. `#128` iOS Senderr: Update icons + launch screen
2. `#137` iOS Senderr: Push notifications setup + local testing
3. `#138` iOS Senderr: Add unit tests for critical screens
4. `#141` iOS Senderr: TestFlight build + internal QA checklist
5. `#143` iOS Senderr: Mapbox/Maps integration validation
6. `#145` iOS Senderr: Offline mode for active job flow
7. `#146` iOS Senderr: Crash/analytics integration

P3:

1. `#147` iOS Senderr: Release checklist + App Store metadata

## Recently Completed (Most Recent)

- `#126` iOS Senderr: Document build fixes in app README
- `#142` iOS Senderr: Audit native dependencies for iOS 16 compatibility
- `#139` iOS Senderr: Add smoke test checklist + CI script
- `#140` iOS Senderr: Device testing matrix (iPhone 12-15, iOS 16-17)
- `#149` iOS Senderr: Consolidate iOS build scripts
- `#130` iOS Senderr: Add build-time env config (dev/staging/prod)
- `#148` iOS Senderr: API/client config cleanup for native target
- `#133` iOS Senderr: Wire base flows to mock data
- `#165` Storage hardening: tighten Firebase Storage rules + regression tests
- `#161` iOS Senderr: Remove legacy duplicate iOS project folders

## Working Rules

- Keep native app work in `apps/courieriosnativeclean` only.
- Use one issue-focused branch and PR per change set.
- Target branch for this stream is `senderr_app`.

## Update Cadence (Required)

Update this roadmap:

1. On every merged PR that closes a `scope:courier` issue.
2. During weekly maintenance sweep (Friday).
3. Before milestone reviews or release planning.

Update process:

1. Pull live issue status from GitHub labels (`scope:courier`).
2. Remove any closed issue from active queue immediately.
3. Recompute snapshot totals (total/closed/open/completion).
4. Commit roadmap refresh in the same PR when issue state changes.

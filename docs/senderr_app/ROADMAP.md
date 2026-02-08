# Senderr iOS Roadmap

Last updated: 2026-02-08  
Source: GitHub issues labeled `scope:courier`

## Snapshot

- Total `scope:courier` issues: `44`
- Closed: `36`
- Open: `8`
- Completion: `81.8%`

## Active Queue (Open)

P1:

1. `#201` iOS Senderr: MVP feature completion + upgradeability epic

P2:

1. `#128` iOS Senderr: Update icons + launch screen
2. `#137` iOS Senderr: Push notifications setup + local testing
3. `#138` iOS Senderr: Add unit tests for critical screens
4. `#141` iOS Senderr: TestFlight build + internal QA checklist
5. `#146` iOS Senderr: Crash/analytics integration
6. `#210` iOS Senderr: add integration test harness for critical workflows

P3:

1. `#147` iOS Senderr: Release checklist + App Store metadata

## Recently Completed (Most Recent)

- `#209` iOS Senderr: close UX state gaps for reliability feedback
- `#208` iOS Senderr: feature flags and remote config for safe rollout
- `#206` iOS Senderr: implement real courier profile and settings persistence
- `#205` iOS Senderr: job transition command pipeline and conflict handling
- `#204` iOS Senderr: location tracking upload pipeline hardening
- `#203` iOS Senderr: real-time jobs sync with reconnect resilience
- `#145` iOS Senderr: Offline mode for active job flow
- `#143` iOS Senderr: Mapbox/Maps integration validation
- `#207` iOS Senderr: adopt upgrade-safe ports/adapters architecture
- `#202` iOS Senderr: enforce real auth path and gate mock mode
- `#182` docs(senderr-ios): refresh roadmap from live issue state and define update cadence
- `#165` Storage hardening: tighten Firebase Storage rules + regression tests
- `#161` iOS Senderr: Remove legacy duplicate iOS project folders
- `#150` iOS Senderr: Define MVP acceptance criteria
- `#149` iOS Senderr: Consolidate iOS build scripts

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

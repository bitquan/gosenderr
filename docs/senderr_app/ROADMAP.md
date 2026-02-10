# Senderr iOS Roadmap

Last updated: 2026-02-10  
Source: GitHub issues labeled `scope:courier`

## Snapshot

- Total `scope:courier` issues: `30`
- Closed: `24`
- Open: `6`
- Completion: `80.0%`

## Active Queue (Open)

- `#279` docs(senderr): add acceptance matrix entries for background tracking
- `#278` chore(senderr): add telemetry + retries tuning for location uploader
- `#270` test+docs(senderr_app): acceptance matrix and rollout gates for native MapShell
- `#269` feat(senderr_app): earnings + payouts overlays in MapShell
- `#268` feat(senderr_app): production-ready job notifications (APNs/FCM)
- `#267` feat(senderr_app): enforce pickup/dropoff proof with geo-validation

## Recently Completed (Most Recent)

- `#201` iOS Senderr: MVP feature completion + upgradeability epic
- `#147` iOS Senderr: Release checklist + App Store metadata
- `#128` iOS Senderr: Update icons + launch screen
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

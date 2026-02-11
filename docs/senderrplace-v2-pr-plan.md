# Senderrplace v2 Implementation PR Plan

## Objective
Produce a single implementation PR that bundles every Senderrplace v2 deliverable (docs, hosting/config, and UI rebrand) so we stay on track without breaking the work into multiple branches. That PR will be the nexus for the feature-backing issue(s), the domain-contract updates, and the hosting/feature-flag rollout.

## Target Issues to Link
1. `codex/issue-235-senderrplace-v2-domain-contract` — covers the Senderrplace v2 domain contract, Firestore functions, and the broader architecture we’re building on.
2. `issue-235` and any follow-on epics (e.g., marketplace rebrand, hosting swap, lifecycle alignment) — list the internal issue IDs once they exist and add them to the PR description/comments so reviewers see the full scope.

## PR Contents
- **Docs**: `docs/senderrplace-v2-plan.md`, `docs/senderrplace-v2-feature-matrix.md`, `docs/senderrplace-v2-hosting.md`, and the canonical `docs/LIFECYCLE_MILESTONES.md` copy, which together describe scope, timelines, hosting, feature flags, and lifecycle constraints.
- **UI/UX**: Rebranded hero, CTA, featured merchant slot, navbar text, seller flows, and breadcrumb language that now read “Senderrplace”. Later iterations will expand to checkout, metadata, listing copy, and booking-link UI that refer to the new brand.
- **Config/ops**: Any Firebase hosting target adjustments (once approved), feature flag toggles, DNS alias notes, and Stripe metadata updates captured in the hosting doc.
- **Testing/QA**: Outline manual/automated checks (smoke across browse/buy/sell/messaging/rating flows) referenced in the plan so QA can sign off before the feature flag flips.

## PR Description Template
```
## Overview
- Rebrand the marketplace experience to Senderrplace (hero, nav, seller flow, breadcrumbs, copy).
- Add Senderrplace v2 planning docs and hosting/flag checklist so ops, design, and QA share a single source of truth.
- Include the canonical lifecycle milestone reference so backend and frontend teams follow the same vocabulary.

## Issues
- codex/issue-235-senderrplace-v2-domain-contract
- [list other relevant issue IDs once created]

## Testing
- pnpm --filter @gosenderr/marketplace-app build
- Manual QA: browse items, seller listing creation, checkout, and messaging flow under Senderrplace copy.
```

## Next Steps
1. Continue rebranding screens and capturing any new configuration adjustments in this worktree.
2. When everything is ready, open the implementation PR from `codex/senderrplace-local` to `origin/codex/issue-235-senderrplace-v2-domain-contract` and paste the template above, filling in the final issue list and test results.

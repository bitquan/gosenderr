# Senderrplace v2: Marketplace Replacement Plan

**Goal**
- Deliver a replacement for the current Marketplace experience under the Senderrplace v2 vision by the end of today (February 10, 2026). This plan focuses on aligning features, data flows, and deployment paths so we can execute and iterate rapidly.

## Current Baseline
- `apps/marketplace-app` currently hosts the Marketplace web experience (browsing, buy/sell flows, chat, ratings, etc.). Docs in `docs/project-plan/04-PHASE-2-MARKETPLACE.md` and `docs/project-plan/02-USER-ROLES-AND-FLOWS.md` capture requirements that must be preserved or improved.
- Unified user model (buyers + sellers, feature-flagged) is already defined in those docs. These flows are the foundation for Senderrplace v2.
- `LIFECYCLE_MILESTONES.md` is tracked outside this worktree but will be treated as authoritative for milestone planning once merged.

## Replacement Scope for Today
1. **Feature Mapping**: Capture Marketplace capabilities vs Senderrplace differentiators (browse, listings, checkouts, messaging, ratings, profile, reporting, operations). Identify gaps we must close for parity.
2. **Architecture Adjustments**: Decide where Senderrplace branding + flows live (likely in `apps/senderrplace-app` or rebranded `marketplace-app`), how we surface the domain (urls, hosting), and how to signal role changes (feature flags, configs).
3. **Data & Backend Readiness**: Ensure Firestore collections, Stripe checkout functions, and order flows used by Senderrplace align with marketplace assumptions (e.g., `orders`, `listings`, `messages`, `ratings`).
4. **Front-end Story**: Outline navigation, pages, and reusable components to show how Senderrplace home, buyer/seller dashboards, and detail screens map to current marketplace views.
5. **Operational Steps**: List what needs to land today (feature flag creation, hosting alias updates, docs, QA artifacts).

## Deliverables
| Item | Owner | Notes |
| --- | --- | --- |
| Senderrplace v2 planning doc | Myself | This file (docs/senderrplace-v2-plan.md) captures the architecture, schedule, and prioritization.
| Feature matrix | Myself | Merge map of current marketplace + Senderrplace-specific improvements.
| Environment checklist | Myself | Detail what must be toggled/redirected in Firebase, hosting, Stripe, etc., to retire marketplace domain.
| Lightweight roadmap slides (if needed) | TBD | Use existing docs/README sections as quick reference in the docs folder.

## Today’s Schedule (Feb 10, 2026)
1. **Now — 12:00 PM PST:** Finalize feature matrix and identify critical gaps (buy/sell flows, messaging, checkout, rewards) so we know what to replace.
2. **12:00 — 15:00 PST:** Draft Senderrplace architecture: decide entry points, hosting targets (web + potential native), and update config (feature flags, domain names, Firebase hosting rewrites).
3. **15:00 — 17:00 PST:** Define implementation tasks (code changes, API updates, docs, tests). Start wiring up the new app shell/branding and migrate marketplace routes.
4. **17:00 — 18:00 PST:** QA checklist, update README/ROADMAP to point to Senderrplace, and prepare any handoff notes for tomorrow.

## Key Risks & Mitigations
- **Dependency on `LIFECYCLE_MILESTONES.md`**: File currently untracked; copy from `/Users/papadev/dev/apps/Gosenderr_local/gosenderr/docs/senderr_app` once ready and confirm milestones align.
- **Feature-flagged functionality**: Need to keep `marketplace_v2` and subflags intact while reusing them for Senderrplace brand; ensure release config doesn’t expose old domain until ready.
- **Hosting & redirect changes**: Coordinate with Firebase Hosting config to repoint `gosenderr-marketplace` to Senderrplace once parity achieved.

## Next Steps (Immediate)
1. Document current marketplace features in a matrix alongside Senderrplace differentiators (category: browse, buy, sell, messaging, ratings, profile, admin) and confirm any missing pieces.
2. Outline the Senderrplace entry point and app shell: rebrand `apps/marketplace-app`, or create a Senderrplace wrapper with shared components for reuse.
3. Update docs/README to describe the new timeline and deployment expectations for Senderrplace v2.
4. Track progress in this branch; mark TODOs in code/docs so others can contribute tonight.

Let me know if you want me to start coding any of these steps (e.g., rebranding components, adjusting routes, or creating new deployment aliases) once the plan looks good.

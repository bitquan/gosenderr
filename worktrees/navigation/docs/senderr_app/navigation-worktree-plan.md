# Navigation Worktree Plan

Goal: Provide a single-navigation strategy and shared APIs across the Senderr web app and Courier native app that supports job lifecycle navigation, deep links, and analytics.

Scope & Objectives

- Create a Navigation Worktree for focused work (branch: `senderr-app/feature/navigation`).
- Implement shared route definitions and helpers in `apps/senderr-app/src/navigation`.
- Implement a native navigation abstraction in `apps/courieriosnativeclean/src/navigation` that aligns with web helpers.
- Add tests and docs. Add Storybook stories for routing UI states (later).
- Add CI checks: unit tests for navigation helpers.

Work items (prioritized)

1. Scaffold routing helpers & typed route list for web (`routes.ts`, `index.ts`).
2. Create native navigation abstraction with typed route names and helpers.
3. Wire navigation to job lifecycle events: when a job is accepted navigate to `navigation/active` route.
4. Deep linking & URL helpers for web & native (open job detail by link).
5. Add Playwright tests for web navigation flows (accept -> active -> job detail).
6. Add unit tests & small e2e for native navigation flows.
7. Document how to create new feature branches and keep them in sync (branch-docs).

Syncing & Branch policy

- Each feature gets a dedicated worktree & branch (e.g., `senderr-app/feature/navigation`).
- Worktree branches must only be used for the scoped feature and should be rebased onto main baseline when the baseline changes.
- When the Navigation branch is merged and becomes new baseline, other feature branches should rebase on it.

Acceptance Criteria

- `apps/senderr-app` has typed route helpers and unit tests.
- `apps/courieriosnativeclean` has a navigation abstraction that compiles and has basic unit tests.
- Docs file present describing worktree plan and sync policy.

Verification

- Run unit tests (`pnpm -w test --filter senderr-app`) and ensure new tests pass.
- Manual check: accept a job and confirm navigation to `navigation/active` page in web (and native if wired).

---

Next step: implement the web route helpers and a small integration test.

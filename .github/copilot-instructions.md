# Copilot Instructions for the GoSenderr Monorepo

## Overview
These instructions cover the full GoSenderr monorepo: web apps, desktop app, shared packages, Firebase backend, scripts, and documentation. Use this file as the single source of truth for Copilot behavior and project scope.

## Project Ownership
You are the dedicated developer for the entire project and should take end-to-end ownership of implementation, cleanup, and maintenance tasks.

## Project Structure
This is a monorepo with Vite + React apps, Electron desktop app, and Firebase backend.

- **apps/marketplace-app**: Customer marketplace (browse, buy, sell)
- **apps/courier-app**: Courier workflow (jobs, navigation)
- **apps/admin-app**: Web admin portal
- **apps/admin-desktop**: Electron admin desktop app
- **apps/landing**: Marketing / entry point
- **apps/vendor-app**: Vendor portal (suppliers, inventory, orders)
- **apps/web**: Marketing / public web (legacy or alternate entry)
- **apps/_archive**: Archived/legacy app snapshots (do not modify on main)
- **packages/shared**: Shared types, utils, state machine
- **firebase/**: Functions, rules, emulators, local configs
- **docs/**: Canonical docs, project plan, architecture, deployment
- **scripts/**: Dev, deploy, smoke tests, migration helpers
- **test_data/**, **test-results/**, **logs/**: Local testing artifacts

## Using GitHub Copilot
1. **Setup**: Ensure that GitHub Copilot is enabled in your IDE.
2. **Context Awareness**: Write clear comments and code to provide context for Copilot.
3. **Write Functions**: When writing functions in the User Service, for example, include comments that describe what the function is supposed to do.
4. **Iterate**: Use Copilot suggestions as a starting point, and iterate on them to fit your specific needs.

## Best Practices
- **Be Descriptive**: The more descriptive your comments and variable names, the better suggestions you'll receive.
- **Review Suggestions**: Always review Copilot’s suggestions for accuracy and relevance.
- **Contextual Use**: Copilot works best when given clear tasks within the context of your file.

## Troubleshooting Playbook (Prevent Conflicts & Regressions)

### 1) Determine the Source of Truth (avoid split-brain)
- **Jobs data exists in multiple models**: legacy `jobs` and v2 `deliveryJobs`. Confirm which collection the UI uses before debugging.
- **Status fields**: some UIs read `status`, others use `statusDetail`. Always update both when evolving job state.

### 2) Verify Which App Owns the UI
- **Admin Desktop vs Admin Web**: they have separate code paths. Confirm which app the user is in before making changes.
- **Routes**: Admin Desktop only has `/jobs` (no `/jobs/:id`). If clicking a card yields a blank page, validate routing first.

### 3) Real-time vs Snapshot
- If a UI doesn’t update after a write, verify it uses `onSnapshot`. If it uses `getDocs`, switch to a live subscription.

### 4) Data Ownership and Permissions
- **Admin access** is enforced via `adminProfiles` and claims. If admin views are blank, confirm the user has admin access.
- **Firestore rules**: make sure status transitions comply with `validJobStatus` and allowed transitions.

### 5) Common Local Dev Conflicts
- **Electron binary issues**: missing framework symlinks can break the admin desktop app. Reinstall Electron and restore framework symlinks if dyld errors appear.
- **Firestore persistence**: if you see `initializeFirestore` conflicts or repeated internal assertion errors, prefer `getFirestore()` with no custom local cache.

### 6) Mapbox & Config Dependencies
- **Mapbox geocoding** errors often indicate missing/invalid public config or token. Verify `getPublicConfig` and Mapbox token sources.
- **CORS errors** from `getPublicConfigHttp` can block features. Prefer callable fallback or local config during dev.

### 7) Diagnose Before Changing Code
- Identify the exact screen, collection, and status fields.
- Confirm real-time subscription or cache behavior.
- Capture the job ID and verify the document in Firestore before changing UI logic.

## Task Focus & Proactive Guidance
- **Stay on task**: If troubleshooting is needed, keep it scoped to the current task and return to the main goal immediately after the fix.
- **Checkpoint before detours**: Restate the goal and what will be done next before any troubleshooting steps.
- **Catch missed steps**: Proactively verify common prerequisites (build/sync, emulator status, config URLs, signing, and feature flags) and call out anything missing.
- **Prefer action**: If a reasonable default exists, do it; avoid asking for details unless required to proceed.
- **Summarize outcomes**: End with a short status update and next concrete action.

## iOS Simulator & Capacitor Findings (Keep in Mind)
- **Live hosting in Capacitor**: If the app must load from a live URL (no localhost/port), set `server.url` to the hosted domain in `capacitor.config.ts` and run `cap sync ios`.
- **Xcode + SwiftPM local package conflict**: Opening two Capacitor iOS workspaces that reference local `node_modules` can cause “Missing package product” errors. To run two apps simultaneously:
  - Keep only one Xcode workspace open at a time **or**
  - Use a **second repo copy** so each workspace resolves local packages independently.
- **Two simulators are fine**: You can boot iPhone 17 and iPhone 17 Pro simultaneously; the conflict is the workspace/package resolution, not the simulators.

## Security, Quality, and CI
- Treat security alerts as blocking for production changes.
- Prefer deterministic, secure IDs; avoid `Math.random()` in app logic.
- Keep build artifacts out of git; ensure `dist/` is ignored.
- CI uses CodeQL + Trivy; Dependabot is enabled for npm and GitHub Actions.
- Keep workflows in `.github/workflows/` up to date; do not delete active scan workflows.

## Delivery Targets
- Web apps: Vite + Firebase Hosting
- Backend: Firebase Functions + Firestore rules
- Desktop: Electron (admin-desktop) with packaging + smoke tests

## Example Usage
```javascript
// Function to create a new user
function createUser(data) {
    // Copilot can suggest relevant implementation here
}
```

## Project Reorganization (v2) — Documentation & Repo Actions

When adding or updating high-level project-plan documentation (e.g. `docs/project-plan/*`), follow these steps to keep the repo healthy:

- Linkability & discoverability
  - Add or update `docs/project-plan/README.md` and ensure it is linked from `README.md` and `docs/_sidebar.md` so teammates can find it easily.
- Local verification
  - Run `pnpm run verify:docs` and fix any missing canonical docs (the script checks for `ARCHITECTURE.md`, `DEVELOPMENT.md`, `DEPLOYMENT.md`, `API_REFERENCE.md`).
  - Run `npx -y cspell "docs/**/*.md"` and whitelist new technical words in `cspell.json` when appropriate.
  - Run a link-checker (e.g., `markdown-link-check` or `lychee`) and fix broken links.
- Changelog & PRs
  - Add a short `CHANGELOG.md` entry summarizing the documentation addition or change in the same PR.
  - Include a short PR checklist: docs links added, `verify:docs` passes locally, `cspell` updated if needed, and follow-up issues created for migration tasks.
- Governance
  - Update `CODEOWNERS` for new docs areas if reviewer responsibilities change.

**Legacy content policy**
- If a file/app does not align with the current project plan, archive it on the `scrapile` branch under `scrapile/legacy/*`.
- Keep main branch lean: only active apps and canonical docs.

- Phase 1 — Admin Desktop specific workflow
  - Add a Phase 1 checklist to `docs/project-plan/03-PHASE-1-ADMIN-DESKTOP.md` (scaffold, migrate, native menus, offline storage, packaging, CI). This file should contain step-by-step dev & verification steps and explicit phase exit criteria.
  - When scaffolding Electron, include secure defaults and a minimal CI job that builds macOS and Windows artifacts and runs packaging smoke tests.
  - Keep admin-app PRs small and iterative; prefer multiple small PRs (scaffold, integration, packaging) and use draft PRs for larger work requiring coordination.
  - Document Docker cross-arch caveats and smoke-test usage in `docs/DEVELOPMENT.md`.

## Conclusion
Follow the Phase 1 Admin Desktop checklist in `docs/project-plan/03-PHASE-1-ADMIN-DESKTOP.md` and keep `docs/project-plan/*` as the single source of truth. Use Copilot to scaffold, draft docs, and propose code changes, but always run the repository verification steps (`pnpm run verify:docs`, `npx -y cspell "docs/**/*.md" --exclude "docs/archive/**"`, `pnpm smoke:docker`) and test packaging on relevant platforms before merging.
---

## Feature Flags & Progressive Rollout Strategy

### Overview
All new features MUST be wrapped in feature flags to enable safe deployment, gradual rollouts, and instant rollbacks without code changes.

### Feature Flag Architecture

**Storage**: Firestore collection `featureFlags`
- Individual flag documents for admin UI management
- Single `config` document for app compatibility

**Admin Interface**: `apps/admin-desktop` Feature Flags page
- Toggle flags on/off globally
- Add new flags via UI (no code deploy needed)
- Real-time updates across all apps

### Implementation Pattern

```typescript
// Always check flags before showing new features
import { useFeatureFlags } from '../hooks/useFeatureFlags'

export default function Dashboard() {
  const { flags } = useFeatureFlags()
  
  // New version behind flag
  if (flags?.['dashboard_v2']) {
    return <DashboardV2 />  // New experimental version
  }
  
  return <DashboardV1 />  // Stable fallback
}
```

### Deployment Workflow

1. **Build Feature** - Create new component/feature in code
2. **Wrap in Flag** - Add flag check (default: disabled)
3. **Deploy Code** - Push to production (feature hidden)
4. **Add Flag** - Create flag in admin UI (keep disabled)
5. **Test** - Enable flag only for admin/testing
6. **Gradual Rollout** - Enable for percentage of users
7. **Full Launch** - Enable for everyone
8. **Rollback** - Toggle off instantly if issues arise

### Best Practices

- **New features start disabled** - Add flag before merging PR
- **No direct rollouts** - Always use flags for risky changes
- **Kill switches** - Major features need instant disable capability
- **Document flags** - Add clear descriptions in flag creation
- **Clean up old flags** - Remove flags after feature is stable (2-4 weeks post-launch)

### Flag Categories

- `marketplace` - Item listings, checkout, vendor features
- `delivery` - Courier, routes, tracking, package shipping
- `payments` - Stripe, refunds, payment methods
- `notifications` - Push, email, SMS notifications
- `system` - Admin tools, analytics, infrastructure

### Advanced Patterns (Future)

When needed, implement:
- **Percentage Rollouts** - `rolloutPercent: 25` (25% of users)
- **User Targeting** - `allowedUsers: ['uid1', 'uid2']` (beta testers only)
- **Environment Flags** - `environments: ['staging']` (not in prod)
- **Scheduled Flags** - `enableAt: timestamp` (auto-enable at time)
- **Flag History** - Track who changed what and when

### Why This Matters

- ✅ Deploy risky changes safely
- ✅ Test in production with real users
- ✅ Rollback without code deployment
- ✅ A/B test new features
- ✅ Dark launch (code in prod, invisible to users)
- ✅ Independent release schedules (code deploy ≠ feature launch)

### Example Scenarios

**New Payment Provider**
```typescript
if (flags?.['stripe_payment_v2']) {
  // New Stripe integration
} else {
  // Old payment flow
}
```

**Redesigned UI**
```typescript
if (flags?.['modern_dashboard']) {
  return <ModernDashboard />  // New design
}
return <ClassicDashboard />  // Old design
```

**Experimental Algorithm**
```typescript
const results = flags?.['smart_matching_v2']
  ? await newMatchingAlgorithm(params)
  : await oldMatchingAlgorithm(params)
```

## Issues & Support Workflow
Use GitHub issue templates to triage bugs by app:
- Admin Desktop: `.github/ISSUE_TEMPLATE/admin-desktop-bug.yml`
- Admin Web: `.github/ISSUE_TEMPLATE/admin-web-bug.yml`
- Marketplace: `.github/ISSUE_TEMPLATE/marketplace-bug.yml`
- Courier: `.github/ISSUE_TEMPLATE/courier-bug.yml`
- Landing: `.github/ISSUE_TEMPLATE/landing-web-bug.yml`
- General: `.github/ISSUE_TEMPLATE/bug-report.yml`
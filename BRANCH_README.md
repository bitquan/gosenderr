# Feature Branch: Issue #33 - Vite Migration

## Status: 🚧 In Progress

This branch is for migrating from Next.js to Vite as documented in `docs/VITE_MIGRATION_PLAN.md`.

## What We're Doing

**Why:** Next.js + Firebase Hosting has deployment issues (3+ hours debugging):
- Firebase Frameworks integration is "early preview" with breaking changes
- Monorepo lockfile conflicts (pnpm vs npm)
- SWC dependency patching errors
- 5-10 minute deploy times when it works

**Solution:** Migrate to Vite for:
- ⚡ 10x faster builds (30s vs 5-10min)
- 🎯 Simple deployment (static hosting)
- 🔧 Better monorepo support
- 📦 95% of code already portable (validated in WEB_APP_FEATURES.md)

## Migration Strategy

### Phase 1: Customer Portal (Week 1) - ✅ STARTED
- [x] Create `apps/marketplace-app` with Vite + React
- [x] Set up routing with react-router-dom
- [ ] Copy customer pages from `apps/web/src/app/customer`
- [ ] Test customer flows
- [ ] Deploy to Firebase Hosting
- [ ] Update DNS/routing

### Phase 2-4: Other Portals (Weeks 2-4)
- Senderr/Courier portal
- Admin portal  
- Runner portal
- Vendor portal

## Current Setup

### New Structure
```
apps/
  marketplace-app/          # NEW: Vite + React for marketplace portal
    src/
      pages/            # Customer pages (dashboard, request-delivery, jobs, checkout)
      components/       # Reusable UI components
      hooks/            # Custom React hooks
      contexts/         # Auth, state management
      lib/              # Firebase, utilities
  web/                  # OLD: Next.js (will be deprecated)
```

### Commands

```bash
# Dev server (customer app)
pnpm --filter @gosenderr/marketplace-app dev

# Build
pnpm --filter @gosenderr/marketplace-app build

# Preview production build
pnpm --filter @gosenderr/marketplace-app preview
```

## Next Steps

1. Copy customer page components from `apps/web/src/app/customer/*`
2. Create necessary context providers (Auth, Stripe)
3. Set up Firebase config with Vite env variables
4. Test customer flows locally
5. Deploy to Firebase Hosting (should be ~30s!)

## References

- [VITE_MIGRATION_PLAN.md](../docs/VITE_MIGRATION_PLAN.md) - Full migration plan
- [WEB_APP_FEATURES.md](../docs/WEB_APP_FEATURES.md) - All 61 pages documented
- [FIREBASE_HOSTING_DEPLOY.md](../docs/FIREBASE_HOSTING_DEPLOY.md) - Deployment issues we encountered

## Branch Info

- **Branch:** `feature/issue-33-vite-migration`
- **Created:** Jan 23, 2026
- **Issue:** #33 - Fix web app hosting and start Vite migration

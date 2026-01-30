# Cleanup Audit - January 24, 2026
**Status:** Ready for deletion  
**Context:** Completed Vite migration for customer, courier, and runner apps

---

## 🗑️ Files to Delete

### 1. Old Dashboard Implementation
```bash
apps/courier-app/src/pages/dashboard/page-old.tsx
```
**Reason:** Replaced with mobile-first map shell layout. This is the old desktop-style 2-column layout.

---

## 📦 Apps/Directories Status

### ✅ Keep - Active Projects
- `apps/marketplace-app/` - ✅ **ACTIVE** - Vite React app with vendor marketplace
- `apps/courier-app/` - ✅ **ACTIVE** - Vite React app with map shell
- `apps/shifter-app/` - ✅ **ACTIVE** - Vite React app (runner/long-haul)
- `apps/admin-app/` - ✅ **ACTIVE** - Vite React app
- `apps/landing/` - ✅ **ACTIVE** - Role selection landing page

### ⚠️ Consider Deprecating - Legacy Next.js App
- `apps/web/` - **LEGACY** Next.js monolithic app
  - **Status:** All functionality migrated to Vite apps
  - **Size:** Large codebase with deprecated patterns
  - **Recommendation:** Archive or delete after final verification
  - **Dependencies:** May contain shared components not yet migrated

---

## 📚 Documentation to Update

### High Priority - Update References
These docs reference `apps/web` and need updating:

1. **README.md** (root)
   - Line 37-41: References `apps/web/.env.local`
   - Line 83: "Customer Web App (`apps/web`)"
   - Line 166-197: Web app setup instructions
   - **Action:** Update to reference new Vite apps

2. **docs/PROJECT_STATUS.md**
   - May reference old architecture
   - **Action:** Update current app status

3. **docs/VITE_MIGRATION_PLAN.md**
   - **Action:** Mark as complete, add summary of what was built

4. **docs/ROUTING.md**
   - May reference old Next.js routing
   - **Action:** Document new Vite routing for all apps

5. **docs/RUNNER_SYSTEM_CHECKLIST.md**
   - Lines 20, 78, 96, 284: References `apps/web/src/app/runner/*`
   - **Action:** Update to `apps/shifter-app/src/pages/*`

6. **docs/RUNNER_QUICK_WINS_SUMMARY.md**
   - Multiple references to `apps/web/src/app/runner/*`
   - **Action:** Update to shifter-app paths

7. **docs/CAPACITOR_SETUP.md**
   - Line 144: References `/apps/web/src/app/customer/*`
   - **Action:** Update to marketplace-app paths

### Medium Priority - Historical Reference
These docs are historical but still reference old code:

8. **MIGRATION_AUDIT.md**
   - Documents migration from Next.js → Vite
   - **Action:** Keep as-is (historical record)

9. **STRIPE_CLOUD_FUNCTIONS_DEPLOYED.md**
   - Lines 130-135: References deleting old API routes
   - **Action:** Keep as-is or mark deprecated sections

10. **apps/web/README.md**
    - **Action:** Add deprecation notice at top

11. **apps/web/PLAYWRIGHT_SETUP.md** & **apps/web/PLAYWRIGHT_GUIDE.md**
    - **Action:** Migrate or deprecate

---

## 🆕 Documentation to Create

### 1. APP_ARCHITECTURE.md
**Purpose:** Document new multi-app architecture

```markdown
# App Architecture (2026)

## Applications
- **Marketplace App** (`apps/marketplace-app`) - Port 5173
- **Courier App** (`apps/courier-app`) - Port 5174  
- **Shifter App** (`apps/shifter-app`) - Port 5175
- **Admin App** (`apps/admin-app`) - Port 5176
- **Landing** (`apps/landing`) - Role selection

## Hosting
- gosenderr-customer.web.app
- gosenderr-courier.web.app
- gosenderr-shifter.web.app
- gosenderr-admin.web.app
- gosenderr-6773f.web.app (landing)

## Tech Stack
- Vite 6.4.1
- React 18
- TypeScript
- Tailwind CSS
- Firebase SDK 11
- Mapbox GL
- Stripe
```

### 2. NAVIGATION_GUIDE.md
**Purpose:** Document bottom nav pattern used across apps

```markdown
# Navigation Guide

## Bottom Navigation Pattern
All apps use mobile-first bottom navigation:

### Customer App
- 🏠 Home → /dashboard
- 📋 Jobs → /jobs
- 🚚 Request → /marketplace
- ⚙️ Settings → /settings

### Courier App
- 🏠 Dashboard → /dashboard (map shell)
- 📦 Active → /jobs
- 💰 Earnings → /earnings
- ⚙️ Settings → /settings

### Shifter App
- 🏠 Home → /dashboard
- 🛣️ Routes → /available-routes
- 📦 Jobs → /jobs
- 💰 Earnings → /earnings
- ⚙️ Settings → /settings
```

### 3. MAP_SHELL_DESIGN.md
**Purpose:** Document map shell pattern for courier/runner

```markdown
# Map Shell Design Pattern

## Layout Structure
```
┌─────────────────────────┐
│ [Filter] 🗺️     [🟢]   │ ← Floating buttons
│                         │
│         MAP             │
│                         │
│─────────────────────────│
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │ ← Bottom sheet
│ Available Jobs (12)     │
│ [Job cards...]          │
└─────────────────────────┘
```

## Components
- Full-screen map (MapboxMap)
- Floating action buttons (top corners)
- Status indicators (top center)
- Swipeable bottom sheet
- Job cards with tap-to-select
```

---

## 🔄 Migration Status Summary

### ✅ Completed Migrations

#### Customer App (100%)
- All pages migrated from Next.js
- Vendor marketplace integrated
- Stripe payments via Cloud Functions
- Bottom navigation implemented
- Mobile-optimized layouts

#### Courier App (90%)
- Dashboard with map shell ✅
- Bottom navigation ✅
- Earnings page ✅
- Settings with sign out ✅
- Rate cards page ✅
- Equipment page ✅
- **Remaining:** Optimize job acceptance flow

#### Shifter App (85%)
- Bottom navigation ✅
- All pages exist ✅
- Settings with sign out ✅
- **Remaining:** Map shell for dashboard, optimize available routes view

#### Admin App (95%)
- All admin pages functional ✅
- User management ✅
- Feature flags ✅
- Bottom navigation ✅
- **Remaining:** Polish UI consistency

---

## 🎯 Recommended Actions

### Immediate (Do Now)
1. ✅ **Delete:** `apps/courier-app/src/pages/dashboard/page-old.tsx`
2. ✅ **Update:** Root README.md to reference new apps
3. ✅ **Create:** APP_ARCHITECTURE.md
4. ✅ **Add deprecation notice:** To `apps/web/README.md`

### Short-term (This Week)
5. ⏳ **Update:** All docs referencing `apps/web/*` paths
6. ⏳ **Create:** NAVIGATION_GUIDE.md
7. ⏳ **Create:** MAP_SHELL_DESIGN.md
8. ⏳ **Verify:** All functionality works in new apps
9. ⏳ **Test:** End-to-end flows for each role

### Medium-term (This Month)
10. ⏳ **Archive:** `apps/web/` to `archive/apps-web-nextjs/`
11. ⏳ **Update:** PROJECT_STATUS.md with current state
12. ⏳ **Create:** Deployment guide for all hosting sites
13. ⏳ **Review:** Remove unused Firebase functions
14. ⏳ **Cleanup:** Old docs in `docs/history/`

### Optional (Future)
15. 📋 Consider consolidating docs into wiki
16. 📋 Create testing strategy doc
17. 📋 Document component library patterns
18. 📋 Add Storybook for shared components

---

## 📊 Impact Analysis

### Disk Space Savings
- Deleting `page-old.tsx`: ~500 lines, ~15KB
- Archiving `apps/web/`: Potentially 50MB+ of dependencies

### Documentation Cleanup
- **Files to update:** 11 markdown files
- **Files to create:** 3 new guides
- **Time estimate:** 2-3 hours

### Risk Assessment
- **Low Risk:** Deleting `page-old.tsx` (already replaced)
- **Medium Risk:** Archiving `apps/web/` (ensure all code migrated)
- **No Risk:** Updating documentation

---

## ✅ Verification Checklist

Before deleting `apps/web/`:
- [ ] All marketplace features work in `apps/marketplace-app`
- [ ] All courier features work in `apps/courier-app`
- [ ] All runner features work in `apps/shifter-app`
- [ ] All admin features work in `apps/admin-app`
- [ ] Stripe payments functional
- [ ] Firebase auth working
- [ ] Mapbox maps displaying
- [ ] All hosting sites deployed
- [ ] End-to-end testing passed

---

## 🚀 Next Steps

1. Delete old dashboard file
2. Update root README
3. Create new architecture docs
4. Mark `apps/web` as deprecated
5. Schedule verification testing
6. Archive when ready

**Estimated Total Time:** 4-6 hours for complete cleanup and documentation update.

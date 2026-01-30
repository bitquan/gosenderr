# Courier & Runner Apps Audit Report
**Date:** January 24, 2026  
**Status:** 🔴 INCOMPLETE - Missing Map Shell Layout & Navigation

---

## 🎯 Executive Summary

Both **courier-app** and **shifter-app** (runner) are functionally incomplete compared to the marketplace-app design pattern. They lack:
- ✅ Map shell layout with floating UI elements
- ✅ Bottom navigation bar
- ✅ Proper page routing and wiring
- ✅ Mobile-optimized floating cards/sheets
- ✅ State-based UI (floating buttons, cards, modals)

---

## 📱 Customer App Reference (Gold Standard)

### ✅ What Customer App Has:
1. **Mobile-First Layout**
   - Bottom navigation bar with 4 tabs (Home, Jobs, Request, Settings)
   - Clean gradient backgrounds (#F8F9FF)
   - Floating cards with purple shadows
   - Proper padding-bottom (pb-24) for bottom nav clearance

2. **Components**
   - CustomerLayout with BottomNav
   - StatusBadge, Card, StatCard
   - MapboxMap component
   - AddressAutocomplete

3. **Pages (All Wired)**
   - Dashboard, Jobs, Job Detail, Request Delivery
   - Packages, Orders, Checkout, Settings
   - Marketplace (vendor items)
   - Profile, Payment Methods, Disputes

4. **Navigation Items**
   ```tsx
   { icon: "🏠", label: "Home", href: "/dashboard" }
   { icon: "📋", label: "Jobs", href: "/jobs" }
   { icon: "🚚", label: "Request", href: "/marketplace" }
   { icon: "⚙️", label: "Settings", href: "/settings" }
   ```

---

## 🚗 Courier App - Current State

### ❌ MISSING: Bottom Navigation
**Current:** No bottom nav bar - users can't navigate easily  
**Expected:** Bottom nav with 4-5 tabs:
- 🏠 Dashboard (map view with available jobs)
- 📦 Active Jobs
- 💰 Earnings
- ⚙️ Settings

### ❌ MISSING: Map Shell Layout
**Current:** Dashboard has inline map + job list (desktop layout)  
**Expected:** Mobile-first map shell:
- Full-screen map as base layer
- Floating cards/sheets overlaying map
- Bottom sheet for job list (swipeable)
- Floating action buttons (go online/offline, filters)
- Job detail modal/sheet on selection

### ⚠️ PARTIALLY COMPLETE: Pages
**Existing Routes:**
- ✅ `/dashboard` - Has map but wrong layout
- ✅ `/jobs/[jobId]` - Job detail page exists
- ✅ `/routes` - Routes page exists
- ✅ `/active-route` - Active route page exists
- ✅ `/settings` - Settings page with sign out
- ✅ `/rate-cards` - Rate card setup
- ✅ `/equipment` - Equipment submission
- ✅ `/setup` - Initial setup flow
- ✅ `/onboarding` - Onboarding flow
- ✅ `/onboarding/stripe` - Stripe Connect onboarding

**Missing:**
- ❌ Earnings/History page not in nav
- ❌ Profile page not accessible
- ❌ Support page exists but not in nav

### 🔧 Layout Issues
**Current CourierLayout.tsx:**
```tsx
return (
  <div className="min-h-screen bg-gray-50">
    {children}
  </div>
)
```

**Expected:**
```tsx
return (
  <div className="min-h-screen bg-[#F8F9FF]">
    <div className="pb-24">
      {children}
    </div>
    <BottomNav items={courierNavItems} />
  </div>
)
```

### 📋 Dashboard Issues
**Current State:**
- Desktop-style 2-column grid (map left, job preview right)
- Job list below map
- No mobile optimization
- Inline controls (online/offline toggle at top)

**Expected Mobile Shell:**
- Full-screen map
- Floating online/offline button (top-right corner)
- Bottom sheet with job cards (swipeable)
- Selected job shows in modal or expanded sheet
- Accept button in job sheet
- Filters button (top-left)

---

## 🚚 Runner App (Shifter) - Current State

### ❌ MISSING: Bottom Navigation
**Current:** No bottom nav bar  
**Expected:** Bottom nav with tabs:
- 🏠 Dashboard
- 🛣️ Available Routes
- 📦 My Jobs
- 💰 Earnings
- ⚙️ Settings

### ❌ MISSING: Map Shell Layout
**Current:** Dashboard is card-based (no map)  
**Expected:** Map shell showing:
- Full-screen map with route markers
- Current location if active
- Available routes as pins/markers
- Bottom sheet for route list
- Floating "Find Routes" button

### ⚠️ PARTIALLY COMPLETE: Pages
**Existing Routes:**
- ✅ `/dashboard` - Dashboard exists (card-based, no map)
- ✅ `/available-routes` - Available routes page exists
- ✅ `/jobs` - Jobs page exists
- ✅ `/earnings` - Earnings page exists
- ✅ `/profile` - Profile page exists
- ✅ `/settings` - Settings with sign out
- ✅ `/support` - Support page exists
- ✅ `/onboarding` - Onboarding flow

**Issues:**
- ❌ No bottom navigation to access these pages
- ❌ Dashboard lacks map integration
- ❌ Available routes not map-based
- ❌ No floating UI elements

### 🔧 Layout Issues
**Current RunnerLayout.tsx:**
```tsx
return (
  <div className="min-h-screen bg-gray-50">
    {children}
  </div>
)
```

**Expected:**
```tsx
return (
  <div className="min-h-screen bg-[#F8F9FF]">
    <div className="pb-24">
      {children}
    </div>
    <BottomNav items={runnerNavItems} />
  </div>
)
```

---

## 🎨 Design System Comparison

### Customer App (Gold Standard)
- Background: `#F8F9FF` (light purple)
- Cards: White with `shadow-xl`, `rounded-3xl`
- Bottom Nav: Fixed, backdrop-blur, purple accent
- Padding: `pb-24` for nav clearance
- Typography: Clean, consistent sizes
- Colors: Purple primary (#667eea), gradients

### Courier App (Current)
- Background: `bg-gray-50` ❌
- No bottom nav ❌
- Desktop-style padding ❌
- Inline styles mixed with Tailwind ⚠️

### Runner App (Current)
- Background: `bg-gray-50` ❌
- No bottom nav ❌
- Card-based (good) but missing map ⚠️
- No mobile shell ❌

---

## 📊 Feature Parity Matrix

| Feature | Customer | Courier | Runner |
|---------|----------|---------|--------|
| Bottom Navigation | ✅ | ❌ | ❌ |
| Map Shell Layout | ✅ | ⚠️ (wrong) | ❌ |
| Floating Cards | ✅ | ❌ | ❌ |
| Floating Buttons | ✅ | ❌ | ❌ |
| Mobile Optimized | ✅ | ❌ | ⚠️ |
| State-Based UI | ✅ | ⚠️ | ⚠️ |
| Purple Theme | ✅ | ❌ | ❌ |
| All Pages Wired | ✅ | ⚠️ | ⚠️ |
| Proper Layout | ✅ | ❌ | ❌ |

---

## 🚀 Required Changes

### Phase 1: Navigation & Layout (CRITICAL)

#### Courier App
1. **Add Bottom Navigation**
   ```tsx
   // CourierLayout.tsx
   import { BottomNav } from '../components/BottomNav'
   
   export const courierNavItems = [
     { icon: "🏠", label: "Dashboard", href: "/dashboard" },
     { icon: "📦", label: "Active", href: "/jobs" },
     { icon: "💰", label: "Earnings", href: "/earnings" },
     { icon: "⚙️", label: "Settings", href: "/settings" },
   ]
   
   return (
     <div className="min-h-screen bg-[#F8F9FF]">
       <div className="pb-24">{children}</div>
       <BottomNav items={courierNavItems} />
     </div>
   )
   ```

2. **Rebuild Dashboard with Map Shell**
   - Convert to mobile-first map view
   - Add floating online/offline button (top-right)
   - Add filters button (top-left)
   - Convert job list to bottom sheet
   - Add swipe gestures for sheet
   - Selected job opens in modal/expanded sheet

3. **Create Earnings Page**
   - Stats cards at top
   - Transaction history below
   - Filters for date range

#### Runner App
1. **Add Bottom Navigation**
   ```tsx
   // RunnerLayout.tsx
   export const runnerNavItems = [
     { icon: "🏠", label: "Home", href: "/dashboard" },
     { icon: "🛣️", label: "Routes", href: "/available-routes" },
     { icon: "📦", label: "Jobs", href: "/jobs" },
     { icon: "💰", label: "Earnings", href: "/earnings" },
     { icon: "⚙️", label: "Settings", href: "/settings" },
   ]
   ```

2. **Rebuild Dashboard with Map Shell**
   - Full-screen map showing route hubs
   - Available routes as markers
   - Bottom sheet for route list
   - Floating "Find Routes" button
   - Current location indicator if active

3. **Update Available Routes Page**
   - Map view showing all routes
   - Bottom sheet with route cards
   - Filter by distance/pay/date

---

### Phase 2: Floating UI Components (HIGH)

#### Create Shared Components
1. **FloatingButton.tsx**
   ```tsx
   // Position: top-left, top-right, bottom-right
   // Variants: primary, secondary, outline
   // With icon support
   ```

2. **BottomSheet.tsx**
   ```tsx
   // Swipeable bottom sheet
   // Heights: collapsed, half, full
   // Snap points support
   ```

3. **FloatingCard.tsx**
   ```tsx
   // Overlay cards on map
   // Draggable, dismissible
   // Animation support
   ```

#### Courier Dashboard UI
```
┌─────────────────────────┐
│ [Filters] 🗺️      [🟢] │ ← Floating buttons
│                         │
│                         │
│         MAP             │
│                         │
│                         │
│                         │
│─────────────────────────│
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │ ← Drag handle
│ Available Jobs (12)     │
│                         │
│ ┌─────────────────────┐ │
│ │ 📍→🎯  $12.50   →  │ │ ← Job cards
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 📍→🎯  $15.00   →  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

#### Runner Dashboard UI
```
┌─────────────────────────┐
│ [🔍]           [Status] │ ← Floating buttons
│                         │
│         MAP             │
│    📍  📍  📍          │ ← Route hubs
│                         │
│                         │
│─────────────────────────│
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │
│ Available Routes (5)    │
│                         │
│ ┌─────────────────────┐ │
│ │ NYC→BOS  $250  →   │ │ ← Route cards
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

### Phase 3: Page Completion (MEDIUM)

#### Courier App
- ✅ Create `/earnings` page
- ✅ Add earnings to nav
- ✅ Move support to settings menu
- ✅ Test all navigation flows

#### Runner App  
- ✅ All pages already exist
- ✅ Just need to wire navigation
- ✅ Update available-routes to use map
- ✅ Test all flows

---

## 🧪 Testing Checklist

### Courier App
- [ ] Bottom nav shows all tabs
- [ ] Dashboard loads with map
- [ ] Online/offline toggle works (floating button)
- [ ] Job list appears in bottom sheet
- [ ] Tapping job opens detail modal
- [ ] Accept job navigates to active job
- [ ] Earnings page shows history
- [ ] All pages accessible from nav
- [ ] Back button works on all pages
- [ ] Settings has sign out

### Runner App
- [ ] Bottom nav shows all tabs
- [ ] Dashboard shows map with routes
- [ ] Available routes in bottom sheet
- [ ] Tapping route shows detail
- [ ] Jobs page shows active jobs
- [ ] Earnings shows payment history
- [ ] All pages accessible from nav
- [ ] Settings has sign out

---

## 🎯 Priority Actions (Start Now)

### Immediate (Do First)
1. ✅ Add BottomNav to CourierLayout
2. ✅ Add BottomNav to RunnerLayout
3. ✅ Update both layouts to use `bg-[#F8F9FF]` and `pb-24`
4. ✅ Copy BottomNav component from marketplace-app to both apps

### Short-term (Next)
5. ✅ Create courierNavItems (4 tabs)
6. ✅ Create runnerNavItems (5 tabs)
7. ✅ Test navigation in both apps
8. ✅ Create earnings pages for both apps

### Medium-term (After Nav)
9. ⏳ Rebuild courier dashboard with map shell
10. ⏳ Rebuild runner dashboard with map shell
11. ⏳ Create FloatingButton component
12. ⏳ Create BottomSheet component
13. ⏳ Test on mobile devices

---

## 📝 Notes

### Customer App Patterns to Copy
- Mobile-first design
- Bottom navigation paradigm
- Floating UI elements
- Purple theme & gradients
- Card-based layouts with shadows
- Proper spacing for mobile (pb-24)

### Avoid
- Desktop-only layouts
- Gray backgrounds (use purple theme)
- Missing navigation
- Inline styles (prefer Tailwind)
- Non-responsive designs

---

## ✅ Success Criteria

Both apps will be "complete" when:
1. ✅ Bottom navigation works and matches marketplace-app style
2. ✅ All pages accessible from navigation
3. ✅ Dashboards use map shell layout
4. ✅ Floating UI elements for key actions
5. ✅ Mobile-optimized (test on phone)
6. ✅ Purple theme consistent with marketplace-app
7. ✅ All flows tested end-to-end
8. ✅ Sign out works in settings

---

**Next Steps:** Start dev servers and implement Phase 1 navigation changes.

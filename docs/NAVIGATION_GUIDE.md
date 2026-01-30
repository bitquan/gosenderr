# GoSenderr Navigation Guide

## Overview

All GoSenderr apps use a **mobile-first bottom navigation pattern** with role-specific tabs. This guide documents the navigation structure, implementation patterns, and best practices.

---

## Bottom Navigation Pattern

### Design Principles

1. **Fixed Position**: Always visible at bottom of viewport
2. **Mobile-First**: Optimized for thumb reach on mobile devices
3. **Visual Feedback**: Clear active state with role-specific colors
4. **Icon + Label**: Both emoji icons and text labels for clarity
5. **Consistent Height**: 80px (h-20) across all apps

### Common Styling

```tsx
// Bottom Navigation Container
className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
height="h-20"
shadow="shadow-lg"

// Navigation Button (Active)
background={`bg-${color}-50`}  // Role-specific color
text={`text-${color}-600`}
border={`border-t-2 border-${color}-600`}

// Navigation Button (Inactive)
background="bg-transparent"
text="text-gray-600"
border="border-t-2 border-transparent"
```

### Layout Padding

All layouts include bottom padding to prevent content from being hidden behind the fixed bottom nav:

```tsx
<div className="min-h-screen bg-[#F8F9FF] pb-24">
  {children}
</div>
<BottomNav items={navItems} />
```

**Note**: `pb-24` = 96px padding, which accommodates the 80px nav height + extra space for visual breathing room.

---

## Customer App Navigation

### Tabs (3 total)

| Icon | Label | Route | Purpose |
|------|-------|-------|---------|
| 🏠 | Home | `/dashboard` | Job creation and overview |
| 📦 | Jobs | `/jobs` | Active and past jobs list |
| ⚙️ | Settings | `/settings` | Profile and preferences |

### Color Theme
- **Active**: `blue-50` background, `blue-600` text and border
- **Inactive**: `gray-600` text

### Implementation

```tsx
// apps/marketplace-app/src/components/BottomNav.tsx
const customerNavItems = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

// Usage in layout
import BottomNav from "../components/BottomNav";

export default function CustomerLayout({ children }) {
  return (
    <>
      <div className="min-h-screen bg-[#F8F9FF] pb-24">
        {children}
      </div>
      <BottomNav items={customerNavItems} />
    </>
  );
}
```

### Routes

```tsx
// apps/marketplace-app/src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route element={<CustomerLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/jobs" element={<Jobs />} />
    <Route path="/jobs/:id" element={<JobDetail />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

---

## Courier App Navigation

### Tabs (4 total)

| Icon | Label | Route | Purpose |
|------|-------|-------|---------|
| 🏠 | Dashboard | `/dashboard` | Map shell with available jobs |
| 📦 | Active | `/jobs` | Currently assigned job |
| 💰 | Earnings | `/earnings` | Completed jobs and payouts |
| ⚙️ | Settings | `/settings` | Profile, equipment, Stripe |

### Color Theme
- **Active**: `emerald-50` background, `emerald-600` text and border
- **Inactive**: `gray-600` text

### Implementation

```tsx
// apps/courier-app/src/components/BottomNav.tsx
const courierNavItems = [
  { icon: "🏠", label: "Dashboard", href: "/dashboard" },
  { icon: "📦", label: "Active", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

// Usage in layout
export default function CourierLayout({ children }) {
  return (
    <>
      <div className="min-h-screen bg-[#F8F9FF] pb-24">
        {children}
      </div>
      <BottomNav items={courierNavItems} />
    </>
  );
}
```

### Routes

```tsx
// apps/courier-app/src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route element={<CourierLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />  {/* Map shell */}
    <Route path="/jobs" element={<Jobs />} />
    <Route path="/jobs/:id" element={<JobDetail />} />
    <Route path="/earnings" element={<Earnings />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/equipment" element={<Equipment />} />
    <Route path="/rate-cards" element={<RateCards />} />
    <Route path="/stripe-setup" element={<StripeSetup />} />
  </Route>
  
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

### Dashboard Special Case

The courier dashboard uses a **map shell** design where the entire screen is a map with floating UI overlays. The BottomNav is still visible and functional, positioned above the map.

```tsx
// apps/courier-app/src/pages/dashboard/page.tsx
<div className="relative h-screen w-full overflow-hidden">
  {/* Full-screen map */}
  <MapboxMap 
    pickup={selectedJob?.pickup}
    dropoff={selectedJob?.dropoff}
    height="100%"
  />
  
  {/* Floating controls */}
  <button className="absolute top-4 right-4 z-20">
    🟢 Online
  </button>
  
  {/* Bottom sheet with jobs - appears above BottomNav */}
  <div className="absolute bottom-20 left-0 right-0 z-10">
    {/* Job cards */}
  </div>
</div>
```

**Z-index layers**:
- Map: `z-0` (background)
- Bottom sheet: `z-10` (above map, below nav)
- Floating buttons: `z-20` (above sheet)
- Bottom nav: `z-50` (always on top)

---

## Runner/Shifter App Navigation

### Tabs (5 total)

| Icon | Label | Route | Purpose |
|------|-------|-------|---------|
| 🏠 | Home | `/dashboard` | Dashboard overview |
| 🛣️ | Routes | `/available-routes` | Available routes to accept |
| 📦 | Jobs | `/jobs` | All jobs within routes |
| 💰 | Earnings | `/earnings` | Route earnings |
| ⚙️ | Settings | `/settings` | Profile and preferences |

### Color Theme
- **Active**: `orange-50` background, `orange-600` text and border
- **Inactive**: `gray-600` text

### Implementation

```tsx
// apps/shifter-app/src/components/BottomNav.tsx
const runnerNavItems = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "🛣️", label: "Routes", href: "/available-routes" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

// Usage in layout
export default function RunnerLayout({ children }) {
  return (
    <>
      <div className="min-h-screen bg-[#F8F9FF] pb-24">
        {children}
      </div>
      <BottomNav items={runnerNavItems} />
    </>
  );
}
```

### Routes

```tsx
// apps/shifter-app/src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route element={<RunnerLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/available-routes" element={<AvailableRoutes />} />
    <Route path="/routes" element={<Routes />} />
    <Route path="/routes/:id" element={<RouteDetail />} />
    <Route path="/jobs" element={<Jobs />} />
    <Route path="/jobs/:id" element={<JobDetail />} />
    <Route path="/earnings" element={<Earnings />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

### Navigation Button Sizing

With 5 tabs, buttons are slightly smaller to fit comfortably:

```tsx
// Reduced horizontal padding
className="px-3"  // vs px-4 for 3-4 tab layouts

// Icon and label remain same size
icon: text-2xl
label: text-xs
```

---

## Admin App Navigation

### Tabs (5 total)

| Icon | Label | Route | Purpose |
|------|-------|-------|---------|
| 🏠 | Dashboard | `/dashboard` | Platform metrics |
| 👥 | Users | `/users` | User management |
| 📦 | Jobs | `/jobs` | Job monitoring |
| 📍 | Hubs | `/hubs` | Hub configuration |
| ⚙️ | Settings | `/settings` | Admin settings |

### Color Theme
- **Active**: `purple-50` background, `purple-600` text and border
- **Inactive**: `gray-600` text

### Implementation

```tsx
// apps/admin-app/src/components/BottomNav.tsx
const adminNavItems = [
  { icon: "🏠", label: "Dashboard", href: "/dashboard" },
  { icon: "👥", label: "Users", href: "/users" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "📍", label: "Hubs", href: "/hubs" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
```

### Routes

```tsx
// apps/admin-app/src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route element={<AdminLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/users" element={<Users />} />
    <Route path="/users/:id" element={<UserDetail />} />
    <Route path="/jobs" element={<Jobs />} />
    <Route path="/jobs/:id" element={<JobDetail />} />
    <Route path="/hubs" element={<Hubs />} />
    <Route path="/rate-cards" element={<RateCards />} />
    <Route path="/analytics" element={<Analytics />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

---

## BottomNav Component Implementation

### Generic Component Structure

```tsx
// Shared pattern across all apps
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export default function BottomNav({ items }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-20">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 
                flex-1 h-full transition-all border-t-2
                ${isActive 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-600" 
                  : "bg-transparent text-gray-600 border-transparent hover:bg-gray-50"
                }
              `}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Key Features

1. **Active State Detection**: Uses `useLocation()` to match current route
2. **Flex Layout**: `justify-around` distributes tabs evenly
3. **Accessibility**: Uses semantic `<nav>` and `<Link>` elements
4. **Responsive**: `flex-1` ensures equal width per tab
5. **Hover State**: Subtle `hover:bg-gray-50` for inactive tabs

### Color Customization

To use different colors per app, replace hardcoded classes with props:

```tsx
interface BottomNavProps {
  items: NavItem[];
  activeColor?: string;  // e.g., "emerald", "blue", "orange", "purple"
}

export default function BottomNav({ 
  items, 
  activeColor = "emerald" 
}: BottomNavProps) {
  // Use Tailwind JIT mode or SafeList for dynamic colors
  const activeClasses = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-600",
    blue: "bg-blue-50 text-blue-600 border-blue-600",
    orange: "bg-orange-50 text-orange-600 border-orange-600",
    purple: "bg-purple-50 text-purple-600 border-purple-600",
  };

  return (
    <nav className="...">
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            className={`
              ...
              ${isActive 
                ? activeClasses[activeColor] 
                : "bg-transparent text-gray-600 border-transparent"
              }
            `}
          >
            ...
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## Routing Best Practices

### 1. Route Protection

Wrap protected routes in a layout that checks authentication:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function ProtectedLayout() {
  const { currentUser, loading } = useCurrentUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Usage in App.tsx
<Route element={<ProtectedLayout />}>
  <Route element={<CustomerLayout />}>
    {/* Protected customer routes */}
  </Route>
</Route>
```

### 2. Nested Layouts

Use `<Outlet />` to nest layouts:

```tsx
// CustomerLayout wraps all customer pages
export default function CustomerLayout() {
  return (
    <>
      <div className="min-h-screen bg-[#F8F9FF] pb-24">
        <Outlet />  {/* Child routes render here */}
      </div>
      <BottomNav items={customerNavItems} />
    </>
  );
}
```

### 3. Default Redirects

Always provide a catch-all redirect:

```tsx
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

This handles:
- Invalid URLs
- Direct navigation to `/` root
- 404 scenarios

### 4. Detail Page Patterns

Use dynamic routes for detail pages:

```tsx
// List page
<Route path="/jobs" element={<Jobs />} />

// Detail page
<Route path="/jobs/:id" element={<JobDetail />} />

// Access ID in component
import { useParams } from "react-router-dom";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  
  // Fetch job with id
}
```

---

## Mobile Optimization

### Touch Targets

All navigation buttons meet minimum touch target size:
- **Height**: 80px (h-20)
- **Width**: Flex-based (≥ 60px minimum)
- **Spacing**: No gaps between buttons (easier to tap)

### Safe Area Handling

For iOS devices with notches/home indicators, add safe area padding:

```tsx
// Add to BottomNav
className="pb-safe"  // or pb-[env(safe-area-inset-bottom)]

// In global CSS
.pb-safe {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

### Scroll Behavior

Pages should scroll without bottom nav moving:

```tsx
// Page container
<div className="min-h-screen pb-24 overflow-y-auto">
  {/* Content */}
</div>

// BottomNav stays fixed
<nav className="fixed bottom-0 ...">
```

---

## Accessibility

### Semantic HTML

```tsx
// Use semantic nav element
<nav role="navigation" aria-label="Main navigation">

// Use button for actions, link for navigation
<Link to="/dashboard" aria-label="Navigate to dashboard">

// Add labels to icons
<span aria-hidden="true">{icon}</span>
<span className="text-xs">{label}</span>  {/* Screen readers read this */}
```

### Keyboard Navigation

Navigation works with keyboard:
- **Tab**: Move between buttons
- **Enter/Space**: Activate link
- **Shift+Tab**: Move backwards

React Router `<Link>` components handle this automatically.

### Focus States

Add visible focus indicators:

```tsx
className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
```

---

## Testing Navigation

### Manual Test Checklist

- [ ] All tabs visible on mobile viewport (375px width)
- [ ] Active state shows correct color for current route
- [ ] Tapping each tab navigates to correct page
- [ ] Back button works (browser history preserved)
- [ ] Bottom nav doesn't cover page content (pb-24 applied)
- [ ] Smooth transitions between pages
- [ ] Nav stays fixed during scroll
- [ ] Icons and labels legible at all zoom levels

### Automated Testing

```typescript
// Example Playwright test
import { test, expect } from '@playwright/test';

test('navigation tabs work', async ({ page }) => {
  await page.goto('http://localhost:5173/dashboard');
  
  // Click Jobs tab
  await page.click('text=Jobs');
  await expect(page).toHaveURL(/.*\/jobs/);
  
  // Verify active state
  const jobsTab = page.locator('nav a[href="/jobs"]');
  await expect(jobsTab).toHaveClass(/bg-blue-50/);
  
  // Click Settings tab
  await page.click('text=Settings');
  await expect(page).toHaveURL(/.*\/settings/);
});
```

---

## Common Issues & Solutions

### Issue: Bottom nav covers content

**Solution**: Ensure parent layout has `pb-24` (96px padding):

```tsx
<div className="min-h-screen pb-24">
  {children}
</div>
```

### Issue: Active state not updating

**Solution**: Verify route path matches exactly:

```tsx
// ❌ Wrong - includes trailing slash
const isActive = location.pathname === "/dashboard/";

// ✅ Correct - no trailing slash
const isActive = location.pathname === "/dashboard";
```

### Issue: Navigation flickers on route change

**Solution**: Use React Router's built-in transitions:

```tsx
// Wrap routes in Suspense
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    {/* routes */}
  </Routes>
</Suspense>
```

### Issue: Wrong tab highlighted on sub-routes

**Solution**: Use `startsWith()` for parent routes:

```tsx
// Highlight "Jobs" tab on both /jobs and /jobs/:id
const isActive = location.pathname.startsWith("/jobs");
```

### Issue: Bottom nav not sticky on iOS Safari

**Solution**: Add height to parent and use `position: fixed`:

```tsx
// Layout must have defined height
<div className="h-screen">
  <div className="h-full pb-24 overflow-y-auto">
    {children}
  </div>
  <nav className="fixed bottom-0">  {/* Not absolute */}
</div>
```

---

## Future Enhancements

### Planned Improvements

1. **Badge Notifications**: Show count on Jobs tab when new jobs available
2. **Haptic Feedback**: Vibrate on tab press (mobile PWA)
3. **Swipe Gestures**: Swipe left/right to change tabs
4. **Dynamic Icons**: Animate icons on active state (Lottie)
5. **Contextual Nav**: Show/hide tabs based on user state (e.g., hide "Active" if no job)

### Example: Badge Implementation

```tsx
<Link to="/jobs">
  <div className="relative">
    <span className="text-2xl">📦</span>
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {unreadCount}
      </span>
    )}
  </div>
  <span className="text-xs">Jobs</span>
</Link>
```

---

## Resources

- **React Router Docs**: https://reactrouter.com/en/main
- **Tailwind CSS**: https://tailwindcss.com/docs/position#fixed
- **Mobile UX Best Practices**: https://www.nngroup.com/articles/mobile-navigation-patterns/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/#navigation-mechanisms

---

**Last Updated**: January 2025  
**Document Owner**: Frontend Team  
**Status**: Living document - update as patterns evolve

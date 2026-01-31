# Routing Architecture

**Project:** GoSenderr Web App  
**Framework:** Next.js 15 App Router  
**Last Updated:** 2025

---

## 📋 Overview

GoSenderr uses Next.js 15's App Router with file-system based routing. All routes are server-rendered by default with client components marked explicitly via `'use client'` directive.

---

## 🗺️ Route Map

### Root & Auth Routes

| Route          | File                       | Auth | Role | Description                                       |
| -------------- | -------------------------- | ---- | ---- | ------------------------------------------------- |
| `/`            | `app/page.tsx`             | No   | -    | Root page, redirects to `/login`                  |
| `/login`       | `app/login/page.tsx`       | No   | -    | Email/password auth, auto-creates accounts        |
| `/select-role` | `app/select-role/page.tsx` | Yes  | -    | Choose customer or courier role (first-time only) |

**Behavior:**

- Unauthenticated users → `/login`
- Authenticated without role → `/select-role`
- Authenticated with role → Role-specific dashboard

### Customer Routes

| Route                    | File                                 | Auth | Description               |
| ------------------------ | ------------------------------------ | ---- | ------------------------- |
| `/customer/jobs`         | `app/customer/jobs/page.tsx`         | Yes  | List all customer's jobs  |
| `/customer/jobs/new`     | `app/customer/jobs/new/page.tsx`     | Yes  | Create new delivery job   |
| `/customer/jobs/[jobId]` | `app/customer/jobs/[jobId]/page.tsx` | Yes  | View job details + cancel |

**Access Control:**

- Must be authenticated
- Must have `role === 'customer'` in Firestore user document
- Enforced by `<AuthGate>` component (if used) or manually via `useUserRole()` hook

### Courier Routes

| Route                   | File                                | Auth | Description                                 |
| ----------------------- | ----------------------------------- | ---- | ------------------------------------------- |
| `/courier/dashboard`    | `app/courier/dashboard/page.tsx`    | Yes  | View open jobs, toggle online/offline       |
| `/courier/setup`        | `app/courier/setup/page.tsx`        | Yes  | Initial profile setup (location, rate card) |
| `/courier/jobs/[jobId]` | `app/courier/jobs/[jobId]/page.tsx` | Yes  | View job details, update status             |

**Access Control:**

- Must be authenticated
- Must have `role === 'courier'` in Firestore user document

### Legacy Compatibility Routes

| Route           | File                        | Description                                 |
| --------------- | --------------------------- | ------------------------------------------- |
| `/v2`           | `app/v2/page.tsx`           | Redirects to `/` for backward compatibility |
| `/v2/[...slug]` | `app/v2/[...slug]/page.tsx` | Catch-all redirect to `/`                   |

**Purpose:** These routes exist to handle old bookmarks or links that pointed to `/v2/*` paths. They simply redirect to the new clean URLs.

**Status:** Can be removed after 1-2 deploys when traffic has migrated.

---

## 🔐 Authentication Flow

### New User Flow

```
1. Visit any route
   ↓
2. Unauthenticated → Redirect to /login
   ↓
3. Enter email + password
   ↓
4. Try sign-in
   ├─ Success → Go to step 5
   └─ User not found → Create account → Go to step 5
   ↓
5. Authenticated, check role in Firestore
   ├─ No role → Redirect to /select-role
   │    ↓
   │    Select "Customer" or "Courier"
   │    ├─ Customer → Redirect to /customer/jobs
   │    └─ Courier → Redirect to /courier/setup (first time)
   │
   └─ Has role
        ├─ Customer → Redirect to /customer/jobs
        └─ Courier → Redirect to /courier/dashboard
```

### Returning User Flow

```
1. Visit any route
   ↓
2. Check Firebase Auth state
   ├─ Not authenticated → Redirect to /login
   └─ Authenticated
        ↓
        Check Firestore user doc
        ├─ role === 'customer' → Allow customer routes
        ├─ role === 'courier' → Allow courier routes
        └─ No role → Redirect to /select-role
```

---

## 🧱 Route Components

### Page Structure Pattern

Most pages follow this structure:

```tsx
// app/some-route/page.tsx

import { AuthGate } from "@/components/v2/AuthGate";
import { SomeFeatureComponent } from "@/features/some-feature";

export default function SomePage() {
  return (
    <AuthGate requireRole="customer">
      <SomeFeatureComponent />
    </AuthGate>
  );
}
```

**Components Used:**

- `<AuthGate>` - Handles auth + role checks, shows loading states
- Feature components - Separated by domain (jobs, etc.)

### Current Implementation

Most routes **do not** use `<AuthGate>` but instead manually call hooks:

```tsx
"use client";

import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserRole } from "@/hooks/v2/useUserRole";

export default function SomePage() {
  const { uid, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <div>Loading...</div>;
  }

  if (!uid) {
    router.push("/login");
    return null;
  }

  if (role !== "customer") {
    router.push("/select-role");
    return null;
  }

  return <div>Protected content</div>;
}
```

---

## 📂 File-System Routing

### Dynamic Routes

**Customer Job Details:**

```
app/customer/jobs/[jobId]/page.tsx

URL: /customer/jobs/abc123xyz
Params: { jobId: 'abc123xyz' }
```

**Courier Job Details:**

```
app/courier/jobs/[jobId]/page.tsx

URL: /courier/jobs/abc123xyz
Params: { jobId: 'abc123xyz' }
```

**V2 Catch-All:**

```
app/v2/[...slug]/page.tsx

URL: /v2/anything/here
Params: { slug: ['anything', 'here'] }
```

### Layouts

**Root Layout:** `app/layout.tsx`

- Wraps all pages
- Provides global styles (`globals.css`)
- Sets up `<html>` and `<body>` tags

**Future Opportunity:**

- Add role-specific layouts:
  - `app/customer/layout.tsx` - Customer navigation
  - `app/courier/layout.tsx` - Courier navigation

---

## 🚦 Navigation Patterns

### Programmatic Navigation

```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

// Navigate to a route
router.push("/customer/jobs");

// Navigate with job ID
router.push(`/customer/jobs/${jobId}`);

// Replace current route (no back button)
router.replace("/login");

// Go back
router.back();
```

### Link Components

```tsx
import Link from 'next/link';

<Link href="/customer/jobs">View Jobs</Link>
<Link href={`/customer/jobs/${jobId}`}>View Job</Link>
```

### Redirects

**Server Component Redirect:**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

**Client Component Redirect:**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return null;
}
```

---

## 🔒 Access Control Strategy

### Current Implementation

**Auth Check:**

```tsx
const { uid, loading } = useAuthUser();

if (loading) return <div>Loading...</div>;
if (!uid) {
  router.push("/login");
  return null;
}
```

**Role Check:**

```tsx
const { role, loading } = useUserRole();

if (loading) return <div>Loading...</div>;
if (role !== "customer") {
  router.push("/select-role");
  return null;
}
```

**Job Access Check:**

```tsx
const { job, loading } = useJob(jobId);

if (loading) return <div>Loading...</div>;
if (!job) return <div>Job not found</div>;

// Customer can only see their own jobs
if (role === "customer" && job.createdByUid !== uid) {
  return <div>Access denied</div>;
}

// Courier can only see assigned jobs or open jobs
if (role === "courier" && job.courierUid !== uid && job.status !== "open") {
  return <div>Access denied</div>;
}
```

### Security Rules Enforcement

**Client-side checks** are for UX only. **Server-side security** is enforced via:

1. **Firebase Auth** - Validates JWT tokens
2. **Firestore Rules** - Restricts read/write access
3. **Storage Rules** - Restricts file access

**Example Firestore Rule:**

```javascript
// jobs/{jobId}
allow read: if isAuthenticated() && (
  isJobCreator(jobId) ||
  isAssignedCourier(jobId) ||
  (isCourier() && getJob(jobId).status == 'open')
);
```

---

## 🎯 URL Design Principles

### Current Design

✅ **Good:**

- Clean URLs: `/customer/jobs` instead of `/customer-jobs`
- RESTful patterns: `/customer/jobs/new` for creation
- Dynamic params: `/customer/jobs/[jobId]` for details
- Role-based prefixes: `/customer/*` and `/courier/*`

✅ **Root Route Works:**

- `/` → `/login` (simple, expected)

⚠️ **Legacy Compatibility:**

- `/v2` and `/v2/*` still exist for backward compatibility
- Can be removed after traffic migrates

### Future Considerations

**Add API Routes** (if needed):

```
app/api/
├── jobs/
│   └── route.ts          # GET /api/jobs
├── jobs/[jobId]/
│   └── route.ts          # GET /api/jobs/[jobId]
└── webhooks/
    └── stripe/route.ts   # POST /api/webhooks/stripe
```

**Add Admin Routes** (if needed):

```
app/admin/
├── layout.tsx            # Admin-only layout
├── page.tsx              # Admin dashboard
└── users/
    └── page.tsx          # User management
```

---

## 🧪 Testing Routes

### Manual Testing Checklist

**Unauthenticated:**

- [ ] Visit `/` → Redirects to `/login`
- [ ] Visit `/customer/jobs` → Redirects to `/login`
- [ ] Visit `/courier/dashboard` → Redirects to `/login`

**Authenticated (No Role):**

- [ ] Visit `/` → Redirects to `/select-role`
- [ ] Select "Customer" → Redirects to `/customer/jobs`
- [ ] Select "Courier" → Redirects to `/courier/setup`

**Authenticated (Customer):**

- [ ] Visit `/` → Redirects to `/customer/jobs`
- [ ] Visit `/customer/jobs` → Shows job list
- [ ] Visit `/customer/jobs/new` → Shows creation form
- [ ] Visit `/customer/jobs/invalid-id` → Shows "Job not found"
- [ ] Visit `/customer/jobs/other-users-job` → Shows "Access denied" or 404

**Authenticated (Courier):**

- [ ] Visit `/` → Redirects to `/courier/dashboard`
- [ ] Visit `/courier/dashboard` → Shows open jobs
- [ ] Visit `/courier/setup` → Shows profile form
- [ ] Visit `/courier/jobs/open-job-id` → Shows job details
- [ ] Visit `/courier/jobs/assigned-job-id` → Shows job details with actions

**Legacy Routes:**

- [ ] Visit `/v2` → Redirects to `/`
- [ ] Visit `/v2/anything` → Redirects to `/`

---

## 📈 Build Output

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      134 B         102 kB
├ ○ /_not-found                            134 B         102 kB
├ ○ /courier/dashboard                   2.96 kB         235 kB
├ ƒ /courier/jobs/[jobId]                2.65 kB         239 kB
├ ○ /courier/setup                       3.39 kB         233 kB
├ ○ /customer/jobs                        2.6 kB         234 kB
├ ƒ /customer/jobs/[jobId]                2.2 kB         238 kB
├ ○ /customer/jobs/new                   6.51 kB         237 kB
├ ○ /login                               1.42 kB         229 kB
├ ○ /select-role                         1.93 kB         230 kB
├ ○ /v2                                    134 B         102 kB
└ ƒ /v2/[...slug]                          454 B         102 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**Notes:**

- Static routes (`○`) are pre-rendered at build time
- Dynamic routes (`ƒ`) are server-rendered on each request
- First Load JS includes shared chunks (React, Next.js, Firebase)

---

## 🐛 Known Issues

None currently.

---

## 🚀 Future Enhancements

- [ ] Add middleware for auth checks (cleaner than per-page hooks)
- [ ] Add role-specific layouts with navigation
- [ ] Add breadcrumb navigation
- [ ] Add 404 page customization
- [ ] Add loading.tsx files for Suspense boundaries
- [ ] Add error.tsx files for error boundaries
- [ ] Remove `/v2` legacy routes after traffic migration
- [ ] Add API routes for server-side operations (payments, webhooks)
- [ ] Add admin routes for platform management

---

## 📚 Related Documentation

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Next.js Routing Fundamentals](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js Redirects](https://nextjs.org/docs/app/building-your-application/routing/redirecting)

---

**Maintained by:** GoSenderr Team  
**Questions?** See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for full system documentation.

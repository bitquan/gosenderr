# GoSenderr Project Context

Last Updated: 2025

## 📋 Executive Summary

GoSenderr is a modern on-demand delivery platform built with Next.js 15, Firebase, and TypeScript. The platform connects customers who need items delivered with independent couriers who can fulfill those deliveries.

**Status:** ✅ Production-ready web app deployed to Firebase Hosting + Cloud Run  
**Architecture:** React Server Components + Firebase Auth/Firestore/Storage  
**Key Features:** Real-time job matching, package photo uploads, flexible pricing, courier discovery

---

## 🏗️ Architecture

### Tech Stack

**Frontend Framework:**

- Next.js 15.5.9 (App Router with RSC)
- React 19.0.0
- TypeScript 5.9.3 (strict mode)

**Backend Services (Firebase):**

- **Authentication:** Email/password auth with role-based access
- **Database:** Firestore with real-time subscriptions
- **Storage:** Cloud Storage for package photos
- **Hosting:** Firebase Hosting → Cloud Run proxy

**Key Libraries:**

- Mapbox GL JS 3.8.0 for geocoding and address autocomplete
- ngeohash for geohash-based courier discovery
- Turbo for monorepo task orchestration

**Deployment:**

- Production: Cloud Run service `gosenderr-web` (us-central1)
- Hosting: Firebase project `gosenderr-6773f`
- CDN: Firebase Hosting with custom domain support

### Monorepo Structure

```
/workspaces/gosenderr/
├── apps/
│   └── web/                          # Next.js web application
│       ├── src/
│       │   ├── app/                  # Next.js App Router pages
│       │   │   ├── page.tsx          # Root → redirects to /login
│       │   │   ├── login/            # Auth page (auto-creates accounts)
│       │   │   ├── select-role/      # Role selection (customer/courier)
│       │   │   ├── customer/         # Customer-only routes
│       │   │   │   └── jobs/
│       │   │   │       ├── page.tsx              # Job list
│       │   │   │       ├── new/page.tsx          # Create job
│       │   │   │       └── [jobId]/page.tsx      # Job details
│       │   │   ├── courier/          # Courier-only routes
│       │   │   │   ├── dashboard/page.tsx        # Active jobs
│       │   │   │   ├── setup/page.tsx            # Initial profile setup
│       │   │   │   └── jobs/[jobId]/page.tsx     # Job details
│       │   │   └── v2/               # Legacy compatibility redirect
│       │   ├── components/
│       │   │   └── v2/               # Reusable UI components (SOME DUPLICATES - see cleanup notes)
│       │   ├── features/
│       │   │   └── jobs/
│       │   │       ├── shared/       # 🆕 Shared job components (PRIMARY)
│       │   │       │   ├── types.ts
│       │   │       │   ├── privacy.ts
│       │   │       │   ├── PackageBadges.tsx
│       │   │       │   ├── PhotoGallery.tsx
│       │   │       │   ├── AddressBlock.tsx
│       │   │       │   ├── PackageDetailsPanel.tsx
│       │   │       │   ├── JobStatusPills.tsx
│       │   │       │   ├── JobDetailsPanel.tsx
│       │   │       │   └── JobSummaryCard.tsx
│       │   │       ├── customer/     # Customer-specific components
│       │   │       │   ├── CustomerJobActions.tsx
│       │   │       │   └── CustomerJobCreateForm.tsx
│       │   │       └── courier/      # Courier-specific components
│       │   │           └── CourierJobActions.tsx
│       │   ├── hooks/
│       │   │   └── v2/               # Custom React hooks
│       │   │       ├── useAuthUser.ts
│       │   │       ├── useUserRole.ts
│       │   │       ├── useJob.ts
│       │   │       ├── useJobsList.ts
│       │   │       └── useNearbyCouriers.ts
│       │   └── lib/
│       │       ├── firebase/         # Firebase client initialization
│       │       ├── storage/          # Storage upload helpers
│       │       └── v2/               # Core business logic
│       │           ├── types.ts      # Shared TypeScript types
│       │           ├── jobs.ts       # Job CRUD operations
│       │           ├── pricing.ts    # Fee calculation
│       │           └── floorRateCard.ts
│       ├── Dockerfile                # Production container
│       ├── next.config.js
│       └── package.json
├── packages/
│   └── shared/                       # Shared across monorepo
│       └── src/
│           ├── types/
│           │   └── firestore.ts      # Firestore document types
│           └── stateMachine/
│               └── jobTransitions.ts # Job status state machine
├── firebase/
│   ├── firestore.rules               # Database security rules
│   └── storage.rules                 # Storage security rules
├── docs/
│   ├── PROJECT_CONTEXT.md            # This file
│   ├── PROJECT_STATUS.md             # Deployment info
│   ├── blueprint.md                  # Original Flutter vision (deprecated)
│   └── deploy/
│       └── cloud-run.md              # Deployment guide
├── scripts/
│   ├── deploy-cloudrun-web.sh        # Cloud Run deployment script
│   └── audit-repo.sh                 # Repo health check
├── firebase.json                     # Firebase project config
├── package.json                      # Root workspace scripts
└── pnpm-workspace.yaml               # pnpm workspace definition
```

---

## 🎯 Product Features

### Customer Flow

1. **Authentication** → Email/password login (auto-creates account if new)
2. **Role Selection** → First-time users select "Customer" role
3. **Create Job** → `/customer/jobs/new`
   - Enter pickup address (Mapbox autocomplete)
   - Enter dropoff address
   - Select package size (small/medium/large/xl)
   - Add package flags:
     - 🚐 Needs SUV/Van
     - 💎 Fragile
     - 💪 Heavy (2+ people)
     - 📦 Oversized
     - 🪜 Stairs
   - Add optional notes (max 300 chars)
   - **Upload up to 5 photos** (JPG/PNG/WEBP, 10MB max each)
   - See real-time price estimate from nearby couriers
   - Submit job → Job enters "open" status
4. **Job List** → `/customer/jobs`
   - See all jobs (any status)
   - Click to view details
5. **Job Details** → `/customer/jobs/[jobId]`
   - See full job info with package photos
   - See courier info once assigned
   - Track real-time status updates
   - Cancel job (if status is "open" or "assigned")

### Courier Flow

1. **Authentication** → Email/password login
2. **Role Selection** → Select "Courier" role
3. **Setup Profile** → `/courier/setup` (first time)
   - Set online/offline status
   - Choose transport mode (car/bicycle)
   - Set rate card (base fee + per mile)
   - Set current location
4. **Dashboard** → `/courier/dashboard`
   - Toggle online/offline
   - View open jobs within service radius
   - See job previews with:
     - Masked pickup/dropoff addresses (until accepted)
     - Distance and estimated earnings
     - Package details with photos (once visible)
5. **Accept Job** → Transition to "assigned" status
6. **Job Details** → `/courier/jobs/[jobId]`
   - See exact addresses after accepting
   - See full package details and photos
   - Update status through workflow:
     - assigned → enroute_pickup
     - enroute_pickup → arrived_pickup
     - arrived_pickup → picked_up
     - picked_up → enroute_dropoff
     - enroute_dropoff → arrived_dropoff
     - arrived_dropoff → completed
7. **Completed** → Job marked complete, courier paid

---

## 📦 Package Details Feature (Recently Completed)

### Implementation Status: ✅ Complete

The package details system allows customers to specify size, requirements, notes, and **upload photos** during job creation. Couriers can view these details with visibility rules applied.

#### Components Created

**Shared Components** (`features/jobs/shared/`):

- `PackageBadges.tsx` - Color-coded size badges + flag badges with emoji icons
- `PhotoGallery.tsx` - Thumbnail grid (shows 3, click for modal) + lightbox
- `AddressBlock.tsx` - Displays addresses with masking based on viewer role
- `PackageDetailsPanel.tsx` - Combines package badges + photo gallery
- `JobStatusPills.tsx` - Status badge display (9 statuses)
- `JobDetailsPanel.tsx` - Complete job info panel
- `JobSummaryCard.tsx` - Compact job card for list views

**Customer Components** (`features/jobs/customer/`):

- `CustomerJobCreateForm.tsx` - Full job creation form with photo upload
- `CustomerJobActions.tsx` - Cancel button with validation

**Courier Components** (`features/jobs/courier/`):

- `CourierJobActions.tsx` - Accept job + status progression buttons

#### Type System

**Package Types** (`lib/v2/types.ts`):

```typescript
type PackageSize = "small" | "medium" | "large" | "xl";

interface PackageFlags {
  needsSuvVan?: boolean; // 🚐
  fragile?: boolean; // 💎
  heavyTwoPerson?: boolean; // 💪
  oversized?: boolean; // 📦
  stairs?: boolean; // 🪜
}

interface JobPackage {
  size: PackageSize;
  flags: PackageFlags;
  notes?: string; // Max 300 chars
}

interface JobPhoto {
  url: string; // Download URL
  path: string; // Storage path
  uploadedAt: Timestamp;
  uploadedBy: string; // User ID
}
```

#### Privacy Rules (`features/jobs/shared/privacy.ts`)

```typescript
function getJobVisibility(job: Job, viewerUid: string): JobVisibility {
  const isCustomer = job.createdByUid === viewerUid;
  const isCourier = job.courierUid === viewerUid;
  const isAssigned = job.status !== "open";

  return {
    // Customer sees all, courier sees exact addresses after accepting
    canSeeExactAddresses: isCustomer || (isCourier && isAssigned),
    // Everyone can see photos
    canSeePhotos: true,
    // Customer + assigned courier see customer info
    canSeeCustomerInfo: isCustomer || (isCourier && isAssigned),
  };
}
```

#### Storage System

**Photo Upload** (`lib/storage/uploadJobPhoto.ts`):

- Validates file type (JPG/PNG/WEBP only)
- Validates file size (10MB max)
- Uploads to `jobs/{jobId}/photos/{timestamp}_{random}.{ext}`
- Returns download URL + storage path
- Supports progress callbacks

**Temporary Upload Pattern**:

- Uses `temp_{timestamp}_{random}` job IDs during creation
- Storage rules allow authenticated users to upload to `temp_*` paths
- Photos moved/referenced once job is created

**Storage Rules** (`firebase/storage.rules`):

```
// Temp uploads
match /jobs/{tempId}/photos/{photoFile} {
  allow write: if isSignedIn() && isValidImage() && tempId.matches('temp_.*');
  allow read: if isSignedIn() && tempId.matches('temp_.*');
}

// Real job photos
match /jobs/{jobId}/photos/{photoFile} {
  allow write: if isSignedIn() && isJobCreator(jobId) && isValidImage();
  allow read: if isSignedIn() && (isJobCreator(jobId) || isAssignedCourier(jobId) || isJobOpen(jobId));
}
```

#### UI Integration

**Customer Job Creation**:

1. Customer fills out addresses
2. Selects package size via radio buttons
3. Toggles flags via checkboxes
4. Adds optional notes
5. Uses `<PhotoUploader>` component to select and upload up to 5 photos
6. Photos upload immediately to temp path with progress indicators
7. On submit, `photos` array included in job document

**Job Display**:

- **Customer job list**: Shows package badges only (no photos in summary)
- **Customer job details**: Shows full `<PackageDetailsPanel>` with photos
- **Courier dashboard**: Shows package badges in job previews
- **Courier job details**: Shows full `<PackageDetailsPanel>` after accepting

---

## 🔥 Firebase Architecture

### Database (Firestore)

**Collections:**

**`users/{uid}`:**

```typescript
{
  role: 'customer' | 'courier';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  courier?: {  // Only if role === 'courier'
    isOnline: boolean;
    location?: GeoPoint;
    geohash?: string;
    transportMode: 'car' | 'bicycle';
    rateCard: {
      baseFee: number;
      perMile: number;
    };
  };
}
```

**`jobs/{jobId}`:**

```typescript
{
  createdByUid: string;
  status: JobStatus;  // See state machine below
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package: {
    size: PackageSize;
    flags: PackageFlags;
    notes?: string;
  };
  photos?: JobPhoto[];
  courierUid?: string;
  estimatedFee?: number;
  actualFee?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  completedAt?: Timestamp;
}
```

### Job Status State Machine

Defined in `packages/shared/src/stateMachine/jobTransitions.ts`:

```
open
  ↓ (courier accepts)
assigned
  ↓ (courier starts driving)
enroute_pickup
  ↓ (courier arrives at pickup)
arrived_pickup
  ↓ (courier picks up package)
picked_up
  ↓ (courier starts driving to dropoff)
enroute_dropoff
  ↓ (courier arrives at dropoff)
arrived_dropoff
  ↓ (courier delivers package)
completed

// Special states (branching):
cancelled (from open/assigned)
expired (from open after timeout)
failed (from any active state)
```

**Valid Transitions:**

```typescript
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  open: ["assigned", "cancelled", "expired"],
  assigned: ["enroute_pickup", "cancelled"],
  enroute_pickup: ["arrived_pickup", "failed"],
  arrived_pickup: ["picked_up", "failed"],
  picked_up: ["enroute_dropoff", "failed"],
  enroute_dropoff: ["arrived_dropoff", "failed"],
  arrived_dropoff: ["completed", "failed"],
  completed: [],
  cancelled: [],
  expired: [],
  failed: [],
};
```

### Security Rules

**Firestore** (`firebase/firestore.rules`):

- Users can read/write their own user doc
- Couriers can write `location`, `geohash`, `isOnline`, `transportMode`, `rateCard`
- Jobs readable by creator or assigned courier
- Jobs readable by all online couriers while status is "open"
- Jobs writable by creator (for creation and cancellation)
- Jobs status updatable by assigned courier only

**Storage** (`firebase/storage.rules`):

- See "Storage System" section above
- Validates image types and 10MB size limit
- Temp uploads for job creation flow
- Real job photos restricted to job creator and assigned courier

---

## 🚀 Deployment

### Production Setup

**Cloud Run Service:** `gosenderr-web`

- Region: `us-central1`
- Container: Next.js standalone server
- Auto-scaling: 0-100 instances
- Memory: 512MB per instance

**Firebase Hosting:** `gosenderr-6773f`

- Custom domain support
- Rewrites all routes to Cloud Run service
- CDN caching for static assets

### Deploy Commands

```bash
# Deploy everything
pnpm deploy:web

# Deploy Cloud Run only
pnpm deploy:web:run

# Deploy Firebase Hosting only
pnpm deploy:web:hosting
```

### Environment Variables

Required in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_MAPBOX_TOKEN=...
```

---

## 📱 Routes Reference

| Route                    | Auth | Role     | Description                                 |
| ------------------------ | ---- | -------- | ------------------------------------------- |
| `/`                      | No   | -        | Redirects to `/login`                       |
| `/login`                 | No   | -        | Email/password auth (auto-creates accounts) |
| `/select-role`           | Yes  | -        | Choose customer or courier role             |
| `/customer/jobs`         | Yes  | Customer | List all jobs                               |
| `/customer/jobs/new`     | Yes  | Customer | Create new delivery job                     |
| `/customer/jobs/[jobId]` | Yes  | Customer | View job details + cancel                   |
| `/courier/setup`         | Yes  | Courier  | Initial profile setup                       |
| `/courier/dashboard`     | Yes  | Courier  | View open jobs + toggle online              |
| `/courier/jobs/[jobId]`  | Yes  | Courier  | View job + update status                    |
| `/v2`                    | -    | -        | Legacy redirect to `/`                      |
| `/v2/[...slug]`          | -    | -        | Legacy catch-all redirect                   |

---

## 🔧 Development

### Local Setup

```bash
# Install dependencies
pnpm install

# Build shared package
cd packages/shared && pnpm build

# Run dev server
pnpm dev
```

Dev server runs at `http://localhost:3000`

### Type Checking

```bash
pnpm type-check
```

### Building

```bash
pnpm build
```

### Testing Workflow

1. Create customer account → Select "Customer" role
2. Create job with package details and photos
3. Create courier account → Select "Courier" role
4. Set location and go online in setup
5. View open job in courier dashboard
6. Accept job → See full details + photos
7. Progress through status workflow
8. Mark as completed

---

## 📚 Key Patterns

### Shared Component Architecture

All job-related UI follows this pattern:

1. **Shared types** in `features/jobs/shared/types.ts`
2. **Privacy logic** in `features/jobs/shared/privacy.ts`
3. **Display components** in `features/jobs/shared/` (stateless, pure rendering)
4. **Action components** in role-specific folders (`customer/`, `courier/`)
5. **Pages** in `app/` compose shared + action components

**Example:**

```tsx
// Page (apps/web/src/app/customer/jobs/[jobId]/page.tsx)
<JobDetailsPanel job={job} viewerUid={uid}>
  <CustomerJobActions job={job} uid={uid} />
</JobDetailsPanel>

// Page (apps/web/src/app/courier/jobs/[jobId]/page.tsx)
<JobDetailsPanel job={job} viewerUid={uid}>
  <CourierJobActions job={job} uid={uid} />
</JobDetailsPanel>
```

This eliminates duplication and ensures consistent behavior.

### Real-time Data Hooks

All Firebase queries use custom hooks:

- `useAuthUser()` - Current auth user
- `useUserRole()` - Current user's role
- `useJob(jobId)` - Real-time job document
- `useJobsList(uid, role)` - Real-time job list query
- `useNearbyCouriers(pickup, dropoff)` - Nearby couriers with estimates

These hooks:

- Subscribe to Firestore real-time updates
- Handle loading states
- Return clean TypeScript types
- Auto-cleanup on unmount

### Pricing System

**Floor Rate Card** (`lib/v2/floorRateCard.ts`):

```typescript
{
  baseFee: 5,     // $5 base
  perMile: 1.5,   // $1.50 per mile
}
```

**Courier Discovery**:

1. Find couriers within 10 miles of pickup
2. Filter by transport mode requirements
3. Calculate fee using courier's rate card
4. Show lowest fee to customer
5. Fall back to floor rate if no eligible couriers

---

## 🐛 Known Issues & TODOs

### Cleanup Needed

1. **Duplicate components**: `components/v2/PackageBadges.tsx` and `components/v2/PhotoGallery.tsx` exist but are NOT used. Should be deleted (features/jobs/shared/ versions are the canonical ones).

2. **README references non-existent archive folder**: Update README.md to remove mentions of `archive/flutter/` (it doesn't exist).

3. **Blueprint.md is outdated**: The Flutter-focused blueprint is deprecated. Should be archived in docs/history/.

### Feature Enhancements

- [ ] Add map view to job details pages
- [ ] Add push notifications for status updates
- [ ] Add payment integration (Stripe)
- [ ] Add customer ratings for couriers
- [ ] Add delivery proof photos (courier uploads at completion)
- [ ] Add job search/filtering in customer job list
- [ ] Add earnings history for couriers

### Tech Debt

- [ ] Add unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Add error boundaries to key pages
- [ ] Add Sentry for error tracking
- [ ] Add analytics (PostHog or similar)
- [ ] Optimize bundle size (lazy load heavy components)

---

## 🎓 Learning Resources

**Next.js App Router:**

- https://nextjs.org/docs/app

**Firebase:**

- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/firestore
- https://firebase.google.com/docs/storage

**Mapbox:**

- https://docs.mapbox.com/mapbox-gl-js/guides/

**TypeScript:**

- https://www.typescriptlang.org/docs/

---

## 📞 Support

For questions or issues:

1. Check existing docs in `docs/` folder
2. Review Firebase console for live data
3. Check Cloud Run logs in GCP console
4. Review code in `apps/web/src/`

---

**Last Major Update:** Package photo upload feature completed and deployed.
**Build Status:** ✅ Type-check passing, build successful (11 routes)
**Deployment Status:** ✅ Live on Cloud Run + Firebase Hosting

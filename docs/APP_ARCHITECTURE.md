# GoSenderr App Architecture

## Overview

GoSenderr is a monorepo containing 5 role-based web applications built with Vite + React + TypeScript. Each app is optimized for mobile-first delivery workflows with dedicated hosting on Firebase.

## Application Structure

### 1. Marketplace App (`apps/marketplace-app`) 

**Purpose**: Create and track delivery jobs

**Port**: 5173  
**Hosting**: `gosenderr-customer.web.app`

**Key Features**:
- Job creation with map-based address selection
- Real-time job tracking with live courier location
- Payment processing via Stripe
- Courier rating system
- Job history and status updates

**Navigation** (3 tabs):
- 🏠 Home - Dashboard with job creation
- 📦 Jobs - Active and past jobs list
- ⚙️ Settings - Profile and preferences

**Routes**:
```
/login
/dashboard
/jobs
/jobs/:id
/settings
```

---

### 2. Courier App (`apps/courier-app`)

**Purpose**: Accept and complete individual delivery jobs

**Port**: 5174  
**Hosting**: `gosenderr-courier.web.app`

**Key Features**:
- **Map Shell Dashboard**: Full-screen map with floating UI overlay
  - Swipeable bottom sheet showing available jobs
  - Floating online/offline toggle button
  - Job filter controls
  - Real-time location tracking indicator
- Job acceptance with instant notification
- Photo capture for pickup/dropoff verification
- Earnings dashboard with payout history
- Stripe Connect onboarding for payouts
- Equipment and rate card management

**Navigation** (4 tabs):
- 🏠 Dashboard - Map shell with available jobs
- 📦 Active - Currently assigned job details
- 💰 Earnings - Completed jobs and payouts
- ⚙️ Settings - Profile, equipment, Stripe setup

**Routes**:
```
/login
/dashboard (map shell)
/jobs
/jobs/:id
/earnings
/settings
/equipment
/rate-cards
/stripe-setup
```

**Dashboard Architecture**:
```tsx
<div className="relative h-screen overflow-hidden">
  {/* Full-screen background map */}
  <MapboxMap height="100%" />
  
  {/* Floating controls layer (z-20) */}
  <button className="absolute top-4 right-4">🟢 Online</button>
  <button className="absolute top-4 left-4">🔍 Filters</button>
  <div className="absolute top-4 left-1/2">📍 Tracking Active</div>
  
  {/* Bottom sheet with job cards (z-10) */}
  <div className="absolute bottom-0 rounded-t-3xl max-h-[60vh]">
    <div className="drag-handle" />
    <h2>Available Sends (3)</h2>
    {jobCards.map(...)}
  </div>
</div>
```

---

### 3. Runner/Shifter App (`apps/shifter-app`)

**Purpose**: Manage bulk delivery routes with multiple stops

**Port**: 5175  
**Hosting**: `gosenderr-runner.web.app`

**Key Features**:
- Route acceptance (multiple jobs bundled)
- Sequential multi-stop deliveries
- Route-level earnings tracking
- Job organization by route
- Optimized stop order display

**Navigation** (5 tabs):
- 🏠 Home - Dashboard overview
- 🛣️ Routes - Available routes to accept
- 📦 Jobs - All jobs within accepted routes
- 💰 Earnings - Route earnings and statistics
- ⚙️ Settings - Profile and preferences

**Routes**:
```
/login
/dashboard
/available-routes
/routes
/routes/:id
/jobs
/jobs/:id
/earnings
/settings
```

**Status**: 85% complete - Map shell pending implementation

---

### 4. Admin App (`apps/admin-app`)

**Purpose**: Platform management and monitoring

**Port**: 5176  
**Hosting**: `gosenderr-admin.web.app`

**Key Features**:
- User management (customers, couriers, runners)
- Job monitoring system-wide
- Hub/zone creation and management
- Rate card configuration
- Platform analytics and reports
- Role assignment and permissions

**Navigation** (5 tabs):
- 🏠 Dashboard - Platform metrics
- 👥 Users - User management
- 📦 Jobs - Job monitoring
- 📍 Hubs - Hub configuration
- ⚙️ Settings - Admin settings

**Routes**:
```
/login
/dashboard
/users
/users/:id
/jobs
/jobs/:id
/hubs
/rate-cards
/analytics
/settings
```

**Status**: 95% complete - UI polish in progress

---

### 5. Landing Page (`apps/landing`)

**Purpose**: Role selection entry point

**Hosting**: `gosenderr-6773f.web.app` (default Firebase site)

**Features**:
- Role selection buttons (Customer, Courier, Runner, Admin)
- Redirects to appropriate app login page
- Branding and marketing content

**Routes**:
```
/ (role selection)
```

---

## Tech Stack

### Frontend
- **Build Tool**: Vite 6.4.1
- **Framework**: React 18
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS (mobile-first)
- **Routing**: React Router v6

### Backend
- **Authentication**: Firebase Auth (Phone + Email)
- **Database**: Cloud Firestore
- **Storage**: Firebase Cloud Storage
- **Functions**: Firebase Cloud Functions (Node.js)

### Third-Party Services
- **Maps**: Mapbox GL JS
- **Payments**: Stripe Checkout + Stripe Connect
- **Hosting**: Firebase Hosting (separate sites per app)

### Development Tools
- **Package Manager**: pnpm (workspaces)
- **Monorepo**: Turborepo (planned)
- **Linting**: ESLint + TypeScript ESLint
- **Formatting**: Prettier (implicit via ESLint)

---

## Shared Package

**Location**: `packages/shared`

**Purpose**: Shared TypeScript types and utilities used across all apps

**Exports**:
```typescript
// Firestore document types
export type UserDoc = { ... }
export type JobDoc = { ... }
export type RouteDoc = { ... }
export type RateCardDoc = { ... }
export type HubDoc = { ... }

// Enums
export enum JobStatus { idle, open, assigned, ... }
export enum UserRole { customer, courier, runner, admin }

// Utilities
export const jobStateMachine = { ... }
export const formatCurrency = (amount: number) => string
```

**Build**: TypeScript compilation to `dist/`  
**Consumption**: All apps import via `@gosenderr/shared`

---

## Design System

### Color Scheme

**Background**:
- Primary: `#F8F9FF` (light purple tint)
- Cards: `white` with subtle shadow

**Accent Colors by Role**:
- **Customer**: Blue (`blue-500`, `blue-600`)
- **Courier**: Emerald (`emerald-500`, `emerald-600`)
- **Runner**: Orange (`orange-500`, `orange-600`)
- **Admin**: Purple (`purple-500`, `purple-600`)

### Typography
- **Font**: System font stack (SF Pro, Segoe UI, Roboto)
- **Headings**: `text-2xl font-bold`
- **Body**: `text-base`
- **Small**: `text-sm text-gray-600`

### Components

**Bottom Navigation**:
- Fixed at bottom: `fixed bottom-0 left-0 right-0`
- Height: `h-20` (80px)
- Background: `bg-white border-t`
- Active state: Role-specific color with `bg-[color]-50` background
- Items: Centered with icon + label

**Map Shell** (Courier/Runner):
- Full viewport height: `h-screen`
- Map: `position: absolute, top: 0, left: 0, right: 0, bottom: 0`
- Floating buttons: `absolute top-4 left-4/right-4 z-20`
- Bottom sheet: `absolute bottom-0 z-10 rounded-t-3xl max-h-[60vh]`

**Cards**:
- Padding: `p-4` or `p-6`
- Rounded: `rounded-lg`
- Shadow: `shadow-sm`
- Border: Optional `border border-gray-200`

---

## Authentication Flow

### Landing Page → Role Selection
1. User visits `gosenderr-6773f.web.app`
2. Clicks role button (Customer/Courier/Runner/Admin)
3. Redirected to `gosenderr-[role].web.app/login`

### Login Page
1. Phone number input with country code selector
2. Firebase sends verification code via SMS
3. User enters 6-digit code
4. On success:
   - Check if user doc exists in Firestore
   - If new user: Create `users/{uid}` with selected role
   - Redirect to `/dashboard`

### Protected Routes
- All routes except `/login` require authentication
- Middleware checks `currentUser` from Firebase Auth
- Unauthorized users redirected to `/login`
- Role mismatch shows error (e.g., admin trying to access customer app)

---

## Data Model

### Firestore Collections

**`users/{uid}`**
```typescript
{
  role: "customer" | "courier" | "runner" | "admin"
  phone: string
  displayName?: string
  email?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  // Courier-specific
  isOnline?: boolean
  currentLocation?: { lat: number, lng: number }
  stripeAccountId?: string
  // Runner-specific
  activeRouteId?: string
}
```

**`jobs/{jobId}`**
```typescript
{
  createdByUid: string
  assignedCourierUid: string | null
  status: JobStatus
  pickup: { lat: number, lng: number, label: string }
  dropoff: { lat: number, lng: number, label: string }
  courierLocation?: { lat: number, lng: number, updatedAt: Timestamp }
  pickupPhotoUrl?: string
  dropoffPhotoUrl?: string
  priceCents: number
  payoutCents: number  // Courier earnings
  rateCardId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  acceptedAt?: Timestamp
  completedAt?: Timestamp
}
```

**`routes/{routeId}`**
```typescript
{
  name: string
  assignedRunnerUid: string | null
  status: "open" | "assigned" | "in_progress" | "completed"
  jobIds: string[]  // References to jobs in this route
  hubId: string
  totalPayoutCents: number
  createdAt: Timestamp
  scheduledDate: Timestamp
}
```

**`hubs/{hubId}`**
```typescript
{
  name: string
  location: { lat: number, lng: number }
  address: string
  isActive: boolean
  coverageRadiusMiles: number
  createdAt: Timestamp
}
```

**`rateCards/{rateCardId}`**
```typescript
{
  name: string
  basePriceCents: number
  perMileCents: number
  courierPayoutPercent: number  // e.g., 80 = 80%
  isActive: boolean
  createdAt: Timestamp
}
```

---

## Deployment

### Firebase Hosting Configuration

**`firebase.json`**:
```json
{
  "hosting": [
    {
      "site": "gosenderr-customer",
      "public": "apps/marketplace-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-courier",
      "public": "apps/courier-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-runner",
      "public": "apps/shifter-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-admin",
      "public": "apps/admin-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-6773f",
      "public": "apps/landing/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  ]
}
```

### Build & Deploy Process

**Build**:
```bash
pnpm build  # Builds all apps + shared package
# Each app outputs to apps/[app-name]/dist/
```

**Deploy**:
```bash
# Individual apps
firebase deploy --only hosting:gosenderr-customer
firebase deploy --only hosting:gosenderr-courier
firebase deploy --only hosting:gosenderr-runner
firebase deploy --only hosting:gosenderr-admin

# All at once
firebase deploy --only hosting
```

**CI/CD**: Google Cloud Build configured for automatic deployment on main branch push

---

## Environment Variables

Each app requires a `.env.local` file (gitignored):

```env
# Firebase Config
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App Role (automatically set per app)
VITE_APP_ROLE=customer  # or courier, runner, admin
```

**Security**: Never commit `.env.local` files. Use `.env.example` as template.

---

## Migration Status

### From Next.js Monolith (`apps/web`) to Vite Apps

| Feature | Customer | Courier | Runner | Admin |
|---------|----------|---------|--------|-------|
| Authentication | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| Bottom Nav | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| Dashboard | ✅ 100% | ✅ 100% | ⚠️ 85% | ✅ 100% |
| Job Management | ✅ 100% | ✅ 100% | ⚠️ 90% | ✅ 100% |
| Map Integration | ✅ 100% | ✅ 100% | ⏳ 50% | N/A |
| Map Shell | N/A | ✅ 100% | ⏳ 0% | N/A |
| Payments | ✅ 100% | ✅ 95% | ✅ 95% | N/A |
| Settings | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Overall** | **✅ 100%** | **✅ 90%** | **⚠️ 85%** | **✅ 95%** |

**Legend**:
- ✅ Complete and tested
- ⚠️ Functional but needs polish
- ⏳ In progress
- N/A Not applicable

**Next Priorities**:
1. Runner map shell implementation (4-6 hours)
2. Admin UI consistency polish (2-3 hours)
3. End-to-end testing all flows (4-6 hours)

---

## Development Workflow

### Starting Development

1. Install dependencies: `pnpm install`
2. Build shared package: `cd packages/shared && pnpm build`
3. Configure `.env.local` for each app
4. Start dev servers: `pnpm dev` (or individual `cd apps/[app] && pnpm dev`)
5. Open browsers at respective ports (5173-5176)

### Making Changes

1. **Types**: Update `packages/shared/src/types/`, rebuild with `pnpm build`
2. **Components**: Create in `apps/[app]/src/components/`
3. **Pages**: Add to `apps/[app]/src/pages/` with route in `App.tsx`
4. **API calls**: Use Firebase SDK in `apps/[app]/src/services/`
5. **Test locally**: Hot reload shows changes instantly

### Adding New Features

1. Create feature branch: `git checkout -b feature/[name]`
2. Implement in relevant app(s)
3. Test in development
4. Commit with descriptive message
5. Push and deploy: `pnpm deploy:[app]`
6. Verify in production

### Code Organization

```
apps/[app-name]/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── BottomNav.tsx
│   │   ├── MapboxMap.tsx
│   │   └── JobCard.tsx
│   ├── layouts/          # Layout wrappers
│   │   └── [Role]Layout.tsx
│   ├── pages/            # Route pages
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── settings/
│   │   └── Login.tsx
│   ├── services/         # API/Firebase calls
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   └── stripe.ts
│   ├── hooks/            # Custom React hooks
│   │   └── useCurrentUser.ts
│   ├── utils/            # Helper functions
│   ├── App.tsx           # Route configuration
│   ├── main.tsx          # App entry point
│   └── index.css         # Global styles (Tailwind)
├── public/               # Static assets
├── .env.local            # Environment variables (gitignored)
├── .env.example          # Environment template
├── index.html            # HTML entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Performance Considerations

### Bundle Size
- **Target**: < 500KB gzipped per app
- **Current**: ~350KB average
- **Optimization**: Code splitting, lazy loading routes

### Map Performance
- Use Mapbox GL JS (GPU-accelerated)
- Limit markers to visible viewport
- Cluster markers when > 100 jobs
- Debounce location updates (1 second)

### Firestore Queries
- Use indexes for complex queries
- Limit results to 50 per page
- Real-time listeners only for active data
- Unsubscribe when component unmounts

### Image Optimization
- Compress pickup/dropoff photos to 1024x1024
- Use WebP format where supported
- Lazy load images below fold

---

## Security

### Firestore Rules
- Users can only read/write their own user doc
- Jobs readable by creator and assigned courier/runner
- Only admins can write to hubs, rate cards
- All writes require authentication

### Storage Rules
- Only authenticated users can upload
- Max file size: 10MB
- Allowed types: image/jpeg, image/png
- Path must match: `photos/{uid}/{filename}`

### API Keys
- Mapbox token restricted to allowed domains
- Stripe keys use test mode in development
- Firebase API key public but protected by rules

---

## Testing Strategy

### Manual Testing Checklist
1. ✅ Login with phone auth (all apps)
2. ✅ Role selection and routing
3. ✅ Bottom navigation (all tabs)
4. ✅ Create job (customer)
5. ✅ Accept job (courier)
6. ✅ Complete job (courier)
7. ✅ View earnings (courier/runner)
8. ⏳ Accept route (runner)
9. ⏳ Complete route (runner)
10. ✅ Admin user management
11. ✅ Admin job monitoring

### Automated Testing
- **Planned**: Playwright E2E tests
- **Coverage**: Critical flows (login, job creation, acceptance)
- **CI**: Run on every PR

---

## Troubleshooting

### Dev Server Won't Start
- Check node version: `node -v` (should be ≥18)
- Clear cache: `rm -rf node_modules && pnpm install`
- Check ports: `lsof -ti:5173` (kill if occupied)

### Mapbox Not Showing
- Verify `VITE_MAPBOX_TOKEN` in `.env.local`
- Check browser console for 401 errors
- Ensure token has `styles:read` scope

### Firebase Auth Errors
- Check Firebase config in `.env.local`
- Verify project ID matches Firebase console
- Enable Phone Auth in Firebase console

### Build Errors
- Rebuild shared package: `cd packages/shared && pnpm build`
- Check TypeScript errors: `pnpm run type-check`
- Clear Vite cache: `rm -rf apps/[app]/node_modules/.vite`

---

## Future Roadmap

### Short-term (Q1 2025)
- ✅ Complete runner map shell
- ⏳ E2E testing with Playwright
- ⏳ Admin analytics dashboard
- ⏳ Push notifications

### Mid-term (Q2 2025)
- ⏳ Real-time chat (customer ↔ courier)
- ⏳ Mobile apps (Capacitor or React Native)
- ⏳ Advanced route optimization algorithms
- ⏳ Multi-language support

### Long-term (Q3-Q4 2025)
- ⏳ White-label solution for other markets
- ⏳ API for third-party integrations
- ⏳ Machine learning for demand prediction
- ⏳ Driver marketplace features

---

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow Tailwind utility-first approach
- Components use named exports
- Prefer functional components with hooks
- Use `async/await` over `.then()` chains

### Commit Messages
```
feat(courier): add map shell dashboard
fix(customer): resolve job tracking map markers
docs: update README with new architecture
chore: upgrade Vite to 6.4.1
```

### Pull Requests
1. Create feature branch from `main`
2. Implement changes with tests
3. Update relevant documentation
4. Submit PR with clear description
5. Wait for CI checks to pass
6. Request review from team

---

## Resources

- **Vite Docs**: https://vite.dev
- **React Docs**: https://react.dev
- **Firebase Docs**: https://firebase.google.com/docs
- **Mapbox GL JS**: https://docs.mapbox.com/mapbox-gl-js
- **Stripe Docs**: https://stripe.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Last Updated**: January 2025  
**Document Owner**: Development Team  
**Status**: Living document - update as architecture evolves

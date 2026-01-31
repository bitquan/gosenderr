# GoSenderr Monorepo

[![CI: Emulators & Tests](https://github.com/bitquan/gosenderr/actions/workflows/emulator-tests.yml/badge.svg?branch=main)](https://github.com/bitquan/gosenderr/actions/workflows/emulator-tests.yml)


A modern on-demand delivery platform with web apps (Vite + React + TypeScript) that can be packaged as native iOS and Android apps using Capacitor.

## 🏗️ Project Structure

```
/
├── apps/
│   ├── customer-app/     # Vite Customer Web App (Port 5173)
│   ├── courier-app/      # Vite Courier Web App (Port 5174)
│   ├── shifter-app/      # Vite Runner/Shifter Web App (Port 5175)
│   ├── admin-app/        # Vite Admin Dashboard (Port 5176)
│   ├── landing/          # Role Selection Landing Page
│   └── web/              # Legacy Next.js App (deprecated)
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── firebase/             # Firebase security rules and Cloud Functions
└── docs/                 # Project documentation
    └── project-plan/      # Project reorganization plan (v2) — see `docs/project-plan/README.md`
```

**Note**: All web apps can be packaged as native iOS and Android apps using Capacitor.

## ✅ Testing & Deployment

See the emulator-first rollout checklist in [docs/TESTING_DEPLOYMENT_PLAN.md](docs/TESTING_DEPLOYMENT_PLAN.md).

## 📱 Active Applications

| App | Port | Hosting URL | Purpose |
|-----|------|-------------|---------|
| Customer | 5173 | gosenderr-customer.web.app | Create and track deliveries |
| Courier | 5174 | gosenderr-courier.web.app | Accept and complete individual jobs |
| Shifter/Runner | 5175 | gosenderr-runner.web.app | Manage routes and bulk deliveries |
| Admin | 5176 | gosenderr-admin.web.app | Platform management |
| Landing | - | gosenderr-6773f.web.app | Role selection entry point |

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Firebase project with Auth, Firestore, and Storage enabled
- Mapbox account with access token
- Stripe account for payments (optional for dev)

### Installation

1. **Clone and install dependencies:**

```bash
pnpm install
```

2. **Configure environment variables:**

Each app needs its own `.env.local` file:

```bash
# Customer App
cp apps/customer-app/.env.example apps/customer-app/.env.local

# Courier App
cp apps/courier-app/.env.example apps/courier-app/.env.local

# Runner App
cp apps/shifter-app/.env.example apps/shifter-app/.env.local

# Admin App
cp apps/admin-app/.env.example apps/admin-app/.env.local
```

Required variables for all apps:

- `VITE_FIREBASE_API_KEY` - From Firebase Console > Project Settings
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_MAPBOX_TOKEN` - From https://mapbox.com
- `VITE_APP_ROLE` - Set automatically per app (customer/courier/runner/admin)

3. **Build shared package:**

```bash
cd packages/shared
pnpm build
cd ../..
```

4. **Run development servers:**

### 🎯 Phase 1: Admin Desktop App (Electron)

**One-command startup** for Phase 1 Admin Desktop development:

```bash
# Native startup (recommended)
pnpm dev:admin-desktop

# Or using VS Code tasks (easier)
# Press Cmd+Shift+P → "Tasks: Run Task" → "🎯 Phase 1: Admin Desktop Dev"

# Using Docker Compose
pnpm dev:admin-desktop:docker

# Stop all services
pnpm stop:admin-desktop
```

This automatically starts:
1. Firebase Emulators (Auth, Firestore, Storage, Functions)
2. Vite Dev Server (port 5176)
3. Electron App

**Service URLs:**
- Admin Desktop: Electron native window
- Vite Dev Server: http://localhost:5176
- Firebase Emulator UI: http://localhost:4000
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- Storage: http://localhost:9199

---

### 🌐 All Apps (Legacy Vite Web Apps)

```bash
# Run all apps
pnpm dev

# Or run individual apps
cd apps/customer-app && pnpm dev   # Port 5173
cd apps/courier-app && pnpm dev    # Port 5174
cd apps/admin-app && pnpm dev      # Port 3000
```

**Docker-based development:** If you prefer a reproducible, containerized setup that includes the Firebase emulators and app dev servers, use:

```bash
pnpm dev:docker   # or bash scripts/dev-docker-up.sh
```

See `docs/DEVELOPMENT.md` for details and troubleshooting.

Apps will be available at:
- Customer: http://localhost:5173
- Courier: http://localhost:5174
- Runner: http://localhost:5175
- Admin: http://localhost:5176

## 🚢 Deployment

Each app is deployed separately to Firebase Hosting:

```bash
# Deploy individual apps
pnpm deploy:customer
pnpm deploy:courier
pnpm deploy:runner
pnpm deploy:admin

# Deploy all apps
pnpm deploy:all
```

Firebase Hosting sites:
- Customer: `gosenderr-customer`
- Courier: `gosenderr-courier`
- Runner: `gosenderr-runner`
- Admin: `gosenderr-admin`
- Landing: `gosenderr-6773f` (default site)

## 📱 Features

### Customer App (`apps/customer-app`)

- **Authentication**: Phone Auth with Firebase + Email fallback
- **Job Creation**: Create delivery jobs with pickup/dropoff locations via map or address search
- **Job Tracking**: Real-time status updates with live map showing courier location
- **Payment**: Stripe integration for job payments
- **Rating System**: Rate couriers after delivery completion
- **Bottom Navigation**: Home, Jobs, Settings tabs

### Courier App (`apps/courier-app`)

- **Map Shell Dashboard**: Full-screen map with floating controls and swipeable bottom sheet
- **Job Discovery**: See available jobs on map with distance and payout info
- **Accept/Complete Flow**: Accept individual jobs, mark pickup/dropoff with photos
- **Earnings Tracking**: View completed jobs, pending payouts, and payout history
- **Stripe Connect**: Onboard to receive payouts
- **Bottom Navigation**: Dashboard, Active, Earnings, Settings tabs

### Runner/Shifter App (`apps/shifter-app`)

- **Route Management**: Accept bulk delivery routes with multiple stops
- **Multi-Stop Optimization**: Handle sequential deliveries efficiently
- **Job Organization**: View all jobs within a route
- **Earnings Dashboard**: Track route earnings and performance metrics
- **Bottom Navigation**: Home, Routes, Jobs, Earnings, Settings tabs

### Admin App (`apps/admin-app`)

- **User Management**: View and manage customers, couriers, and runners
- **Job Monitoring**: Track all jobs system-wide with status filters
- **Hub Management**: Create and manage delivery hubs/zones
- **Rate Cards**: Configure delivery pricing tiers
- **Analytics**: Platform-wide statistics and performance metrics

### Shared Package (`packages/shared`)

- TypeScript types for Firestore documents
- Job status enum matching Flutter app
- Job transition state machine helpers

## 🔥 Firebase Setup

### 1. Firestore Collections

The app uses the following Firestore structure:

**`users/{uid}`**

```typescript
{
  role: "customer" | "driver" | "admin"
  phone?: string
  displayName?: string
  createdAt: Timestamp
}
```

**`jobs/{jobId}`**

```typescript
{
  createdByUid: string
  assignedDriverUid: string | null
  status: JobStatus  // enum: idle, open, assigned, etc.
  pickup: { lat: number; lng: number; label?: string }
  dropoff: { lat: number; lng: number; label?: string }
  driverLocation?: { lat: number; lng: number; updatedAt: Timestamp } | null
  pickupPhotoUrl?: string
  dropoffPhotoUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 2. Deploy Security Rules

Deploy the existing Firestore and Storage rules:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## 🗺️ Mapbox Configuration

1. Sign up at https://mapbox.com
2. Create an access token with `styles:read` and `tiles:read` scopes
3. Add token to `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`

## 📦 Package Scripts

### Root Level

```bash
pnpm dev                  # Run all apps in development mode
pnpm build                # Build all packages and apps
pnpm lint                 # Lint all packages
pnpm clean                # Clean all build artifacts

# Deployment
pnpm deploy:customer      # Deploy customer app
pnpm deploy:courier       # Deploy courier app
pnpm deploy:runner        # Deploy runner app
pnpm deploy:admin         # Deploy admin app
pnpm deploy:all           # Deploy all apps
```

### Individual Apps

```bash
cd apps/[app-name]
pnpm dev        # Start Vite dev server
pnpm build      # Build for production
pnpm preview    # Preview production build locally
pnpm lint       # Run ESLint
```

### Shared Package (`packages/shared`)

```bash
cd packages/shared
pnpm build      # Compile TypeScript
pnpm dev        # Watch mode for development
```

## 🔐 Authentication Flow

1. User visits landing page at https://gosenderr-6773f.web.app
2. Selects role (Customer, Courier, Runner, or Admin)
3. Redirected to role-specific app login page
4. Authenticates via Phone Auth (or Email fallback)
5. On first login, user profile is created with selected role
6. Access role-specific dashboard and features

### Role-Specific Entry Points

- Customer: `gosenderr-customer.web.app/login`
- Courier: `gosenderr-courier.web.app/login`
- Runner: `gosenderr-runner.web.app/login`
- Admin: `gosenderr-admin.web.app/login`

## 🛠️ Development

### Tech Stack

- **Frontend**: Vite 6.4.1 + React 18 + TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **Mobile**: Capacitor (native iOS and Android apps)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Maps**: Mapbox GL JS
- **Payments**: Stripe + Stripe Connect
- **Deployment**: Firebase Hosting

### Adding New Features

1. Add types to `packages/shared/src/types/` if needed
2. Implement in respective app: `apps/[app-name]/src/`
3. Rebuild shared package if types changed: `cd packages/shared && pnpm build`
4. Test locally with `pnpm dev`
5. Deploy with `pnpm deploy:[app-name]`

### Type Safety

All Firestore operations are typed using `@gosenderr/shared` package. Import types:

```typescript
import { JobDoc, JobStatus, UserDoc } from "@gosenderr/shared";
```

### Navigation Pattern

All apps use bottom navigation with role-specific tabs:
- **Customer**: Home, Jobs, Settings (3 tabs)
- **Courier**: Dashboard, Active, Earnings, Settings (4 tabs)
- **Runner**: Home, Routes, Jobs, Earnings, Settings (5 tabs)
- **Admin**: Dashboard, Users, Jobs, Hubs, Settings (5 tabs)

See [docs/NAVIGATION_GUIDE.md](docs/NAVIGATION_GUIDE.md) for implementation details.

---

## 📱 Mobile Apps (Capacitor)

All web apps can be packaged as native iOS and Android apps using **Capacitor**.

### What is Capacitor?

Capacitor is a cross-platform app runtime that wraps your web app and provides access to native device features:
- **Native APIs**: Camera, GPS, push notifications, biometrics, file system
- **Same Codebase**: Use the same React/TypeScript code for web and mobile
- **Native Performance**: Direct access to native APIs with plugins
- **App Store Ready**: Build production-ready iOS and Android apps

### Setup Capacitor

Each app can be configured for mobile deployment:

```bash
# Install Capacitor
cd apps/courier-app
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# Initialize Capacitor
npx cap init

# Build web app
pnpm build

# Add platforms
npx cap add ios
npx cap add android

# Sync web assets to native projects
npx cap sync

# Open in native IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

### Native Features Available

With Capacitor plugins, apps can access:
- 📸 **Camera**: Capture pickup/dropoff photos
- 📍 **Geolocation**: Real-time location tracking
- 🔔 **Push Notifications**: Job alerts and updates
- 📱 **Haptics**: Touch feedback
- 🔐 **Biometrics**: Face ID / Touch ID authentication
- 📂 **Filesystem**: Local data caching
- 🌐 **Network**: Connection status monitoring

### Deployment

**iOS (TestFlight/App Store)**:
1. Open project in Xcode: `npx cap open ios`
2. Configure signing & capabilities
3. Archive and upload to TestFlight
4. Submit for App Store review

**Android (Play Store)**:
1. Open project in Android Studio: `npx cap open android`
2. Build release APK/AAB
3. Sign with release keystore
4. Upload to Play Console

**Documentation**: See [docs/CAPACITOR_SETUP.md](docs/CAPACITOR_SETUP.md) for detailed mobile deployment guide.

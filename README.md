# GoSenderr Monorepo

[![CI](https://github.com/bitquan/gosenderr/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bitquan/gosenderr/actions/workflows/ci.yml)

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-07`
> - Review cadence: `monthly`


A modern on-demand delivery platform with web apps (Vite + React + TypeScript) that can be packaged as native iOS and Android apps using Capacitor.

## 🏗️ Project Structure

```
/
├── apps/
│   ├── marketplace-app/  # Vite Marketplace Web App (Port 5173)
│   ├── senderr-app/      # Vite Senderr Web App (Port 5174)
│   ├── admin-app/        # Vite Admin Dashboard (Port 3000)
│   ├── admin-desktop/    # Electron Admin Desktop App (Port 5176)
│   └── landing/          # Landing / Marketing Page
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── firebase/             # Firebase security rules and Cloud Functions
└── docs/                 # Project documentation
    └── project-plan/      # Legacy planning archive — see `docs/project-plan/README.md`
```

**Note**: All web apps can be packaged as native iOS and Android apps using Capacitor.

## ✅ Testing & Deployment

See the rollout checklist in [docs/project-plan/09-DAILY-CHECKLIST.md](docs/project-plan/09-DAILY-CHECKLIST.md).

## 📚 Documentation System

- Canonical hierarchy + policy: [docs/BLUEPRINT.md](docs/BLUEPRINT.md)
- Docs ownership + review cadence: [docs/DOCS_OWNERSHIP.md](docs/DOCS_OWNERSHIP.md)
- Developer playbook: [docs/DEVELOPER_PLAYBOOK.md](docs/DEVELOPER_PLAYBOOK.md)
- Session state: [docs/dev/SESSION_STATE.md](docs/dev/SESSION_STATE.md)
- Worklog: [docs/dev/WORKLOG.md](docs/dev/WORKLOG.md)
- App docs registry: [docs/apps/README.md](docs/apps/README.md)
- Legacy planning archive: [docs/project-plan/README.md](docs/project-plan/README.md)
- Branch-specific delta docs: `.github/copilot/branches/*.md`

## 📱 Active Applications

| App | Port | Hosting URL | Purpose |
|-----|------|-------------|---------|
| Marketplace | 5173 | gosenderr.com (gosenderr-6773f.web.app) | Browse and purchase items |
| Courier | 5174 | gosenderr-courier.web.app | Accept and complete jobs |
| Admin (Web) | 3000 | gosenderr-admin.web.app | Platform management |
| Admin Desktop | 5176 | — | Native admin tooling |
| Landing | - | gosenderr-landing.web.app | Marketing / entry point |

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

> **Minimal developer setup:** If you want a disk-conservative, focused setup (shallow + sparse git checkout and install only a single app), see `docs/dev/MINIMAL-SETUP.md`. App-specific developer notes are available at `apps/marketplace-app/copilot-instructions.md` and `apps/senderr-app/copilot-instructions.md`.

2. **Configure environment variables:**

Each app needs its own `.env.local` file:

```bash
# Marketplace App
cp apps/marketplace-app/.env.example apps/marketplace-app/.env.local

# Senderr App
cp apps/senderr-app/.env.example apps/senderr-app/.env.local

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
- `VITE_APP_ROLE` - Set automatically per app (marketplace/courier/admin)

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

### 🌐 All Apps (Vite Web Apps)

```bash
# Run all apps
pnpm dev

# Or run individual apps
cd apps/marketplace-app && pnpm dev   # Port 5173
cd apps/senderr-app && pnpm dev       # Port 5174
cd apps/admin-app && pnpm dev         # Port 3000
cd apps/admin-desktop && pnpm dev     # Port 5176 (renderer)
```

**Docker-based development:** If you prefer a reproducible, containerized setup that includes the Firebase emulators and app dev servers, use:

```bash
pnpm dev:docker   # or bash scripts/dev-docker-up.sh
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for details and troubleshooting.

Apps will be available at:
- Marketplace: http://localhost:5173
- Courier: http://localhost:5174
- Admin (Web): http://localhost:3000
- Admin Desktop (renderer): http://localhost:5176

## 🚢 Deployment

See the canonical deployment guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Each app is deployed separately to Firebase Hosting:

```bash
# Deploy individual apps
pnpm deploy:marketplace
pnpm deploy:courier
pnpm deploy:admin

# Deploy all apps
pnpm deploy:all
```

Firebase Hosting sites:
- Marketplace: `gosenderr-6773f` (default site, gosenderr.com)
- Marketplace (alt): `gosenderr-marketplace`
- Courier: `gosenderr-courier`
- Admin: `gosenderr-admin`
- Landing: `gosenderr-landing`

## 📱 Features

### Marketplace App (`apps/marketplace-app`)

- **Authentication**: Phone Auth with Firebase + Email fallback
- **Job Creation**: Create delivery jobs with pickup/dropoff locations via map or address search
- **Job Tracking**: Real-time status updates with live map showing courier location
- **Payment**: Stripe integration for job payments
- **Rating System**: Rate couriers after delivery completion
- **Bottom Navigation**: Home, Jobs, Settings tabs

### Senderr App (`apps/senderr-app`)

- **Map Shell Dashboard**: Full-screen map with floating controls and swipeable bottom sheet
- **Job Discovery**: See available jobs on map with distance and payout info
- **Accept/Complete Flow**: Accept individual jobs, mark pickup/dropoff with photos
- **Earnings Tracking**: View completed jobs, pending payouts, and payout history
- **Stripe Connect**: Onboard to receive payouts
- **Bottom Navigation**: Dashboard, Active, Earnings, Settings tabs

### Admin Desktop App (`apps/admin-desktop`)

- **Native Electron shell**: Admin tooling in a desktop window
- **Local emulators**: Streamlined workflow for Phase 1
- **Packaging**: macOS/Windows artifacts via electron-builder

### Admin App (`apps/admin-app`)

- **User Management**: View and manage marketplace users and couriers
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
pnpm deploy:marketplace   # Deploy marketplace app
pnpm deploy:courier       # Deploy courier app
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

1. User visits marketplace at https://gosenderr.com (https://gosenderr-6773f.web.app)
2. Selects role (Marketplace, Courier, or Admin)
3. Redirected to role-specific app login page
4. Authenticates via Phone Auth (or Email fallback)
5. On first login, user profile is created with selected role
6. Access role-specific dashboard and features

### Role-Specific Entry Points

- Marketplace: `gosenderr-marketplace.web.app/login`
- Courier: `gosenderr-courier.web.app/login`
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

See [docs/project-plan/02-USER-ROLES-AND-FLOWS.md](docs/project-plan/02-USER-ROLES-AND-FLOWS.md) for role flows and navigation patterns.

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
cd apps/senderr-app
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

**Documentation**: See [docs/project-plan/05-PHASE-3-COURIER-IOS.md](docs/project-plan/05-PHASE-3-COURIER-IOS.md) for detailed mobile deployment guide.

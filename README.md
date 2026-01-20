# GoSenderr Monorepo

A modern on-demand delivery platform with a React/Next.js web app and shared TypeScript types.

## 🏗️ Project Structure

```
/
├── apps/
│   └── web/              # Next.js Customer Web App
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── firebase/             # Firebase security rules
└── ...
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- gcloud CLI (only required for Cloud Run deploy)
- Firebase project with Auth, Firestore, and Storage enabled
- Mapbox account with access token

### Web App Installation

1. **Clone and install dependencies:**

```bash
pnpm install
```

2. **Configure environment variables:**

Copy `.env.example` to `apps/web/.env.local` and fill in your credentials.
`apps/web/.env.local` is gitignored and should never be committed.

```bash
cp .env.example apps/web/.env.local
```

Required variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY` - From Firebase Console > Project Settings
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_MAPBOX_TOKEN` - From https://mapbox.com

3. **Build shared package:**

```bash
cd packages/shared
pnpm build
cd ../..
```

4. **Run the development server:**

```bash
pnpm dev
```

The web app will be available at http://localhost:3000

## 🚢 Deployment

Production deploy is split into two steps:

- Cloud Run (Next.js SSR): `pnpm deploy:web:run`
- Firebase Hosting proxy (custom domain): `pnpm deploy:web:hosting`

Combined: `pnpm deploy:web`

Docs: `docs/deploy/cloud-run.md`

## 📱 Features

### Customer Web App (`apps/web`)

- **Authentication**

  - Phone Auth with Firebase reCAPTCHA
  - Email/Password fallback (configurable via env)
  - Role selection (Customer/Driver)

- **Job Management**
  - Create delivery jobs with pickup/dropoff coordinates
  - View list of all jobs
  - Live job detail page with:
    - Real-time status updates
    - Mapbox map showing pickup/dropoff markers
    - Driver location marker (when available)
    - Pickup/dropoff photos (when uploaded by driver)

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
pnpm dev        # Run all apps in development mode
pnpm build      # Build all packages and apps
pnpm lint       # Lint all packages
pnpm clean      # Clean all build artifacts
```

### Web App (`apps/web`)

```bash
cd apps/web
pnpm dev        # Start Next.js dev server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Run ESLint
```

### Shared Package (`packages/shared`)

```bash
cd packages/shared
pnpm build      # Compile TypeScript
pnpm dev        # Watch mode for development
```

## 🔐 Authentication Flow

1. User visits `/login`
2. Authenticates via Phone Auth (or Email fallback)
3. On first login, redirected to `/select-role` to choose Customer or Driver
4. Customer users access `/customer/jobs`
5. Driver users should use mobile app

## 🛠️ Development

### Adding New Features

1. Add types to `packages/shared/src/types/` if needed
2. Implement in `apps/web/src/`
3. Rebuild shared package if types changed: `cd packages/shared && pnpm build`

### Type Safety

All Firestore operations are typed using `@gosenderr/shared` package. Import types:

```typescript
import { JobDoc, JobStatus, UserDoc } from "@gosenderr/shared";
```

---

## Flutter Mobile App Documentation

For Flutter development, view the [online documentation](https://docs.flutter.dev/), which offers tutorials, samples, guidance on mobile development, and a full API reference.

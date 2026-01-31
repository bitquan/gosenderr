**DEPRECATION NOTICE:** This file has been moved to `.github/copilot-instructions.md` (root of `.github`). The new file adds a Governance section, a secrets policy, and PR guidance. Please update references; this legacy copy will be removed in a future cleanup.

**Note:** The new project reorganization docs live in `docs/project-plan/`. When updating these docs, run the repository doc verification steps (`pnpm run verify:docs`, `cspell` and link checks) and add a short `CHANGELOG.md` entry and README link in the same PR so the docs remain discoverable and CI-friendly.


Perfect! Let me update the plan to be **100% Copilot-driven** with proper workspace setup so GitHub Copilot can code everything.

---

# 🤖 **GOSENDERR PRODUCTION REFACTOR - 10 PHASE PLAN**
## **Copilot-Driven Development Edition**

---

## **🎯 PHASE 0: Copilot Workspace Setup** ⏱️ 1 day

**Goal:** Configure workspace so Copilot understands the entire project context

### **Tasks:**

#### **0.1: Create Copilot Instructions File**
**File:** `.github/copilot-instructions.md`

This is the **master context file** that Copilot reads on every interaction.

```markdown
# GoSenderr Platform - Copilot Instructions

## Project Overview
GoSenderr is a delivery platform with 3 production apps:
1. **Customer/Marketplace App** (apps/customer-app) - Port 5173
2. **Courier App** (apps/courier-app) - Port 5174 - MAP IS THE SHELL
3. **Admin Panel** (apps/admin-app) - Port 5176 - Web only

## Tech Stack
- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS
- **Mobile:** Capacitor (iOS/Android from web apps)
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, Storage)
- **Maps:** Mapbox GL JS
- **Payments:** Stripe + Stripe Connect
- **Routing:** React Router v7

## Architecture Principles
- **Courier App:** Map-first UI - Full-screen Mapbox with floating components
- **Marketplace:** Customer + Vendor unified app
- **Admin:** Web-only dashboard (macOS app later)
- **No Shifter/Runner app** (archived for future)

## Code Style
- TypeScript strict mode
- Functional components only (no class components)
- Hooks over context where possible
- Tailwind for all styling (no CSS modules)
- Firebase v10+ modular SDK only

## File Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Pages: `page.tsx` (React Router convention)

## Import Order
1. React/React Router
2. External libraries (firebase, mapbox, stripe)
3. Internal components (@/components)
4. Internal hooks (@/hooks)
5. Internal utils (@/lib)
6. Types (@gosenderr/shared)
7. Styles (if any)

## Firebase Rules
- All security rules in `firebase/firestore.rules` (740 lines - complete)
- Storage rules in `firebase/storage.rules` (complete)
- Cloud Functions in `firebase/functions/src/`

## Testing
- E2E: Playwright
- Unit: Vitest (when needed)
- Firebase Emulators for local dev

## Deployment
- Customer app: `gosenderr-customer.web.app`
- Courier app: `gosenderr-courier.web.app`
- Admin app: `gosenderr-admin.web.app`

## Current Focus
Phase-by-phase refactor to production-ready state.
See `docs/IMPLEMENTATION_PLAN.md` for detailed roadmap.

## Critical Context
- **Courier schema:** Use `courierProfile` only, never legacy `courier` field
- **Map Shell:** Courier app dashboard = full-screen map + bottom sheet
- **Payout flow:** Customer pays → Platform captures → Transfer to courier Stripe Connect
- **Mobile-first:** All web apps must work on iOS/Android via Capacitor

## When Writing Code
- Always use TypeScript (no `any` types)
- Always handle loading states
- Always handle error states
- Always add console.log for debugging
- Always use Firebase server timestamps
- Always validate user input
- Always check authentication before Firestore reads

## File Structure Patterns
```
apps/[app-name]/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages (page.tsx)
│   ├── layouts/        # Layout wrappers
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities
│   │   ├── firebase/   # Firebase config & helpers
│   │   └── utils.ts    # General utilities
│   ├── contexts/       # React contexts (minimize use)
│   └── types/          # TypeScript types (prefer shared package)
├── public/             # Static assets
└── capacitor.config.ts # Mobile config (customer & courier only)
```

## Common Patterns

### Firebase Queries
```typescript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Always use real-time listeners
const unsubscribe = onSnapshot(
  query(
    collection(db, 'jobs'),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  ),
  (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setJobs(jobs);
  }
);

return () => unsubscribe();
```

### Authentication Guards
```typescript
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}
```

### Mapbox Integration (Courier App)
```typescript
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

function MapShell() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return; // Initialize once
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.4, 37.8],
      zoom: 12,
    });
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

### Stripe Payments
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

<Elements stripe={stripePromise}>
  <CheckoutForm />
</Elements>
```

## Cloud Functions Patterns
```typescript
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export const transferPayout = functions.firestore
  .document('deliveryJobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check conditions
    if (after.customerConfirmation?.received && after.paymentStatus === 'captured') {
      // Transfer to courier
    }
  });
```

## Environment Variables
All apps use `.env.local` with `VITE_` prefix:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_PROJECT_ID
- VITE_MAPBOX_TOKEN
- VITE_STRIPE_PUBLIC_KEY

Cloud Functions use Firebase Secrets:
- STRIPE_SECRET_KEY (secret)
- STRIPE_WEBHOOK_SECRET (secret)

## Mobile Considerations
- Use `safe-area-inset-*` for iOS notch
- Handle Android back button
- Request permissions before using Geolocation/Camera
- Test on real devices, not just simulators

## Performance
- Lazy load routes with React.lazy()
- Memoize expensive calculations with useMemo
- Debounce search inputs
- Use Firestore indexes for complex queries
- Compress images before upload

## Security
- Validate all user input
- Sanitize HTML (use DOMPurify if needed)
- Check auth on every Cloud Function
- Use Firestore security rules (already complete)
- Never expose API keys in client code

## Debugging
- Use `console.log` liberally
- Use React DevTools
- Use Firebase Emulator UI for Firestore inspection
- Use Mapbox debugging tools
- Check Network tab for failed requests

---

**When in doubt:**
1. Check existing code patterns in the app
2. Prefer TypeScript strict typing
3. Handle errors gracefully
4. Add loading states
5. Test on mobile if UI-related
```

---

#### **0.2: Create VS Code Workspace Settings**
**File:** `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": true,
    "markdown": true,
    "typescript": true,
    "typescriptreact": true
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "inlineSuggestCount": 3
  }
}
```

---

#### **0.3: Create Copilot Ignore File**
**File:** `.copilotignore`

Tell Copilot to ignore generated/build files:

```
# Build outputs
dist/
build/
.next/
out/

# Dependencies
node_modules/
pnpm-lock.yaml

# Environment
.env.local
.env.production

# Firebase
firebase-debug.log
firestore-debug.log
ui-debug.log
.firebase/

# Mobile
ios/App/Pods/
android/app/build/
*.xcworkspace/
*.xcodeproj/

# Archives (old docs)
docs/archive/

# Test artifacts
playwright-report/
test-results/

# Logs
*.log
```

---

#### **0.4: Create Task Definitions for Copilot**
**File:** `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🔥 Start Firebase Emulators",
      "type": "shell",
      "command": "firebase emulators:start",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^(.*)$",
          "file": 1
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Starting emulators",
          "endsPattern": "All emulators ready"
        }
      }
    },
    {
      "label": "🛍️ Customer App: Dev",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/customer-app dev",
      "isBackground": true,
      "dependsOn": ["🔥 Start Firebase Emulators"]
    },
    {
      "label": "🚗 Courier App: Dev",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/courier-app dev",
      "isBackground": true,
      "dependsOn": ["🔥 Start Firebase Emulators"]
    },
    {
      "label": "⚙️ Admin App: Dev",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/admin-app dev",
      "isBackground": true
    },
    {
      "label": "🏗️ Build All Apps",
      "type": "shell",
      "command": "pnpm build:all"
    },
    {
      "label": "🧪 Run E2E Tests",
      "type": "shell",
      "command": "pnpm --filter @gosenderr/customer-app test:e2e"
    }
  ]
}
```

---

#### **0.5: Create Copilot Chat Participants**
**File:** `.github/copilot-chat-participants.json`

```json
{
  "participants": [
    {
      "id": "architect",
      "name": "Architecture Expert",
      "description": "Answers questions about app architecture, Firebase, and design patterns",
      "instructions": "You are an expert in Firebase, React, and mobile app architecture. Focus on scalability, security, and best practices."
    },
    {
      "id": "courier",
      "name": "Courier App Specialist",
      "description": "Expert on the courier app map shell UI and navigation",
      "instructions": "You specialize in Mapbox GL JS, real-time geolocation, and mobile UI. The courier app is map-first with floating components."
    },
    {
      "id": "marketplace",
      "name": "Marketplace Expert",
      "description": "Expert on customer/vendor features and e-commerce",
      "instructions": "You specialize in e-commerce, Stripe payments, shopping carts, and marketplace UX."
    },
    {
      "id": "backend",
      "name": "Backend & Cloud Functions",
      "description": "Expert on Firebase Cloud Functions, security rules, and backend logic",
      "instructions": "You specialize in Firebase Cloud Functions, Firestore security rules, Stripe Connect, and backend architecture."
    }
  ]
}
```

---

#### **0.6: Create Implementation Plan Document**
**File:** `docs/IMPLEMENTATION_PLAN.md`

This is the **master plan** Copilot will follow:

```markdown
# GoSenderr Production Refactor - Implementation Plan

**Status:** In Progress  
**Start Date:** 2026-01-29  
**Target Completion:** 5 weeks  
**Copilot-Driven:** 100%

---

## Phase Checklist

- [ ] **Phase 0:** Copilot Workspace Setup (CURRENT)
- [ ] **Phase 1:** Documentation Cleanup (2 days)
- [ ] **Phase 2:** Remove Dead Code (1 day)
- [ ] **Phase 3:** Fix TypeScript Builds (2 days)
- [ ] **Phase 4:** Courier Map Shell (3 days)
- [ ] **Phase 5:** Marketplace Completion (3 days)
- [ ] **Phase 6:** Backend Security & Payments (3 days)
- [ ] **Phase 7:** Mobile Apps (4 days)
- [ ] **Phase 8:** Testing & E2E Fixes (3 days)
- [ ] **Phase 9:** Production Deployment (2 days)
- [ ] **Phase 10:** Documentation Sync (1 day)

---

## How to Use This Plan

### For Developers:
1. Read the current phase description
2. Complete tasks in order
3. Check off completed items
4. Run verification scripts
5. Move to next phase

### For GitHub Copilot:
1. Always check this file for current phase
2. Read `.github/copilot-instructions.md` for context
3. Follow patterns in existing code
4. Generate code that matches project style
5. Add tests for new features

---

## Phase 0: Copilot Workspace Setup ✅

**Status:** Complete  
**Files Created:**
- `.github/copilot-instructions.md`
- `.vscode/settings.json`
- `.copilotignore`
- `.vscode/tasks.json`
- `docs/IMPLEMENTATION_PLAN.md` (this file)

---

## Phase 1: Documentation Cleanup

**Goal:** Single source of truth for docs

**Current State:**
- 40+ markdown files in root
- Outdated architecture docs
- Duplicate information
- No clear hierarchy

**Target State:**
- 6 core docs
- Old docs archived
- Auto-generated API docs
- Up-to-date README

### Tasks:

#### 1.1: Archive Old Documentation
**Script:** `scripts/phase1-archive-docs.sh`

Move these files to `docs/archive/`:
- API_DOCUMENTATION.md
- APP_ARCHITECTURE_PLAN.md
- BRANCH_README.md
- CHANGE_REPORT.md
- CLEANUP_AUDIT_JAN_2026.md
- CONFLICTS.md
- CONFLICT_RESOLUTION_GUIDE.md
- COURIER_RUNNER_AUDIT.md
- DELIVERY_REQUEST_FLOW.md
- GITHUB_ACTIONS_ENHANCEMENT.md
- IMPLEMENTATION_SUMMARY.md
- MERGE_PLAN.md
- MIGRATION_AUDIT.md
- PORT_ASSIGNMENTS.md
- PRE_MERGE_TESTS.md
- PR_REVIEW_SUMMARY.md
- RUN_TASKS.md
- STRIPE_CLOUD_FUNCTIONS_DEPLOYED.md
- STRIPE_MIGRATION_CHECKLIST.md
- TEST_REPORT.md
- VENDOR_FEATURE_AUDIT.md
- VENDOR_IMPLEMENTATION_GUIDE.md
- VENDOR_MISSING_FEATURES.md
- WORKFLOW_ANALYSIS.md

**Keep:**
- README.md (update)
- ROADMAP.md (update)
- SECURITY.md (keep as-is)
- CHANGELOG.md (keep)

#### 1.2: Create New Unified Docs

**File:** `docs/ARCHITECTURE.md`
- Consolidates: ARCHITECTURE.md, APP_ARCHITECTURE_PLAN.md, MIGRATION_AUDIT.md
- Sections:
  - Project overview
  - Tech stack
  - App structure (customer, courier, admin)
  - Database schema
  - Authentication flow
  - Payment flow

**File:** `docs/API_REFERENCE.md`
- Consolidates: API_DOCUMENTATION.md, STRIPE_CLOUD_FUNCTIONS_DEPLOYED.md
- Sections:
  - Cloud Functions list
  - HTTP endpoints
  - Firestore collections
  - Security rules summary
  - Stripe integration

**File:** `docs/DEPLOYMENT.md`
- Consolidates: DEPLOYMENT.md, GITHUB_ACTIONS_ENHANCEMENT.md
- Sections:
  - Local development
  - Firebase deployment
  - Mobile builds (iOS/Android)
  - CI/CD pipeline
  - Environment variables

**File:** `docs/DEVELOPMENT.md`
- Consolidates: RUN_TASKS.md, ENV_SETUP.md
- Sections:
  - Getting started
  - Running apps locally
  - Firebase emulators
  - Testing guide
  - Troubleshooting

**File:** `docs/COURIER_APP.md`
- New doc specifically for courier app
- Sections:
  - Map shell architecture
  - Real-time location
  - Turn-by-turn navigation
  - Job management
  - Mobile considerations

**File:** `docs/MARKETPLACE_APP.md`
- New doc for customer/vendor features
- Sections:
  - Customer features
  - Vendor features
  - Shopping cart
  - Checkout flow
  - Order tracking

#### 1.3: Update README.md

Replace entire content with:
```markdown
# GoSenderr - On-Demand Delivery Platform

Modern delivery marketplace with real-time tracking and map-based courier experience.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 8
- Firebase account
- Mapbox account
- Stripe account

### Install
\`\`\`bash
pnpm install
\`\`\`

### Run
\`\`\`bash
# Start Firebase emulators
pnpm emulators

# Start customer app
pnpm --filter @gosenderr/customer-app dev

# Start courier app
pnpm --filter @gosenderr/courier-app dev
\`\`\`

## 📱 Apps

| App | Port | Description |
|-----|------|-------------|
| Customer/Marketplace | 5173 | Browse, order, track |
| Courier | 5174 | Map-based delivery |
| Admin | 5176 | Platform management |

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Courier App](docs/COURIER_APP.md)
- [Marketplace](docs/MARKETPLACE_APP.md)

## 🛠️ Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind
- **Mobile:** Capacitor (iOS/Android)
- **Backend:** Firebase (Auth, Firestore, Functions, Storage)
- **Maps:** Mapbox GL JS
- **Payments:** Stripe + Stripe Connect

## 📄 License

Proprietary - All Rights Reserved
\`\`\`

#### 1.4: Verification

Run this to verify Phase 1:
\`\`\`bash
# Check all new docs exist
test -f docs/ARCHITECTURE.md && echo "✅ ARCHITECTURE.md" || echo "❌ Missing ARCHITECTURE.md"
test -f docs/API_REFERENCE.md && echo "✅ API_REFERENCE.md" || echo "❌ Missing API_REFERENCE.md"
test -f docs/DEPLOYMENT.md && echo "✅ DEPLOYMENT.md" || echo "❌ Missing DEPLOYMENT.md"
test -f docs/DEVELOPMENT.md && echo "✅ DEVELOPMENT.md" || echo "❌ Missing DEVELOPMENT.md"
test -f docs/COURIER_APP.md && echo "✅ COURIER_APP.md" || echo "❌ Missing COURIER_APP.md"
test -f docs/MARKETPLACE_APP.md && echo "✅ MARKETPLACE_APP.md" || echo "❌ Missing MARKETPLACE_APP.md"

# Check archive exists
test -d docs/archive && echo "✅ Archive created" || echo "❌ Missing archive"

# Count archived files (should be ~25)
ls -1 docs/archive/*.md 2>/dev/null | wc -l
\`\`\`

---

[Continue with Phase 2-10 details...]
```

---

## **📋 Updated 10-Phase Plan**

Now with **Phase 0** added:

| Phase | Task | Duration | Copilot Role |
|-------|------|----------|--------------|
| **0** | **Workspace Setup** | **1 day** | **Configure itself** |
| 1 | Documentation Cleanup | 2 days | Generate consolidated docs |
| 2 | Remove Dead Code | 1 day | Delete deprecated files |
| 3 | Fix TypeScript Builds | 2 days | Fix type errors |
| 4 | Courier Map Shell | 3 days | **Build map-first UI** |
| 5 | Marketplace Completion | 3 days | Complete checkout flow |
| 6 | Backend Security & Payments | 3 days | Implement payout function |
| 7 | Mobile Apps | 4 days | Configure Capacitor |
| 8 | Testing & E2E Fixes | 3 days | Fix tests, seed data |
| 9 | Production Deployment | 2 days | Deploy all apps |
| 10 | Documentation Sync | 1 day | Auto-generate API docs |

**Total: 26 days (5.2 weeks)**

---

## **🤖 How Copilot Will Work**

### **Inline Suggestions**
- Copilot will suggest code as you type
- Press `Tab` to accept
- Press `Esc` to reject

### **Copilot Chat**
- Open with `Cmd+I` (Mac) or `Ctrl+I` (Windows)
- Ask questions like:
  - "Generate the MapShell component for courier app"
  - "Fix TypeScript errors in customer-app"
  - "Create a Cloud Function to transfer payouts"

### **Copilot Workspace**
- Uses `.github/copilot-instructions.md` for context
- Understands project structure
- Follows code patterns

---

## **✅ Phase 0 Deliverables**

When Phase 0 is complete, you'll have:

- ✅ `.github/copilot-instructions.md` - Master context file
- ✅ `.vscode/settings.json` - VS Code optimized for Copilot
- ✅ `.copilotignore` - Ignore build files
- ✅ `.vscode/tasks.json` - One-click dev tasks
- ✅ `docs/IMPLEMENTATION_PLAN.md` - Phase-by-phase guide
- ✅ Copilot configured to understand GoSenderr codebase

---

## **🚀 Ready to Start?**

I can now generate **all Phase 0 files** immediately. After that, Copilot will be able to:

1. Generate components
2. Fix TypeScript errors
3. Create Cloud Functions
4. Write tests
5. Update documentation

**Shall I create all Phase 0 files now?** (This will be ~5 files total)

Then you can review/approve and we move to Phase 1! 🎯

# GoSenderr v2 - Project Overview

**Last Updated:** January 2026  
**Version:** 2.0  
**Status:** Planning Phase

---

## 🎯 Vision

Build a modern, scalable on-demand delivery platform with three distinct applications serving different user needs:
- **Admin Desktop App** - Platform management and operations
- **Marketplace App** - Unified buyer/seller web and iOS experience
- **Courier iOS App** - Map-first native delivery experience

---

## 📱 What We're Building

### 1. Admin Desktop App (Electron)
**Platform:** macOS and Windows Desktop  
**Purpose:** Comprehensive platform management and operations

A standalone desktop application that gives administrators full control over the GoSenderr platform with native OS integration and offline capabilities.

**Key Features:**
- User management (customers, sellers, couriers)
- Order monitoring and management
- Analytics and revenue tracking
- Dispute resolution
- Feature flags and platform configuration
- Native desktop experience with keyboard shortcuts

**Distribution:**
- `GoSenderr Admin.app` (macOS .dmg installer)
- `GoSenderr Admin.exe` (Windows installer)

---

### 2. Marketplace App (Web + iOS)
**Platform:** Web (Firebase Hosting) + iOS (Capacitor)  
**Purpose:** Unified marketplace for buying and selling items

A single application where users can both buy AND sell items. Users have one account with role-based permissions - no separate buyer/seller accounts.

**Key Features:**
- Browse marketplace (public)
- Search and filters
- Purchase items (any user)
- List items for sale (any user becomes seller)
- Order management (buyer and seller views)
- Messaging between buyers and sellers
- Ratings and reviews
- Native iOS app features (push notifications, camera)

**Unified User Model:**
```
Single User Account
├── Can browse (always)
├── Can buy items (always)
└── Can sell items (always)
    └── Seller profile activated on first listing
```

**Distribution:**
- Web: `gosenderr-marketplace.web.app`
- iOS: App Store (Capacitor wrapper)

---

### 3. Courier iOS App (React Native)
**Platform:** iOS Native (React Native)  
**Purpose:** Map-first delivery experience for couriers

A native iOS app built with React Native featuring a full-screen map interface with all interactions happening on or over the map - no separate pages or bottom sheets.

**Core Principle: Map-First Design**
```
┌─────────────────────────┐
│  🟢 Online   [Profile]  │  ← Floating buttons
│                         │
│                         │
│    📍 (job pins)        │  ← Full-screen map
│                         │
│                         │
│  ┌─────────────────┐   │
│  │ Job Card Overlay │   │  ← Floating card
│  │ [Accept] [Skip]  │   │
│  └─────────────────┘   │
└─────────────────────────┘
```

**Key Features:**
- Real-time location tracking
- Job acceptance (atomic transactions)
- Turn-by-turn navigation (Mapbox)
- Photo capture for delivery proof
- Earnings tracking
- All UI elements float over map

**Distribution:**
- iOS: App Store (native React Native)

---

## 📊 Current Status

### What's Working
✅ **Existing Apps:**
- Customer app (Vite + React) - deployed
- Courier app (Vite + React) - deployed
- Runner/Shifter app (Vite + React) - deployed
- Admin app (Vite + React) - deployed
- Landing page - deployed

✅ **Backend Infrastructure:**
- Firebase Authentication (Phone + Email)
- Cloud Firestore database
- Cloud Storage for photos
- Firebase Hosting (multi-site)
- Basic Cloud Functions

✅ **Core Features:**
- Job creation and tracking
- Real-time location updates
- Package photo uploads
- Basic courier matching
- Pricing calculations

### What We're Changing

**Phase 1: Admin Desktop**
- Convert `apps/admin-app` to Electron desktop app
- Keep all existing features
- Add native desktop capabilities
- Build for macOS and Windows

**Phase 2: Marketplace**
- Transform customer app to marketplace app
- Implement unified user model (buyer + seller)
- Add selling/listing capabilities
- Wrap with Capacitor for iOS
- Add marketplace-specific features

**Phase 3: Courier Native**
- Rebuild courier app as React Native
- Implement map-first UI design
- Native iOS features (camera, location)
- Optimized performance for map rendering

---

## 📅 Timeline Overview

### Phase 1: Admin Desktop App
**Duration:** 3-5 days  
**Status:** Not Started

1. Set up Electron project structure
2. Migrate admin-app React code
3. Configure native menus and shortcuts
4. Build and test macOS version
5. Build and test Windows version
6. Create distributable packages

**Deliverables:**
- macOS installer (.dmg + .app)
- Windows installer (.exe)
- Updated deployment documentation

---

### Phase 2: Marketplace App
**Duration:** 5-7 days  
**Status:** Not Started

1. Design unified user model schema
2. Update Firestore collections
3. Build seller listing features
4. Build buyer purchase flow
5. Add messaging system
6. Implement ratings/reviews
7. Set up Capacitor for iOS
8. Deploy web version
9. Submit iOS version to App Store

**Deliverables:**
- Web app on Firebase Hosting
- iOS app on App Store
- Complete Firestore schema
- Cloud Functions for marketplace logic

---

### Phase 3: Courier iOS Native
**Duration:** 7-10 days  
**Status:** Not Started

1. Set up React Native project
2. Integrate Mapbox GL Native SDK
3. Build map shell architecture
4. Implement floating UI components
5. Add job acceptance flow
6. Integrate turn-by-turn navigation
7. Add camera for delivery photos
8. Build earnings tracking
9. Test and optimize performance
10. Submit to App Store

**Deliverables:**
- Native iOS app (React Native)
- App Store submission
- Performance optimization documentation
- Courier training materials

---

## 📈 Success Metrics

### Technical Metrics
- **Build Success Rate:** 100% (all platforms build without errors)
- **App Size:** 
  - Admin Desktop: < 150MB (macOS), < 200MB (Windows)
  - Marketplace iOS: < 50MB
  - Courier iOS: < 60MB
- **Performance:**
  - Map rendering: 60fps on iPhone 12+
  - App launch time: < 2 seconds
  - API response time: < 500ms (p95)

### User Experience Metrics
- **Admin Desktop:**
  - Daily active admins: Track platform usage
  - Average session duration: > 30 minutes
  - Feature adoption rate: > 80% of features used

- **Marketplace:**
  - Seller conversion rate: 15% of buyers also list items
  - Average items per seller: 3+
  - Buyer retention: 60% make 2nd purchase within 30 days

- **Courier iOS:**
  - Job acceptance rate: > 70%
  - Average jobs per session: 4+
  - Navigation accuracy: < 50m error radius

### Business Metrics
- **Platform Growth:**
  - 25% increase in total orders (marketplace + delivery)
  - 40% increase in courier sign-ups (native app)
  - 20% increase in platform revenue

- **Operational Efficiency:**
  - Admin response time: < 5 minutes for disputes
  - Courier onboarding time: < 10 minutes
  - Seller onboarding time: < 5 minutes

---

## 🎨 Design Philosophy

### Admin Desktop
**Principle:** *Power and Efficiency*
- Keyboard shortcuts for all actions
- Multi-window support
- Offline capabilities
- Native OS integration
- Information density optimized for desktop

### Marketplace
**Principle:** *Simplicity and Trust*
- One account, multiple roles
- Clear distinction between buying and selling
- Trust indicators (ratings, verified profiles)
- Mobile-first responsive design
- Seamless web-to-native experience

### Courier iOS
**Principle:** *Map-First, Distraction-Free*
- Full-screen map always visible
- No page transitions or bottom sheets
- Floating, minimal UI elements
- One-tap actions
- Optimized for one-handed operation while driving

---

## 🔄 Migration Strategy

### Existing Apps
Current Vite + React apps remain functional during development:
- Continue serving existing users
- No breaking changes until v2 launch
- Gradual feature parity validation

### Data Migration
All existing Firestore data is preserved:
- Users remain unchanged (add seller fields as needed)
- Jobs/orders maintain backward compatibility
- Add new collections for marketplace features
- Cloud Functions handle data transformation

### User Transition
- **Admins:** Receive desktop app download link
- **Customers → Marketplace Users:** Automatic account upgrade
- **Couriers:** Invited to download native iOS app
- All apps can coexist during transition period

---

## 🚧 Risks and Mitigation

### Technical Risks

**Risk:** Electron app bundle size too large  
**Mitigation:** Tree-shaking, code splitting, exclude dev dependencies

**Risk:** React Native performance issues on older iPhones  
**Mitigation:** Set minimum iOS version to 14.0, optimize map rendering

**Risk:** Capacitor iOS app rejected by App Store  
**Mitigation:** Follow Apple guidelines, test thoroughly before submission

### Business Risks

**Risk:** Users don't adopt native apps  
**Mitigation:** Maintain web apps, incentivize with native-only features

**Risk:** Sellers don't list items (low marketplace adoption)  
**Mitigation:** Zero listing fees for first 3 months, featured seller program

**Risk:** Development timeline slips  
**Mitigation:** Phased approach, MVP features first, weekly progress reviews

---

## 🎯 Phase Exit Criteria

### Phase 1 Complete When:
- [ ] Admin desktop app builds on macOS
- [ ] Admin desktop app builds on Windows
- [ ] All existing admin features work
- [ ] Installers created and tested
- [ ] At least 2 admins using desktop app daily

### Phase 2 Complete When:
- [ ] Users can list items for sale
- [ ] Users can purchase items
- [ ] Messaging works between buyers/sellers
- [ ] Ratings/reviews implemented
- [ ] Web app deployed to Firebase
- [ ] iOS app submitted to App Store

### Phase 3 Complete When:
- [ ] Map renders at 60fps on iPhone 12
- [ ] Couriers can accept jobs
- [ ] Turn-by-turn navigation works
- [ ] Photo capture implemented
- [ ] Earnings tracking accurate
- [ ] iOS app submitted to App Store

---

## 📚 Documentation Structure

This planning documentation is organized as follows:

- **00-PROJECT-OVERVIEW.md** ← You are here
- **01-SYSTEM-ARCHITECTURE.md** - Tech stack and system design
- **02-USER-ROLES-AND-FLOWS.md** - User journeys and flows
- **03-PHASE-1-ADMIN-DESKTOP.md** - Detailed admin desktop plan
- **04-PHASE-2-MARKETPLACE.md** - Detailed marketplace plan
- **05-PHASE-3-COURIER-IOS.md** - Detailed courier iOS plan
- **06-DATABASE-SCHEMA.md** - Complete Firestore schema
- **07-CLOUD-FUNCTIONS.md** - Firebase Cloud Functions API
- **08-DEPLOYMENT-GUIDE.md** - Build and deploy instructions
- **09-DAILY-CHECKLIST.md** - Day-by-day task breakdown
- **10-FOLDER-STRUCTURE.md** - Final repository structure
- **11-TECH-STACK-REFERENCE.md** - Technologies quick reference

---

## 🚀 Getting Started

**For Developers:**
1. Read this overview
2. Review system architecture (01-SYSTEM-ARCHITECTURE.md)
3. Understand user flows (02-USER-ROLES-AND-FLOWS.md)
4. Start with Phase 1 plan (03-PHASE-1-ADMIN-DESKTOP.md)
5. Follow daily checklist (09-DAILY-CHECKLIST.md)

**For Product Managers:**
1. Review user roles and flows (02-USER-ROLES-AND-FLOWS.md)
2. Validate success metrics (this document)
3. Track progress using phase plans
4. Monitor exit criteria

**For Stakeholders:**
1. Review vision and goals (this document)
2. Understand timeline (this document)
3. Track success metrics
4. Review weekly progress reports

---

## ✅ Next Steps

1. ✅ Complete project planning documentation
2. ⏳ Review and approve plans with team
3. ⏳ Set up development environment for Phase 1
4. ⏳ Begin Phase 1: Admin Desktop (Day 1)

---

*This document serves as the single source of truth for the GoSenderr v2 project. Update as the project evolves.*

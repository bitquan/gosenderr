# Repository Folder Structure

**Last Updated:** January 2026  
**Version:** 2.0  
**Purpose:** Complete repository organization for GoSenderr v2 monorepo

---

## 📋 Table of Contents

1. [Current Structure Overview](#current-structure-overview)
2. [Target Structure (v2)](#target-structure-v2)
3. [Detailed Directory Breakdown](#detailed-directory-breakdown)
4. [Migration Guide](#migration-guide)
5. [File Patterns & Conventions](#file-patterns--conventions)

---

## Current Structure Overview

### Existing Repository Layout

```
gosenderr/
├── .github/
│   └── workflows/
│       ├── deploy-customer.yml
│       ├── deploy-functions.yml
│       └── test.yml
│
├── apps/
│   ├── _archive/                    # Old unused code
│   ├── admin-app/                   # Current admin (web)
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── courier-app/                 # Current courier (web)
│   ├── customer-app/                # Current customer (web)
│   └── landing/                     # Landing page
│
├── firebase/
│   ├── functions/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── stripe/
│   │   │   ├── orders/
│   │   │   └── users/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
│
├── packages/
│   ├── shared/                      # Shared utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── constants/
│   │   └── package.json
│   └── ui/                          # Shared UI components
│       ├── src/
│       │   └── components/
│       └── package.json
│
├── docs/                            # All documentation
│   ├── project-plan/                # v2 project planning
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   └── ...
│
├── scripts/
│   ├── deploy-cloudrun-web.sh
│   ├── verify-phase0.sh
│   └── predeploy-vendor-shared.js
│
├── .env.example
├── .firebaserc
├── firebase.json
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── README.md
```

---

## Target Structure (v2)

### Complete v2 Repository Layout

```
gosenderr/
│
├── .github/                         # GitHub configuration
│   ├── workflows/                   # CI/CD workflows
│   │   ├── build-admin-desktop.yml  # NEW: Build desktop app
│   │   ├── deploy-marketplace.yml   # NEW: Deploy marketplace
│   │   ├── deploy-functions.yml     # Deploy cloud functions
│   │   ├── deploy-courier.yml       # NEW: Deploy courier app
│   │   ├── test.yml                 # Run tests
│   │   └── lint.yml                 # Run linters
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/                            # All applications
│   │
│   ├── admin-desktop/               # NEW: Electron desktop app
│   │   ├── electron/
│   │   │   ├── main.ts              # Main process
│   │   │   ├── preload.ts           # Preload script
│   │   │   └── menu.ts              # Native menu
│   │   ├── src/                     # Renderer process (React)
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── Layout.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── UserList.tsx
│   │   │   │   │   ├── UserDetail.tsx
│   │   │   │   │   └── UserForm.tsx
│   │   │   │   ├── orders/
│   │   │   │   │   ├── OrderList.tsx
│   │   │   │   │   ├── OrderDetail.tsx
│   │   │   │   │   └── OrderTimeline.tsx
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── RevenueChart.tsx
│   │   │   │   │   └── UserGrowthChart.tsx
│   │   │   │   ├── disputes/
│   │   │   │   │   ├── DisputeList.tsx
│   │   │   │   │   └── DisputeDetail.tsx
│   │   │   │   └── common/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       ├── Modal.tsx
│   │   │   │       └── Table.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Users.tsx
│   │   │   │   ├── Orders.tsx
│   │   │   │   ├── Jobs.tsx
│   │   │   │   ├── Analytics.tsx
│   │   │   │   ├── Disputes.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   └── Login.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useUsers.ts
│   │   │   │   ├── useOrders.ts
│   │   │   │   └── useFirestore.ts
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts
│   │   │   │   ├── api.ts
│   │   │   │   └── utils.ts
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── userStore.ts
│   │   │   │   └── orderStore.ts
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── order.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── public/
│   │   │   └── icons/
│   │   │       ├── icon.icns        # macOS icon
│   │   │       ├── icon.ico         # Windows icon
│   │   │       └── icon.png         # Linux icon
│   │   ├── build/                   # electron-builder resources
│   │   │   ├── entitlements.mac.plist
│   │   │   └── notarize.js
│   │   ├── .env.example
│   │   ├── electron-builder.yml     # Build configuration
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── vite.config.ts
│   │   └── README.md
│   │
│   ├── marketplace-app/             # NEW: Web + iOS marketplace
│   │   ├── ios/                     # Capacitor iOS project
│   │   │   ├── App/
│   │   │   ├── App.xcodeproj/
│   │   │   ├── App.xcworkspace/
│   │   │   ├── Podfile
│   │   │   └── Podfile.lock
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── MobileNav.tsx
│   │   │   │   ├── listings/
│   │   │   │   │   ├── ListingCard.tsx
│   │   │   │   │   ├── ListingGrid.tsx
│   │   │   │   │   ├── ListingDetail.tsx
│   │   │   │   │   └── ListingForm.tsx
│   │   │   │   ├── orders/
│   │   │   │   │   ├── OrderCard.tsx
│   │   │   │   │   ├── OrderList.tsx
│   │   │   │   │   ├── OrderDetail.tsx
│   │   │   │   │   └── OrderTimeline.tsx
│   │   │   │   ├── checkout/
│   │   │   │   │   ├── CheckoutForm.tsx
│   │   │   │   │   ├── PaymentForm.tsx
│   │   │   │   │   └── AddressForm.tsx
│   │   │   │   ├── messaging/
│   │   │   │   │   ├── ConversationList.tsx
│   │   │   │   │   ├── ChatInterface.tsx
│   │   │   │   │   └── MessageBubble.tsx
│   │   │   │   ├── ratings/
│   │   │   │   │   ├── RatingForm.tsx
│   │   │   │   │   ├── RatingDisplay.tsx
│   │   │   │   │   └── ReviewList.tsx
│   │   │   │   └── common/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       ├── Card.tsx
│   │   │   │       ├── Badge.tsx
│   │   │   │       ├── Avatar.tsx
│   │   │   │       └── Spinner.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx
│   │   │   │   ├── Browse.tsx
│   │   │   │   ├── ListingDetail.tsx
│   │   │   │   ├── CreateListing.tsx
│   │   │   │   ├── MyListings.tsx
│   │   │   │   ├── Checkout.tsx
│   │   │   │   ├── OrderConfirmation.tsx
│   │   │   │   ├── MyOrders.tsx
│   │   │   │   ├── MySales.tsx
│   │   │   │   ├── OrderDetail.tsx
│   │   │   │   ├── Messages.tsx
│   │   │   │   ├── Profile.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── AuthContext.tsx
│   │   │   │   │   └── useAuth.ts
│   │   │   │   ├── listings/
│   │   │   │   │   ├── useListings.ts
│   │   │   │   │   └── useCreateListing.ts
│   │   │   │   ├── orders/
│   │   │   │   │   ├── useOrders.ts
│   │   │   │   │   └── useCreateOrder.ts
│   │   │   │   └── messaging/
│   │   │   │       ├── useConversations.ts
│   │   │   │       └── useSendMessage.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useFirestore.ts
│   │   │   │   ├── useStorage.ts
│   │   │   │   └── usePlatform.ts
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts
│   │   │   │   ├── stripe.ts
│   │   │   │   ├── api.ts
│   │   │   │   └── utils.ts
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── listingStore.ts
│   │   │   │   └── orderStore.ts
│   │   │   ├── types/
│   │   │   │   ├── listing.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── message.ts
│   │   │   ├── routes/
│   │   │   │   └── index.tsx
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   └── images/
│   │   ├── .env.example
│   │   ├── capacitor.config.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── vite.config.ts
│   │   └── README.md
│   │
│   ├── courier-app/                 # NEW: React Native iOS app
│   │   ├── ios/
│   │   │   ├── CourierApp/
│   │   │   ├── CourierApp.xcodeproj/
│   │   │   ├── CourierApp.xcworkspace/
│   │   │   ├── Podfile
│   │   │   └── Podfile.lock
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── map/
│   │   │   │   │   ├── MapView.tsx
│   │   │   │   │   ├── JobMarker.tsx
│   │   │   │   │   ├── UserMarker.tsx
│   │   │   │   │   └── RoutePolyline.tsx
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── JobCard.tsx
│   │   │   │   │   ├── JobDetail.tsx
│   │   │   │   │   ├── ActiveJobOverlay.tsx
│   │   │   │   │   └── JobList.tsx
│   │   │   │   ├── earnings/
│   │   │   │   │   ├── EarningsSummary.tsx
│   │   │   │   │   ├── EarningsChart.tsx
│   │   │   │   │   └── PayoutInfo.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   ├── ProfileHeader.tsx
│   │   │   │   │   ├── ProfileStats.tsx
│   │   │   │   │   └── VehicleInfo.tsx
│   │   │   │   └── common/
│   │   │   │       ├── Button.tsx
│   │   │   │       ├── Input.tsx
│   │   │   │       ├── Card.tsx
│   │   │   │       └── Badge.tsx
│   │   │   ├── screens/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginScreen.tsx
│   │   │   │   │   └── RegisterScreen.tsx
│   │   │   │   ├── MapScreen.tsx
│   │   │   │   ├── EarningsScreen.tsx
│   │   │   │   ├── HistoryScreen.tsx
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   ├── SettingsScreen.tsx
│   │   │   │   └── HelpScreen.tsx
│   │   │   ├── navigation/
│   │   │   │   ├── RootNavigator.tsx
│   │   │   │   ├── AuthNavigator.tsx
│   │   │   │   └── MainNavigator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useLocation.ts
│   │   │   │   └── useEarnings.ts
│   │   │   ├── services/
│   │   │   │   ├── firebase.ts
│   │   │   │   ├── location.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   └── api.ts
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── jobStore.ts
│   │   │   │   └── locationStore.ts
│   │   │   ├── types/
│   │   │   │   ├── job.ts
│   │   │   │   ├── courier.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   └── location.ts
│   │   │   ├── utils/
│   │   │   │   ├── formatters.ts
│   │   │   │   ├── validators.ts
│   │   │   │   └── constants.ts
│   │   │   ├── theme/
│   │   │   │   ├── colors.ts
│   │   │   │   ├── fonts.ts
│   │   │   │   └── spacing.ts
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── .env.example
│   │   ├── .watchmanconfig
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── metro.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── admin-app/                   # TO REMOVE: Old web admin
│   ├── courier-app-old/             # TO REMOVE: Old web courier
│   ├── customer-app/                # TO REMOVE: Old customer app
│   │
│   └── landing/                     # Marketing landing page
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/                        # Shared packages
│   │
│   ├── shared/                      # Shared utilities & types
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── job.ts
│   │   │   │   ├── listing.ts
│   │   │   │   ├── payment.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── date.ts
│   │   │   │   ├── currency.ts
│   │   │   │   ├── distance.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts
│   │   │   │   ├── statuses.ts
│   │   │   │   ├── categories.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── ui/                          # Shared UI components
│       ├── src/
│       │   ├── components/
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Avatar.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Spinner.tsx
│       │   │   └── index.ts
│       │   ├── hooks/
│       │   │   ├── useMediaQuery.ts
│       │   │   ├── useDebounce.ts
│       │   │   └── index.ts
│       │   ├── styles/
│       │   │   ├── theme.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── firebase/                        # Firebase configuration
│   │
│   ├── functions/                   # Cloud Functions
│   │   ├── src/
│   │   │   ├── stripe/
│   │   │   │   ├── connect.ts       # Stripe Connect
│   │   │   │   ├── payments.ts      # Payment processing
│   │   │   │   └── webhooks.ts      # Stripe webhooks
│   │   │   ├── orders/
│   │   │   │   ├── onCreate.ts      # Order creation trigger
│   │   │   │   ├── onUpdate.ts      # Order update trigger
│   │   │   │   ├── createOrder.ts   # Callable function
│   │   │   │   └── notifications.ts # Order notifications
│   │   │   ├── jobs/
│   │   │   │   ├── onCreate.ts      # Job creation trigger
│   │   │   │   ├── acceptJob.ts     # Callable function
│   │   │   │   ├── updateJobStatus.ts
│   │   │   │   └── notifications.ts
│   │   │   ├── users/
│   │   │   │   ├── onCreate.ts      # User creation trigger
│   │   │   │   ├── profiles.ts      # Profile management
│   │   │   │   └── verification.ts  # User verification
│   │   │   ├── listings/
│   │   │   │   ├── onCreate.ts
│   │   │   │   ├── onUpdate.ts
│   │   │   │   └── search.ts        # Search index
│   │   │   ├── messaging/
│   │   │   │   ├── onCreate.ts
│   │   │   │   └── notifications.ts
│   │   │   ├── ratings/
│   │   │   │   ├── onCreate.ts
│   │   │   │   └── aggregation.ts
│   │   │   ├── utils/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── email.ts
│   │   │   │   ├── sms.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── logger.ts
│   │   │   └── index.ts             # Export all functions
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── tests/                       # Firebase rules tests
│   │   ├── firestore.test.ts
│   │   └── storage.test.ts
│   │
│   ├── firestore.rules              # Firestore security rules
│   ├── firestore.indexes.json       # Firestore indexes
│   ├── storage.rules                # Storage security rules
│   └── README.md
│
├── docs/                            # Documentation
│   │
│   ├── project-plan/                # v2 Project planning docs
│   │   ├── 00-PROJECT-OVERVIEW.md
│   │   ├── 01-SYSTEM-ARCHITECTURE.md
│   │   ├── 02-USER-ROLES-AND-FLOWS.md
│   │   ├── 03-PHASE-1-ADMIN-DESKTOP.md
│   │   ├── 04-PHASE-2-MARKETPLACE.md
│   │   ├── 05-PHASE-3-COURIER-IOS.md
│   │   ├── 06-DATABASE-SCHEMA.md
│   │   ├── 07-CLOUD-FUNCTIONS.md
│   │   ├── 08-DEPLOYMENT-GUIDE.md
│   │   ├── 09-DAILY-CHECKLIST.md
│   │   ├── 10-FOLDER-STRUCTURE.md
│   │   └── 11-TECH-STACK-REFERENCE.md
│   │
│   ├── guides/                      # User guides
│   │   ├── admin-guide.md
│   │   ├── seller-guide.md
│   │   ├── buyer-guide.md
│   │   └── courier-guide.md
│   │
│   ├── api/                         # API documentation
│   │   ├── cloud-functions.md
│   │   ├── firestore-schema.md
│   │   └── webhooks.md
│   │
│   ├── deployment/                  # Deployment docs
│   │   ├── desktop-deployment.md
│   │   ├── web-deployment.md
│   │   ├── ios-deployment.md
│   │   └── functions-deployment.md
│   │
│   ├── architecture/                # Architecture docs
│   │   ├── system-design.md
│   │   ├── database-design.md
│   │   ├── security.md
│   │   └── scalability.md
│   │
│   └── README.md                    # Docs index
│
├── scripts/                         # Build and deployment scripts
│   ├── deploy-cloudrun-web.sh
│   ├── deploy-desktop.sh            # NEW: Deploy desktop builds
│   ├── deploy-marketplace.sh        # NEW: Deploy marketplace
│   ├── deploy-courier.sh            # NEW: Deploy courier
│   ├── verify-phase0.sh
│   ├── verify-docs.sh
│   ├── predeploy-vendor-shared.js
│   ├── build-all.sh                 # Build all apps
│   ├── test-all.sh                  # Test all apps
│   └── README.md
│
├── test_data/                       # Test data for development
│   ├── users.json
│   ├── orders.json
│   ├── jobs.json
│   └── listings.json
│
├── .devcontainer/                   # VS Code dev container
│   └── devcontainer.json
│
├── .vscode/                         # VS Code workspace settings
│   ├── settings.json
│   ├── launch.json
│   └── extensions.json
│
├── .github/                         # GitHub configuration
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example                     # Example environment variables
├── .eslintrc.cjs                    # ESLint configuration
├── .firebaserc                      # Firebase project config
├── .gitignore                       # Git ignore patterns
├── .prettierrc                      # Prettier configuration
├── firebase.json                    # Firebase hosting/functions config
├── firebase.local.json              # Local Firebase config
├── firebase.ci.json                 # CI Firebase config
├── package.json                     # Root package.json
├── pnpm-workspace.yaml              # pnpm workspace config
├── pnpm-lock.yaml                   # pnpm lockfile
├── turbo.json                       # Turborepo config
├── tsconfig.json                    # Root TypeScript config
├── README.md                        # Main readme
├── CHANGELOG.md                     # Version history
├── LICENSE                          # License file
└── CONTRIBUTING.md                  # Contribution guidelines
```

---

## Detailed Directory Breakdown

### `/apps/admin-desktop/`

**Purpose:** Electron desktop application for platform administrators

**Key Files:**
```
electron/main.ts              # Electron main process, window management
electron/preload.ts           # Context bridge for secure IPC
electron/menu.ts              # Native application menu
src/App.tsx                   # React root component
electron-builder.yml          # Build configuration for macOS/Windows
package.json                  # Dependencies and build scripts
```

**Technologies:**
- Electron 28+
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase SDK

**Build Outputs:**
- macOS: `.dmg` installer
- Windows: `.exe` installer
- Location: `dist/`

---

### `/apps/marketplace-app/`

**Purpose:** Unified marketplace for buying and selling (Web + iOS)

**Key Files:**
```
src/App.tsx                   # React root component
src/routes/index.tsx          # React Router configuration
capacitor.config.ts           # Capacitor configuration
ios/                          # Native iOS project (generated)
package.json                  # Dependencies and scripts
```

**Technologies:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Firebase SDK
- Capacitor 5+ (for iOS)
- Stripe SDK

**Build Outputs:**
- Web: Static files in `dist/` → Firebase Hosting
- iOS: Xcode project → App Store

**Key Features:**
- Browse listings
- Buy items
- Sell items
- Messaging
- Orders management
- Ratings & reviews

---

### `/apps/courier-app/`

**Purpose:** Native iOS app for delivery couriers

**Key Files:**
```
src/App.tsx                   # React Native root
src/navigation/               # React Navigation setup
ios/                          # Native iOS project
android/                      # (Optional) Android project
package.json                  # Dependencies and scripts
```

**Technologies:**
- React Native 0.72+
- TypeScript
- React Navigation
- Firebase SDK (React Native)
- Mapbox React Native
- Zustand

**Build Output:**
- iOS: Xcode project → App Store
- Binary: `.ipa` file

**Key Features:**
- Map-first interface
- Job acceptance
- Real-time tracking
- Status updates
- Earnings dashboard
- Job history

---

### `/packages/shared/`

**Purpose:** Shared utilities, types, and constants used across all apps

**Structure:**
```
src/
├── types/
│   ├── user.ts              # User type definitions
│   ├── order.ts             # Order type definitions
│   ├── job.ts               # Job/delivery type definitions
│   ├── listing.ts           # Marketplace listing types
│   └── payment.ts           # Payment type definitions
├── utils/
│   ├── date.ts              # Date formatting utilities
│   ├── currency.ts          # Currency formatting
│   ├── distance.ts          # Distance calculations
│   └── validation.ts        # Input validation
├── constants/
│   ├── roles.ts             # User roles
│   ├── statuses.ts          # Order/job statuses
│   └── categories.ts        # Listing categories
└── index.ts                 # Main export
```

**Usage:**
```typescript
import { Order, OrderStatus } from '@gosenderr/shared'
import { formatCurrency, calculateDistance } from '@gosenderr/shared'
```

---

### `/packages/ui/`

**Purpose:** Shared React UI components (web-only)

**Structure:**
```
src/
├── components/
│   ├── Button.tsx           # Button component with variants
│   ├── Input.tsx            # Input field component
│   ├── Card.tsx             # Card container
│   ├── Badge.tsx            # Status badge
│   ├── Avatar.tsx           # User avatar
│   ├── Modal.tsx            # Modal dialog
│   └── Spinner.tsx          # Loading spinner
├── hooks/
│   ├── useMediaQuery.ts     # Responsive breakpoints
│   └── useDebounce.ts       # Debounce hook
├── styles/
│   └── theme.ts             # Theme constants
└── index.ts                 # Main export
```

**Usage:**
```typescript
import { Button, Card, Avatar } from '@gosenderr/ui'
```

**Note:** Only used by web apps (admin-desktop, marketplace-app). Not compatible with React Native (courier-app).

---

### `/firebase/functions/`

**Purpose:** Cloud Functions for backend logic

**Structure:**
```
src/
├── stripe/
│   ├── connect.ts           # Stripe Connect account management
│   ├── payments.ts          # Payment processing
│   └── webhooks.ts          # Stripe webhook handlers
├── orders/
│   ├── onCreate.ts          # Trigger on order creation
│   ├── createOrder.ts       # Callable function
│   └── notifications.ts     # Send order notifications
├── jobs/
│   ├── acceptJob.ts         # Assign job to courier
│   ├── updateJobStatus.ts   # Update job status
│   └── notifications.ts     # Send job notifications
├── users/
│   ├── onCreate.ts          # Trigger on user creation
│   └── profiles.ts          # Profile management
├── listings/
│   ├── onCreate.ts          # Index listing for search
│   └── search.ts            # Search listings
├── messaging/
│   ├── onCreate.ts          # Trigger on new message
│   └── notifications.ts     # Send message notifications
├── ratings/
│   ├── onCreate.ts          # Trigger on new rating
│   └── aggregation.ts       # Update user rating stats
└── index.ts                 # Export all functions
```

**Deployment:**
```bash
firebase deploy --only functions
```

---

### `/docs/project-plan/`

**Purpose:** Complete v2 project planning documentation

**Files:**
1. `00-PROJECT-OVERVIEW.md` - Vision and goals
2. `01-SYSTEM-ARCHITECTURE.md` - Technical architecture
3. `02-USER-ROLES-AND-FLOWS.md` - User journeys
4. `03-PHASE-1-ADMIN-DESKTOP.md` - Admin Desktop phase plan
5. `04-PHASE-2-MARKETPLACE.md` - Marketplace phase plan
6. `05-PHASE-3-COURIER-IOS.md` - Courier iOS phase plan
7. `06-DATABASE-SCHEMA.md` - Firestore schema
8. `07-CLOUD-FUNCTIONS.md` - Cloud Functions specs
9. `08-DEPLOYMENT-GUIDE.md` - Deployment instructions
10. `09-DAILY-CHECKLIST.md` - Day-by-day task breakdown
11. `10-FOLDER-STRUCTURE.md` - This document
12. `11-TECH-STACK-REFERENCE.md` - Technology reference

---

### `/scripts/`

**Purpose:** Automation scripts for building, testing, and deployment

**Key Scripts:**
```bash
build-all.sh              # Build all apps
test-all.sh               # Run all tests
deploy-desktop.sh         # Deploy desktop app
deploy-marketplace.sh     # Deploy marketplace web
deploy-courier.sh         # Prepare courier for App Store
deploy-functions.sh       # Deploy cloud functions
verify-phase0.sh          # Verify project setup
```

---

## Migration Guide

### Phase 1: Create New Apps

**Step 1: Create Admin Desktop**
```bash
mkdir -p apps/admin-desktop
cd apps/admin-desktop
pnpm init
pnpm add -D electron electron-builder vite typescript
```

**Step 2: Copy Admin App Code**
```bash
cp -r apps/admin-app/src apps/admin-desktop/src
cp -r apps/admin-app/public apps/admin-desktop/public
```

**Step 3: Create Marketplace App**
```bash
cd apps
pnpm create vite marketplace-app --template react-ts
cd marketplace-app
pnpm install
pnpm add @capacitor/core @capacitor/cli @capacitor/ios
pnpm exec cap init
pnpm exec cap add ios
```

**Step 4: Create Courier App**
```bash
cd apps
npx react-native@latest init CourierApp --template react-native-template-typescript
mv CourierApp courier-app
```

### Phase 2: Update Workspace Configuration

**Update `pnpm-workspace.yaml`:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'firebase/functions'
```

**Update `turbo.json`:**
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Phase 3: Update Scripts

**Add to root `package.json`:**
```json
{
  "scripts": {
    "dev:admin-desktop": "pnpm --filter @gosenderr/admin-desktop dev",
    "build:admin-desktop": "pnpm --filter @gosenderr/admin-desktop build",
    
    "dev:marketplace": "pnpm --filter @gosenderr/marketplace-app dev",
    "build:marketplace": "pnpm --filter @gosenderr/marketplace-app build",
    "deploy:marketplace": "pnpm build:marketplace && firebase deploy --only hosting:marketplace",
    
    "dev:courier": "pnpm --filter @gosenderr/courier-app start",
    "ios:courier": "pnpm --filter @gosenderr/courier-app ios",
    
    "deploy:functions": "firebase deploy --only functions",
    "deploy:all": "pnpm build && firebase deploy"
  }
}
```

### Phase 4: Archive Old Apps

**Mark for removal (don't delete yet):**
```bash
mkdir -p apps/_archive
# After verifying new apps work:
# mv apps/admin-app apps/_archive/
# mv apps/customer-app apps/_archive/
# mv apps/courier-app apps/_archive/courier-app-old
```

### Phase 5: Update Documentation

**Update root `README.md`:**
```markdown
# GoSenderr v2

## Apps
- **Admin Desktop** - Electron app for administrators
- **Marketplace** - Web + iOS marketplace
- **Courier iOS** - React Native delivery app

## Getting Started
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

See `/docs/project-plan/` for complete documentation.
```

---

## File Patterns & Conventions

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `OrderList.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `camelCase.ts` (e.g., `user.ts`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useAuth.ts`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `API_URL`)

**Directories:**
- Lowercase with hyphens (e.g., `admin-desktop`, `cloud-functions`)
- Plural for collections (e.g., `components`, `hooks`, `utils`)

### Import Patterns

**Workspace packages:**
```typescript
import { Order, OrderStatus } from '@gosenderr/shared'
import { Button, Card } from '@gosenderr/ui'
```

**Relative imports:**
```typescript
import { OrderList } from '@/components/orders/OrderList'
import { useOrders } from '@/hooks/useOrders'
import { formatDate } from '@/lib/utils'
```

**Path aliases in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

### Environment Variables

**Pattern:**
- Development: `.env.local` (gitignored)
- Example: `.env.example` (committed)
- Production: Set in hosting platform

**Naming:**
- Vite apps: `VITE_*` prefix (e.g., `VITE_FIREBASE_API_KEY`)
- React Native: No prefix (e.g., `FIREBASE_API_KEY`)
- Node.js: No prefix (e.g., `STRIPE_SECRET_KEY`)

### Git Patterns

**Ignore patterns (`.gitignore`):**
```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
*.app
*.dmg
*.exe

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Firebase
.firebase/
.runtimeconfig.json

# React Native
ios/Pods/
android/.gradle/
```

**Commit message format:**
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: admin, marketplace, courier, functions, shared
Example: feat(marketplace): add listing creation form
```

---

## 🔍 Quick Reference

### Finding Files

**User-related code:**
```
packages/shared/src/types/user.ts          # Types
apps/admin-desktop/src/pages/Users.tsx     # Admin UI
apps/marketplace-app/src/pages/Profile.tsx # User profile
firebase/functions/src/users/              # Backend
```

**Order-related code:**
```
packages/shared/src/types/order.ts         # Types
apps/admin-desktop/src/pages/Orders.tsx    # Admin UI
apps/marketplace-app/src/pages/MyOrders.tsx # Buyer UI
firebase/functions/src/orders/             # Backend
```

**Job/Delivery-related code:**
```
packages/shared/src/types/job.ts           # Types
apps/admin-desktop/src/pages/Jobs.tsx      # Admin UI
apps/courier-app/src/screens/MapScreen.tsx # Courier UI
firebase/functions/src/jobs/               # Backend
```

### Common Commands

```bash
# Development
pnpm dev                          # Run all apps
pnpm dev:admin-desktop            # Run admin desktop
pnpm dev:marketplace              # Run marketplace web
pnpm ios:courier                  # Run courier iOS

# Building
pnpm build                        # Build all apps
pnpm build:admin-desktop          # Build desktop app
pnpm build:marketplace            # Build marketplace

# Deployment
pnpm deploy:marketplace           # Deploy marketplace
pnpm deploy:functions             # Deploy cloud functions
pnpm deploy:all                   # Deploy everything

# Testing
pnpm test                         # Run all tests
pnpm lint                         # Lint all apps
```

---

**Last Updated:** January 2026  
**Maintained by:** GoSenderr Development Team

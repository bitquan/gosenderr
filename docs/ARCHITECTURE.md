# Architecture

## Overview
- Monorepo with multiple apps: `marketplace-app`, `courier-app`, `admin-app`, `admin-desktop`, `landing`.
- Backend: Firebase (Auth, Firestore, Cloud Functions, Hosting).
- Payments: Stripe (Connect + Cloud Functions).
- Maps: Mapbox for courier routing/UI.

## App responsibilities
- `marketplace-app`: marketplace UI, ordering flow, seller/courier interactions.
- `courier-app`: map-first UI and navigation for couriers.
- `admin-app`: administrative dashboards, user management.
- `admin-desktop`: Electron shell for admin workflows.
- `landing`: marketing and entry point.

## Backend services
- **Auth**: Firebase Authentication with custom claims (admin, packageRunner).
- **Firestore**: Primary data store with role-based rules.
- **Cloud Functions**: Callable admin tools, job/marketplace triggers, Stripe integrations.
- **Hosting**: Firebase Hosting for web apps.

## Data model (canonical collections)
Source of truth: [firebase/firestore.rules](../firebase/firestore.rules)

- `users/{uid}` — user profile, roles, and per-role subprofiles.
- `adminProfiles/{uid}` — admin-only access control.
- `adminFlowLogs/{logId}` — admin test flow run logs (+ `entries` subcollection).
- `items/{itemId}` — marketplace listings.
- `marketplaceOrders/{orderId}` — order lifecycle and payment status.
- `deliveryJobs/{jobId}` — delivery job lifecycle and courier tracking.

## Cloud Functions
Source of truth: [firebase/functions/src/index.ts](../firebase/functions/src/index.ts)

- **Triggers**: `autoCancel`, `sendNotifications`, `capturePayment`, `refundPayment`, `enforceRatings`, `buildRoutes`, `buildLongRoutes`, `seedHubs`, `buildLongHaulRoutes`, `onAdminActionLog`, `onUserCreate`.
- **Callable admin tools**: `setAdminClaim`, `setPackageRunnerClaim`, `banUser`, `createUserForAdmin`, `runTestFlow`, `getPublicConfig`.
- **Stripe**: `createPaymentIntent`, `stripeConnect`, `marketplaceCheckout`, `createMarketplaceOrder`, `transferPayout`, marketplace Connect + webhooks, `stripeWebhook`.

## External services
- **Stripe**: Payments + Connect onboarding for sellers and payouts.
- **Mapbox**: Maps/route UX in courier app.

## CI / Deployment
- CI uses GitHub Actions for lint, docs, build, and tests.
- Deploys via Firebase CLI (hosting + functions + rules).
- Details: [docs/DEPLOYMENT.md](DEPLOYMENT.md)

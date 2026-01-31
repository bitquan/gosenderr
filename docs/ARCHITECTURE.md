# Architecture (Draft)

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

## Data model
- Use canonical Firestore collections and server timestamps. Document known collections here.

## CI / Deployment
- Use Firebase Hosting for apps; Cloud Functions deployed via `firebase deploy`.
- For detailed steps see `DEPLOYMENT.md`.

(Expand each section with diagrams and references.)

# Project Status

**Last Updated:** January 23, 2026

## Current Architecture

- **Admin App**: Vite + React at `apps/admin-app` (Port 3000)
- **Courier App**: Vite + React at `apps/courier-app` (Port 3001)
- **Customer App**: Vite + React at `apps/customer-app` (Port 3002)
- **Web App**: Next.js 15.5.9 at `apps/web` (Port 3003)
- **Firebase**: Auth/Firestore/Storage/Functions in project `gosenderr-6773f`
- **Hosting**: Firebase Hosting (custom domain) proxies to Cloud Run
- **Styling**: Tailwind CSS with purple gradient theme (#6B4EFF to #9D7FFF)

## Port Assignments (PERMANENT)

| App | Port | URL | Purpose |
|-----|------|-----|---------|
| Admin App | 3000 | http://localhost:3000 | Admin dashboard for managing users, jobs, runners |
| Courier App | 3001 | http://localhost:3001 | Courier interface with admin features |
| Customer App | 3002 | http://localhost:3002 | Customer job creation and tracking |
| Web (Next.js) | 3003 | http://localhost:3003 | Marketing/public pages |

**Note**: All Vite apps use `strictPort: true` to prevent silent port switching.

## Features Implemented

### ✅ Admin Role System (NEW - Jan 23, 2026)

- **Cloud Functions Deployed**:
  - `setAdminClaim`: Promote/demote admin users with custom claims
  - `setPackageRunnerClaim`: Approve/reject package runner applications
  - `banUser`: Ban/unban users with Firebase Auth disable
  - `onAdminActionLog`: Audit logging for admin actions
  
- **Firestore Rules**: Custom claim validation (`isAdmin()`, `isPackageRunner()`)
- **Admin User Management**: 
  - 6 filter tabs: All, Customers, Couriers, Runners, Vendors, Admins
  - Count badges for each role type
  - Role badges: Admin (red), Package Runner (orange), Vendor (indigo), Courier (purple), Customer (gray)
  - Available in both admin-app and courier-app

- **Custom Claims**: 
  - `admin: true` for admin users
  - `packageRunner: true` for approved package runners

### ✅ Marketplace

- **Browse Page** (`/marketplace`): Public marketplace with category filtering, compact mobile-first design
- **Item Detail** (`/marketplace/[itemId]`): Compact item view with photo gallery, description, pricing
- **Vendor Dashboard** (`/vendor/items`): Manage listings (mark sold, delete)
- **Create Listing** (`/vendor/items/new`): Form with photo uploads, categories, conditions
- **Item Cards**: Compact grid layout (150px min, 2-3 columns on mobile)
- **Firestore Rules**: Public read access, authenticated write
- **Storage Rules**: Public read for item photos, owner-only write

### ✅ Delivery Jobs

- **Customer Flow**: Create jobs, view jobs, track deliveries
- **Courier Flow**: Browse open jobs, claim jobs, update status
- **Job States**: open → assigned → enroute_pickup → picked_up → enroute_dropoff → completed
- **Real-time Updates**: Firestore listeners for job status changes

### ✅ Navigation

- **Universal Navbar**: Sticky navbar on all pages (except login/select-role)
- **Smart Links**: Marketplace, My Jobs (customer), Dashboard (courier), My Items (all)
- **Role-based**: Shows appropriate links based on user role
- **Sign In/Out**: Authentication management

### ✅ Authentication & Roles

- **Login**: Email/password auth with auto-account creation
- **Role Selection**: Customer or Courier selection on first login
- **Role Gates**: Protect routes by role
- **Auth Gates**: Require authentication for protected routes

### ✅ Shared Components

- **RateCardBuilder**: Visual rate card configuration (348 lines)
- **EquipmentBadges**: Display equipment with icons (154 lines)
- **Navbar**: Universal navigation component
- **ItemCard**: Reusable marketplace item card

### ✅ Cloud Functions

- **Auto-cancel**: Scheduled function (every 5min) cancels jobs open >30min
- **Notifications**: Firestore trigger sends push notifications on status changes

## Deploy

### Production

- **Cloud Run Service**: `gosenderr-web` (region `us-central1`)
- **Firebase Hosting**: `gosenderr-6773f`

### Local Commands

```bash
# Deploy to Firebase Hosting
pnpm deploy:web:hosting

# Deploy Firestore/Storage rules
firebase deploy --only firestore:rules,storage

# Run dev server
pnpm dev
```

## Recent Changes (Jan 20, 2026)

1. **Marketplace Styling**: Converted all pages to inline styles matching customer page pattern
2. **Mobile Optimization**: Compact layouts, smaller fonts (13-15px), tighter padding (8-12px)
3. **Universal Navbar**: Added navbar to root layout for consistent navigation
4. **Public Marketplace**: Updated Firestore/Storage rules for public read access
5. **Vendor Pages**: Styled items list and creation form with consistent design

## Firebase Rules Summary

### Firestore

- **Items**: Public read, authenticated create/update/delete (owner only)
- **Users**: Self read/write, public read for online couriers
- **Jobs**: Participant access (customer/courier/seller)
- **Ratings**: Public read, authenticated create (no updates)

### Storage

- **Items Photos** (`items/{userId}/`): Public read, owner write
- **Job Photos** (`jobs/{jobId}/`): Participant read, creator write
- **Temp Uploads** (`jobs/temp_*/`): Authenticated users

## Tech Stack

- **Frontend**: Next.js 15.5.9, React 19, TypeScript 5.9.3
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Styling**: Inline styles, no Tailwind
- **Maps**: Mapbox GL JS
- **Package Manager**: pnpm with workspaces
- **Monorepo**: Turborepo

## Environment

- **Node**: 18+
- **Dev Container**: Ubuntu 24.04.3 LTS
- **Firebase Project**: gosenderr-6773f
- **Region**: us-central1

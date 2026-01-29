# 🏗️ GOSENDERR - SYSTEM ARCHITECTURE

## Overview

GoSenderR is a multi-role marketplace and delivery platform with role-based access control, built on Firebase, React, and mobile-native technologies.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GOSENDERR ECOSYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐      ┌──────────────────────┐
│   WEB APPLICATION    │      │   MOBILE APPS        │
│   (gosenderr.com)    │      │   (iOS/Android)      │
├──────────────────────┤      ├──────────────────────┤
│ • Marketplace (Home) │      │ • Courier App        │
│ • Customer Portal    │      │ • Shifter App        │
│ • Vendor Portal      │      │ • Customer App       │
│ • Admin Dashboard    │      │ • Admin App          │
└──────────────────────┘      └──────────────────────┘
          │                              │
          └──────────────┬───────────────┘
                         ▼
          ┌─────────────────────────────┐
          │   FIREBASE BACKEND          │
          ├─────────────────────────────┤
          │ • Firestore Database        │
          │ • Cloud Functions           │
          │ • Authentication            │
          │ • Storage (Images)          │
          │ • Hosting (Web)             │
          └─────────────────────────────┘
                         │
          ┌──────────────┴───────────────┐
          ▼                              ▼
   ┌─────────────┐              ┌──────────────┐
   │   STRIPE    │              │   MAPBOX     │
   │  (Payments) │              │   (Maps)     │
   └─────────────┘              └──────────────┘
```

## Domain Structure

**Primary Domain:** `gosenderr.com`

```
/ (Home/Marketplace) ← MAIN ENTRY POINT
├── /marketplace (Browse all vendor items)
├── /marketplace/:itemId (Item details)
├── /login (Authentication)
├── /signup (Registration with role selection)
├── /dashboard (Role-based redirect)
│   ├── /customer/* (Customer features)
│   ├── /vendor/* (Vendor features)
│   ├── /courier/* (Courier features)
│   └── /admin/* (Admin features)
└── /settings (User settings)
```

## Role-Based Access Control

### User Roles

```typescript
enum UserRole {
  CUSTOMER = 'customer',    // Browse, purchase, request delivery
  VENDOR = 'vendor',        // Sell items in marketplace
  COURIER = 'courier',      // Deliver packages
  ADMIN = 'admin'           // Manage everything
}
```

### Multi-Role Support

Users can have **multiple roles** and switch between them:
- A customer can also be a vendor
- A courier can also be a customer
- Admins can simulate any role
- Primary role is set per login session

### User Model

```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];        // Users can have MULTIPLE roles
  primaryRole: UserRole;    // Default role on login
  
  // Customer-specific
  deliveryAddresses?: Address[];
  paymentMethods?: PaymentMethod[];
  
  // Vendor-specific
  isVendor?: boolean;
  vendorProfile?: VendorProfile;
  stripeConnectId?: string;
  
  // Courier-specific
  isCourier?: boolean;
  courierProfile?: CourierProfile;
  vehicleInfo?: VehicleInfo;
  
  // Admin-specific
  isAdmin?: boolean;
  adminPermissions?: string[];
}
```

## Application Structure

### Web Application (Customer App)

**Entry Point:** `https://gosenderr.com`  
**Tech Stack:** React + TypeScript + Vite + Firebase

**Key Features:**
- Marketplace browsing (public)
- Role-based authentication
- Customer portal
- Vendor portal
- Admin dashboard
- Responsive design

### Mobile Apps

#### Courier App
- Turn-by-turn navigation (Mapbox)
- Job management
- Real-time location tracking
- Earnings dashboard
- Built with Capacitor

#### Shifter App
- Shift management
- Package handling
- Warehouse operations

#### Customer Mobile App
- Browse marketplace
- Track deliveries
- Manage orders

#### Admin Mobile App
- User management
- Vendor approval
- System monitoring

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** React Context + Hooks
- **UI Components:** Tailwind CSS
- **Mobile:** Capacitor (iOS/Android)

### Backend
- **Platform:** Firebase
- **Database:** Firestore
- **Auth:** Firebase Authentication
- **Functions:** Cloud Functions (Node.js)
- **Storage:** Cloud Storage
- **Hosting:** Firebase Hosting

### Third-Party Services
- **Payments:** Stripe + Stripe Connect
- **Maps:** Mapbox GL JS
- **Analytics:** Google Analytics 4

### Development Tools
- **Package Manager:** pnpm
- **Monorepo:** Turborepo
- **Linting:** ESLint + Prettier
- **Testing:** Vitest + Testing Library
- **CI/CD:** GitHub Actions

## Security Model

### Authentication
- Email/password authentication
- Session management via Firebase Auth
- JWT tokens for API calls
- Role verification on every request

### Authorization
- Role-based access control (RBAC)
- Firestore security rules
- Cloud Functions authorization
- Route guards on frontend

### Data Protection
- Encrypted data at rest (Firebase)
- HTTPS only
- Secure payment processing (PCI compliant)
- User data isolation

## Scalability Considerations

### Database
- Indexed queries for performance
- Pagination for large datasets
- Real-time listeners for live updates
- Offline support with Firestore

### Functions
- Stateless functions for scaling
- Background jobs for heavy tasks
- Rate limiting for API endpoints
- Caching strategies

### Hosting
- CDN for static assets
- Image optimization
- Code splitting
- Lazy loading

## Monitoring & Logging

### Production Monitoring
- Firebase Performance Monitoring
- Cloud Functions logs
- Error tracking (Sentry recommended)
- User analytics

### Development Tools
- Firebase Emulators
- Hot module replacement
- Source maps
- Debug logging

## Deployment Architecture

### Production Environment
- **Domain:** gosenderr.com
- **Hosting:** Firebase Hosting
- **Functions:** Cloud Functions (us-central1)
- **Database:** Firestore (multi-region)

### Development Environment
- **Local:** Firebase Emulators
- **Staging:** Firebase preview channels
- **CI/CD:** GitHub Actions

### Mobile Deployment
- **iOS:** TestFlight → App Store
- **Android:** Internal Testing → Play Store
- **Updates:** CodePush for minor updates

## Performance Targets

- **Page Load:** < 2s (First Contentful Paint)
- **Time to Interactive:** < 3s
- **API Response:** < 500ms (p95)
- **Real-time Updates:** < 1s latency
- **Mobile App Size:** < 25MB

## Disaster Recovery

- **Database Backups:** Daily automated
- **Functions:** Versioned deployments
- **Rollback:** One-command rollback
- **Monitoring:** 24/7 uptime monitoring

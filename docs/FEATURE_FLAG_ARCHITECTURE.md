# Feature Flag System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Admin Dashboard                          │
│                   /admin/feature-flags                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Customer Features                                        │  │
│  │  ┌────────────────────────────────────────────────┐      │  │
│  │  │ customer.packageShipping                       │      │  │
│  │  │ Enable package shipping for customers          │      │  │
│  │  │                              [✓ Enabled] ─────┼──┐   │  │
│  │  └────────────────────────────────────────────────┘  │   │  │
│  └──────────────────────────────────────────────────────┼───┘  │
│                                                          │       │
│  ┌──────────────────────────────────────────────────────┼───┐  │
│  │  Delivery Features                                   │   │  │
│  │  ┌────────────────────────────────────────────────┐ │   │  │
│  │  │ delivery.routes                                │ │   │  │
│  │  │ Enable courier routes view                     │ │   │  │
│  │  │                              [✗ Disabled] ─────┼─┼─┐ │  │
│  │  └────────────────────────────────────────────────┘ │ │ │  │
│  └──────────────────────────────────────────────────────┘ │ │  │
└─────────────────────────────────────────────────────────┼─┼─┼──┘
                                                           │ │ │
                     ┌─────────────────────────────────────┘ │ │
                     │                 ┌─────────────────────┘ │
                     │                 │                        │
                     ▼                 ▼                        ▼
        ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
        │   Firestore DB     │  │   Firestore DB     │  │   Firestore DB     │
        │  featureFlags      │  │  featureFlags      │  │  featureFlags      │
        │                    │  │                    │  │                    │
        │  customer.         │  │  delivery.         │  │  (other flags...)  │
        │  packageShipping   │  │  routes            │  │                    │
        │  ────────────────  │  │  ────────────────  │  │                    │
        │  enabled: true     │  │  enabled: false    │  │                    │
        │  category: customer│  │  category: delivery│  │                    │
        │  description: ...  │  │  description: ...  │  │                    │
        │  updatedBy: admin1 │  │  updatedBy: admin1 │  │                    │
        └────────────────────┘  └────────────────────┘  └────────────────────┘
                     │                 │                        │
                     └─────────────────┴────────────────────────┘
                                       │
                         Real-time WebSocket Updates
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│  Customer Client  │         │  Courier Client   │         │   Admin Client    │
│                   │         │                   │         │                   │
│  useFeatureFlag(  │         │  useFeatureFlag(  │         │  useFeatureFlags()│
│   'customer.      │         │   'delivery.      │         │                   │
│   packageShipping'│         │   routes'         │         │  Lists all flags  │
│  )                │         │  )                │         │  for dashboard    │
│                   │         │                   │         │                   │
│  Returns:         │         │  Returns:         │         │                   │
│  enabled: true ✓  │         │  enabled: false ✗ │         │                   │
│                   │         │                   │         │                   │
└─────────┬─────────┘         └─────────┬─────────┘         └───────────────────┘
          │                             │
          │ enabled = true              │ enabled = false
          ▼                             ▼
┌───────────────────┐         ┌───────────────────┐
│   /ship Page      │         │ /courier/routes   │
│   ✓ ACCESSIBLE    │         │   ✗ BLOCKED       │
│                   │         │                   │
│ Shows:            │         │ Shows:            │
│ - Package form    │         │ - "Feature Not    │
│ - Beta notice     │         │    Available"     │
│ - Create button   │         │ - Go to Dashboard │
└───────────────────┘         └───────────────────┘
```

## Data Flow

### 1. Admin Toggles Flag

```
Admin Dashboard
    │
    │ setDoc(db, 'featureFlags', 'customer.packageShipping', {
    │   enabled: true,
    │   updatedAt: Timestamp.now(),
    │   updatedBy: 'admin-uid-123'
    │ })
    ▼
Firestore
    │
    │ Real-time onSnapshot() listener fires
    ▼
All Connected Clients (WebSocket)
    │
    │ useFeatureFlag hook receives update
    ▼
React Component Re-renders
    │
    │ enabled changed: false → true
    ▼
Page Content Updates
    │
    ├─ Flag disabled: Shows "Feature Not Available"
    └─ Flag enabled: Shows actual feature content
```

### 2. User Visits Gated Page

```
User navigates to /ship
    │
    ▼
Page component mounts
    │
    ▼
useFeatureFlag('customer.packageShipping') called
    │
    ├─ Firebase not initialized → returns loading: true
    │
    ├─ Firestore doc exists → returns { enabled: bool, flag: FeatureFlagDoc, loading: false }
    │
    └─ Firestore doc missing → returns { enabled: false, flag: null, loading: false }
    │
    ▼
Component renders based on enabled state
    │
    ├─ enabled = true  → Show feature content
    │
    └─ enabled = false → Show "Feature Not Available"
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Firestore Security Rules                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  match /featureFlags/{flagKey} {                            │
│                                                               │
│    // Anyone authenticated can READ flags                   │
│    allow read: if request.auth != null;                     │
│         │                                                     │
│         ├─ Customer → Can check customer.packageShipping    │
│         ├─ Courier → Can check delivery.routes              │
│         └─ Admin → Can read all flags                        │
│                                                               │
│    // Only ADMINS can WRITE flags                           │
│    allow write: if request.auth != null                     │
│         && get(/databases/$(database)/documents/            │
│               users/$(request.auth.uid)).data.role == 'admin'│
│         && request.resource.data.enabled is bool             │
│         && request.resource.data.category in                 │
│            ['customer', 'delivery', 'admin', 'marketplace']; │
│         │                                                     │
│         └─ Only admin role can modify flags                  │
│           Structure must be valid                            │
│                                                               │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                    App Layout (layout.tsx)                    │
└───────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────────┐    ┌─────────────────┐
│ Admin Routes │      │ Customer Routes  │    │ Courier Routes  │
│              │      │                  │    │                 │
│ /admin/      │      │ /customer/       │    │ /courier/       │
│ feature-flags│      │ (existing)       │    │ (existing)      │
│              │      │                  │    │                 │
│ ┌──────────┐ │      │ /ship (NEW)      │    │ /routes (NEW)   │
│ │Uses:     │ │      │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │          │ │      │ │Uses:         │ │    │ │Uses:        │ │
│ │Feature   │ │      │ │              │ │    │ │             │ │
│ │Flags     │ │      │ │useFeatureFlag│ │    │ │useFeature   │ │
│ │Hook      │ │      │ │('customer.   │ │    │ │Flag         │ │
│ │          │ │      │ │packageShipping│ │   │ │('delivery.  │ │
│ │Shows all │ │      │ │)             │ │    │ │routes')     │ │
│ │flags     │ │      │ │              │ │    │ │             │ │
│ │          │ │      │ │Returns:      │ │    │ │Returns:     │ │
│ │Toggles   │ │      │ │{ enabled }   │ │    │ │{ enabled }  │ │
│ │enabled   │ │      │ │              │ │    │ │             │ │
│ │state     │ │      │ │Renders:      │ │    │ │Renders:     │ │
│ │          │ │      │ │- Feature if ✓│ │    │ │- Routes if ✓│ │
│ └──────────┘ │      │ │- Message if ✗│ │    │ │- Message if✗│ │
│              │      │ └──────────────┘ │    │ └─────────────┘ │
└──────────────┘      └──────────────────┘    └─────────────────┘
```

## Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                      Firebase Console                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Firestore Database                                       │   │
│  │                                                           │   │
│  │  Collections:                                            │   │
│  │  ├─ users (existing)                                     │   │
│  │  ├─ jobs (existing)                                      │   │
│  │  ├─ deliveryJobs (existing)                              │   │
│  │  └─ featureFlags (NEW) ← Monitor this                    │   │
│  │      │                                                    │   │
│  │      ├─ customer.packageShipping                         │   │
│  │      │   enabled: true                                   │   │
│  │      │   updatedAt: 2026-01-21 10:30:00                  │   │
│  │      │   updatedBy: admin-uid-123                        │   │
│  │      │                                                    │   │
│  │      └─ delivery.routes                                  │   │
│  │          enabled: false                                  │   │
│  │          updatedAt: 2026-01-21 10:30:00                  │   │
│  │          updatedBy: admin-uid-123                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Cloud Functions Logs                                     │   │
│  │                                                           │   │
│  │  Filter: severity=ERROR                                  │   │
│  │  Search: "featureFlag", "/ship", "/courier/routes"       │   │
│  │                                                           │   │
│  │  Recent Errors: None ✓                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Usage Metrics                                            │   │
│  │                                                           │   │
│  │  Reads from featureFlags:  1,234/day                    │   │
│  │  Writes to featureFlags:   12/day (admin changes)       │   │
│  │                                                           │   │
│  │  /ship page views:         45/day (if flag enabled)     │   │
│  │  /courier/routes views:    0/day (flag disabled)        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Flow

```
Phase 2.1: Internal Testing (Days 1-2)
    │
    ├─ Enable both flags
    │   └─ Toggle in admin dashboard
    │
    ├─ Test /ship page
    │   ├─ Visit as customer
    │   ├─ Verify no console errors
    │   └─ Complete job creation flow
    │
    ├─ Test /courier/routes page
    │   ├─ Visit as courier
    │   ├─ Verify routes display
    │   └─ Accept a route
    │
    └─ Test flag toggling
        ├─ Disable flags
        ├─ Verify "Feature Not Available"
        ├─ Re-enable flags
        └─ Verify pages accessible again
        
Phase 2.2: Limited Beta (Days 3-7)
    │
    ├─ Select 5-10 customers + 5-10 couriers
    │
    ├─ Enable flags for beta group
    │
    ├─ Monitor daily
    │   ├─ Firebase Console errors
    │   ├─ Payment success rates
    │   ├─ User feedback
    │   └─ Feature usage stats
    │
    └─ Fix issues discovered
        └─ Deploy fixes → Re-test
        
Phase 2.3: Expanded Beta (Days 8-14)
    │
    ├─ Expand to 20-50 users (if Phase 2.2 successful)
    │
    ├─ Monitor scaling
    │   ├─ Performance metrics
    │   ├─ Error rates
    │   └─ Cost analysis
    │
    └─ Prepare for General Availability
        ├─ Document learnings
        ├─ Plan announcement
        └─ Train support team
```

---

**Architecture Status**: ✅ Complete and Ready for Deployment  
**Documentation**: ✅ Comprehensive guides provided  
**Security**: ✅ Validated via CodeQL scan  
**Testing**: ✅ Type-checked and code-reviewed

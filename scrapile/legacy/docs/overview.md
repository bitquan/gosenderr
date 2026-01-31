# 🎯 **COMPLETE ROLE BREAKDOWN - GOSENDERR PLATFORM**

Based on your codebase, here's what each role should have access to:

---

## 👤 **1. CUSTOMER ROLE**

### **Purpose:**
Buy items from marketplace and request delivery services

### **Database Schema:**
```typescript
users/{uid} {
  role: 'customer',
  displayName: 'John Doe',
  email: 'customer@example.com',
  profilePhotoUrl?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  
  // Customer-specific fields
  defaultAddress?: {
    address: string,
    lat: number,
    lng: number
  },
  
  // Stats (auto-updated)
  totalOrders: 0,
  totalSpent: 0,
  favoriteVendors: string[] // vendor user IDs
}
```

### **Routes & Features:**
```
PUBLIC ACCESS:
/marketplace              - Browse items
/marketplace/[itemId]     - View item details
/track/package/[trackingNumber] - Track packages (no auth)

AUTHENTICATED:
/customer/dashboard       - Recent packages, jobs, orders, activity feed
/customer/packages        - All packages with tracking
/customer/packages/[id]   - Package details & timeline
/customer/orders          - Marketplace orders
/customer/orders/[id]     - Order details & cancel
/customer/jobs            - Delivery jobs list
/customer/jobs/[jobId]    - Job details
/customer/jobs/new        - Create new job
/customer/request-delivery - Request delivery for marketplace item
/customer/checkout        - Payment & checkout
/customer/profile         - Profile settings

SPECIAL:
/ship                     - Package shipping form (Phase 2)
/ship/confirmation/[id]   - Payment confirmation
```

### **Permissions:**
```
CAN:
✅ Browse marketplace
✅ Purchase items
✅ Request delivery
✅ Track packages/orders
✅ Rate couriers/vendors
✅ Cancel orders (before pickup)
✅ Create delivery jobs
✅ View delivery history

CANNOT:
❌ Create marketplace items (must upgrade to vendor)
❌ Accept delivery jobs
❌ Access admin features
❌ Manage other users' data
```

### **Navigation (Bottom Nav):**
```typescript
[
  { icon: "🏠", label: "Home", href: "/customer/dashboard" },
  { icon: "📦", label: "Packages", href: "/customer/packages" },
  { icon: "🛒", label: "Orders", href: "/customer/orders" },
  { icon: "👤", label: "Profile", href: "/customer/profile" }
]

// FAB (Floating Action Button):
{ icon: "➕", label: "Ship", href: "/customer/request-delivery" }
```

---

## 🏪 **2. VENDOR ROLE**

### **Purpose:**
Sell items on marketplace with Stripe Connect payouts

### **Database Schema:**
```typescript
users/{uid} {
  role: 'vendor',
  displayName: 'Jane's Shop',
  email: 'vendor@example.com',
  profilePhotoUrl?: string,
  
  // Vendor-specific fields
  vendorProfile: {
    businessName: string,
    businessType: 'individual' | 'business',
    description?: string,
    
    // Stripe Connect
    stripeAccountId?: string,
    stripeAccountStatus: 'pending' | 'active' | 'restricted',
    onboardingComplete: boolean,
    
    // Store settings
    storeHours?: {
      monday: { open: '09:00', close: '17:00' },
      // ... other days
    },
    
    // Stats
    totalSales: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalReviews: 0,
    totalItems: 0,
    activeItems: 0,
    
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
}
```

### **Routes & Features:**
```
/vendor/onboarding        - Stripe Connect setup
/vendor/dashboard         - Sales stats, recent orders, earnings
/vendor/items             - Manage inventory
/vendor/items/new         - DEPRECATED (use /marketplace/create)
/vendor/orders            - View & manage orders
/vendor/orders/[orderId]  - Order details, mark as ready
/vendor/settings          - Business settings, payout schedule
/vendor/analytics         - Sales charts, best sellers

SHARED WITH CUSTOMER:
/marketplace/create       - Create new item listing
/marketplace/[itemId]     - View own items
```

### **Permissions:**
```
CAN:
✅ Create unlimited marketplace items
✅ Manage inventory (edit, delete, mark sold)
✅ Receive Stripe Connect payouts
✅ Set item prices & descriptions
✅ Upload item photos
✅ Mark orders as "ready for pickup"
✅ View sales analytics
✅ Rate couriers who delivered their items
✅ ALSO has all customer permissions (can buy from other vendors)

CANNOT:
❌ Access admin features
❌ Accept delivery jobs (unless also courier)
❌ Edit other vendors' items
```

### **Stripe Connect Flow:**
```
1. User upgrades to vendor role → /vendor/onboarding
2. Click "Connect with Stripe"
3. Redirect to Stripe onboarding (express account)
4. Complete KYC (identity, bank account)
5. Return to /vendor/dashboard
6. vendorProfile.stripeAccountStatus = 'active'
7. Can now receive payouts

PAYOUT SCHEDULE:
- Customer pays via Stripe
- Platform holds payment in escrow
- Courier picks up item → Payment released
- Vendor receives payout (minus platform fee)
```

### **Navigation:**
```typescript
// If user is BOTH customer and vendor, show toggle or merged nav
[
  { icon: "🏪", label: "My Store", href: "/vendor/dashboard" },
  { icon: "📦", label: "Items", href: "/vendor/items" },
  { icon: "🛒", label: "Orders", href: "/vendor/orders" },
  { icon: "💰", label: "Earnings", href: "/vendor/analytics" }
]

// FAB:
{ icon: "➕", label: "List Item", href: "/marketplace/create" }
```

---

## 🚗 **3. COURIER ROLE (Local Delivery)**

### **Purpose:**
Accept and complete local delivery jobs (food & packages)

### **Database Schema:**
```typescript
users/{uid} {
  role: 'courier',
  displayName: 'Mike Driver',
  email: 'courier@example.com',
  
  courierProfile: {
    // Setup
    vehicleType: 'car' | 'van' | 'bike' | 'scooter' | 'foot' | 'truck',
    serviceRadius: 15, // miles
    status: 'pending_review' | 'approved' | 'suspended' | 'banned',
    
    // Work Modes
    workModes: {
      packagesEnabled: true,
      foodEnabled: true
    },
    
    // Rate Cards
    packageRateCard: {
      baseFare: 3.00,      // min $3
      perMile: 0.50,       // min $0.50
      perMinute: 0.10,     // min $0.10
      optionalFees: [
        { name: 'Heavy Items (50+ lbs)', amount: 15.00 },
        { name: 'Stairs (per flight)', amount: 5.00 }
      ]
    },
    
    foodRateCard: {
      baseFare: 2.50,           // min $2.50
      perMile: 0.75,            // min $0.75
      restaurantWaitPay: 0.15,  // per minute waiting
      peakHours: [
        {
          days: ['friday', 'saturday'],
          startTime: '18:00',
          endTime: '21:00',
          multiplier: 1.5  // 50% boost
        }
      ],
      optionalFees: [
        { name: 'Contactless', amount: 0 },
        { name: 'Fragile Handling', amount: 3.00 }
      ]
    },
    
    // Current Status
    isOnline: false,
    currentLocation: {
      lat: 37.7749,
      lng: -122.4194,
      timestamp: Timestamp
    },
    
    // Vehicle Details
    vehicleDetails?: {
      make: 'Honda',
      model: 'Civic',
      year: 2020,
      licensePlate: 'ABC123',
      color: 'blue'
    },
    
    // Equipment (for food delivery)
    equipment: {
      insulated_bag: {
        has: true,
        photoUrl: 'https://...',
        approved: true,
        approvedAt: Timestamp
      },
      cooler: {
        has: true,
        photoUrl: 'https://...',
        approved: true
      },
      hot_bag: { has: false },
      drink_carrier: { has: false },
      // Package equipment
      dolly: { has: false },
      straps: { has: false },
      furniture_blankets: { has: false }
    },
    
    // Stats
    totalDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    
    createdAt: Timestamp,
    updatedAt: Timestamp
  },
  
  // LEGACY (deprecated, keep for backward compatibility)
  courier?: {
    transportMode: 'car',
    rateCard: { baseFee: 5, perMile: 1.5 },
    isOnline: false
  }
}
```

### **Routes & Features:**
```
/courier/onboarding       - 5-step wizard (NEW)
  → Step 1: Vehicle type + service radius
  → Step 2: Work modes (packages/food)
  → Step 3: Package rate card
  → Step 4: Food rate card
  → Step 5: Review & submit

/courier/dashboard        - Available jobs, eligibility filter, map
/courier/setup            - Redirect to rate-cards (legacy)
/courier/rate-cards       - Edit package/food rates, toggle work modes
/courier/equipment        - Upload equipment photos, get badges
/courier/jobs/[jobId]     - Job details, update status
/courier/routes           - Batched delivery routes (Phase 2)
/courier/active-route     - Active route with GPS photo capture
/courier/settings         - Profile, vehicle, preferences
```

### **Permissions:**
```
CAN:
✅ Accept local delivery jobs (within service radius)
✅ Set own rates (with minimums enforced)
✅ Toggle online/offline
✅ Choose work modes (packages only, food only, or both)
✅ Upload equipment for verification
✅ View earnings & stats
✅ Update delivery status (enroute_pickup, picked_up, enroute_dropoff, delivered)
✅ Capture GPS-tagged proof of delivery photos
✅ ALSO has customer permissions (can order from marketplace)

CANNOT:
❌ Accept jobs outside service radius
❌ Accept food jobs without approved equipment
❌ Set rates below platform minimums
❌ Accept jobs when offline
❌ Access admin features
❌ View other couriers' data
```

### **Eligibility Logic:**
```typescript
// Courier is eligible for a job if:
1. courierProfile.status === 'approved'
2. courierProfile.isOnline === true
3. Job type matches enabled work mode
   - Package job → workModes.packagesEnabled === true
   - Food job → workModes.foodEnabled === true
4. Distance from courier to pickup ≤ serviceRadius
5. Job distance (pickup → dropoff) within acceptable range
6. Food jobs: Has required equipment approved
   - requiresCooler → equipment.cooler.approved === true
   - requiresHotBag → equipment.hot_bag.approved || insulated_bag.approved
   - requiresDrinkCarrier → equipment.drink_carrier.approved === true
```

### **Navigation:**
```typescript
[
  { icon: "🏠", label: "Home", href: "/courier/dashboard" },
  { icon: "🗺️", label: "Routes", href: "/courier/routes" },
  { icon: "📋", label: "Jobs", href: "/courier/jobs" },
  { icon: "⚙️", label: "Settings", href: "/courier/settings" }
]

// FAB:
{ icon: "🔧", label: "Equipment", href: "/courier/equipment" }
```

---

## 🚚 **4. PACKAGE_RUNNER ROLE (Long-Haul)**

### **Purpose:**
Transport packages between hubs (interstate/long-distance)

### **Database Schema:**
```typescript
users/{uid} {
  role: 'package_runner',
  displayName: 'Sarah Trucker',
  email: 'runner@example.com',
  
  packageRunnerProfile: {
    status: 'pending_review' | 'approved' | 'suspended',
    
    // Vehicle (must be van/truck)
    vehicleType: 'van' | 'truck',
    vehicleDetails: {
      make: 'Ford',
      model: 'Transit',
      year: 2021,
      licensePlate: 'XYZ789',
      cargoCapacity: '1000 cu ft',
      maxWeight: '3500 lbs'
    },
    
    // Documents
    documents: {
      driversLicense: {
        uploaded: true,
        url: 'https://...',
        verified: true
      },
      commercialLicense?: {
        uploaded: true,
        url: 'https://...',
        verified: true
      },
      insurance: {
        uploaded: true,
        url: 'https://...',
        expiresAt: Timestamp,
        verified: true
      }
    },
    
    // Home Hub (where they start routes)
    homeHub: {
      id: 'hub_sf',
      name: 'San Francisco Hub',
      address: '123 Main St, SF, CA'
    },
    
    // Stats
    totalRoutes: 0,
    completedRoutes: 0,
    totalMiles: 0,
    totalEarnings: 0,
    averageRating: 0,
    
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
}
```

### **Routes & Features:**
```
/runner/onboarding        - Upload docs, select home hub
/runner/dashboard         - Stats, active routes, earnings
/runner/available-routes  - Long-haul routes from home hub
/runner/active-route      - Navigate route, scan packages
/runner/settings          - Profile, vehicle, preferences
```

### **Long-Haul Route Example:**
```typescript
longHaulRoutes/{routeId} {
  routeId: 'route_sf_la_20260123',
  type: 'long_haul',
  
  originHub: {
    id: 'hub_sf',
    name: 'San Francisco Hub',
    address: '123 Main St, SF, CA',
    location: { lat: 37.7749, lng: -122.4194 }
  },
  
  destinationHub: {
    id: 'hub_la',
    name: 'Los Angeles Hub',
    address: '456 Oak Ave, LA, CA',
    location: { lat: 34.0522, lng: -118.2437 }
  },
  
  distance: 382, // miles
  packageCount: 45,
  totalWeight: 1200, // lbs
  
  scheduledDeparture: Timestamp,
  scheduledArrival: Timestamp,
  
  pricing: {
    baseFee: 200,
    perMile: 0.75,
    perPackage: 2.50,
    runnerEarnings: 486.50,
    platformFee: 48.65
  },
  
  status: 'available' | 'assigned' | 'in_progress' | 'completed',
  runnerId?: string,
  assignedAt?: Timestamp,
  
  packages: ['pkg_1', 'pkg_2', ...] // package IDs
}
```

### **Permissions:**
```
CAN:
✅ Accept long-haul routes from home hub
✅ View route manifest (list of packages)
✅ Scan packages at pickup/dropoff
✅ Update route status
✅ View earnings per route
✅ ALSO has customer permissions

CANNOT:
❌ Accept local delivery jobs (use courier role)
❌ Accept routes from other hubs (unless filtered off)
❌ Access packages not in assigned route
❌ Modify route pricing
```

### **Navigation:**
```typescript
[
  { icon: "🏠", label: "Home", href: "/runner/dashboard" },
  { icon: "🗺️", label: "Routes", href: "/runner/available-routes" },
  { icon: "📊", label: "Stats", href: "/runner/stats" },
  { icon: "⚙️", label: "Settings", href: "/runner/settings" }
]
```

---

## 👨‍💼 **5. ADMIN ROLE**

### **Purpose:**
Manage platform, approve users, oversee operations

### **Database Schema:**
```typescript
users/{uid} {
  role: 'admin',
  displayName: 'Admin User',
  email: 'admin@gosenderr.com',
  
  adminProfile: {
    permissions: [
      'manage_users',
      'manage_packages',
      'manage_routes',
      'manage_hubs',
      'manage_feature_flags',
      'view_analytics',
      'manage_disputes'
    ],
    
    department?: 'operations' | 'support' | 'finance',
    
    createdAt: Timestamp
  }
}
```

### **Routes & Features:**
```
/admin/dashboard          - Platform overview, stats
/admin/users              - Manage all users, filter by role
/admin/packages           - All packages, tracking, issues
/admin/routes             - All routes (local + long-haul)
/admin/hubs               - Manage delivery hubs
/admin/equipment-review   - Approve/reject courier equipment
/admin/feature-flags      - Enable/disable features
/admin/analytics          - Platform-wide analytics
/admin/disputes           - Handle customer/courier disputes
/admin/enable-phase2      - Special page to enable Phase 2 features
```

### **Permissions:**
```
CAN:
✅ View all users, packages, routes, jobs
✅ Approve/suspend couriers and runners
✅ Review equipment submissions
✅ Manage feature flags
✅ Assign/reassign routes
✅ View platform analytics
✅ Handle disputes
✅ Create/manage hubs
✅ Override system restrictions
✅ Access admin-only routes

CANNOT:
❌ Delete user data (only suspend)
❌ Modify Stripe transactions directly
❌ Access user passwords
```

### **Navigation:**
```typescript
[
  { icon: "📊", label: "Dashboard", href: "/admin/dashboard" },
  { icon: "👥", label: "Users", href: "/admin/users" },
  { icon: "📦", label: "Packages", href: "/admin/packages" },
  { icon: "🗺️", label: "Routes", href: "/admin/routes" },
  { icon: "⚙️", label: "Settings", href: "/admin/settings" }
]
```

---

## 🔄 **MULTI-ROLE SUPPORT**

### **A user can have MULTIPLE roles simultaneously:**

```typescript
users/{uid} {
  role: 'customer',  // Primary role
  additionalRoles: ['vendor', 'courier'],
  
  // All profiles coexist:
  vendorProfile: {...},
  courierProfile: {...}
}
```

### **Common Combinations:**

#### **Customer + Vendor:**
```
USE CASE: Sell items AND buy from others
NAVIGATION: Merged bottom nav with toggle
  - Switch between "Shopping" and "Selling" modes
  - Or show combined nav with all features
```

#### **Customer + Courier:**
```
USE CASE: Deliver items AND order food
NAVIGATION: Toggle between roles
  - "Switch to Delivery Mode" → /courier/dashboard
  - "Switch to Shopping Mode" → /customer/dashboard
```

#### **Vendor + Courier:**
```
USE CASE: Sell items AND deliver them yourself
NAVIGATION: Three-mode toggle
  - Shopping, Selling, Delivering
```

#### **All Roles (Super User):**
```
USE CASE: Test account or power user
NAVIGATION: Role picker dropdown in navbar
```

---

## 📋 **ROLE COMPARISON TABLE**

| Feature | Customer | Vendor | Courier | Runner | Admin |
|---------|----------|--------|---------|--------|-------|
| Browse marketplace | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buy items | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sell items | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stripe Connect | ❌ | ✅ | ❌ | ❌ | ❌ |
| Accept local deliveries | ❌ | ❌ | ✅ | ❌ | ❌ |
| Accept long-haul routes | ❌ | ❌ | ❌ | ✅ | ❌ |
| Set delivery rates | ❌ | ❌ | ✅ | ❌ | ❌ |
| Upload equipment | ❌ | ❌ | ✅ | ✅ | ❌ |
| GPS photo capture | ❌ | ❌ | ✅ | ✅ | ❌ |
| View all users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve couriers | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage feature flags | ❌ | ❌ | ❌ | ❌ | ✅ |
| View analytics | Own | Own | Own | Own | All |

---

## 🎯 **ROLE SELECTION FLOW**

### **New User Registration:**
```
1. Sign up with email → /login
2. Account created → /select-role
3. Choose role:
   ┌─────────────────────────────────┐
   │  👤 Customer                    │ → /customer/dashboard
   │  "Shop and order deliveries"    │
   ├─────────────────────────────────┤
   │  🏪 Vendor                      │ → /vendor/onboarding
   │  "Sell on marketplace"          │
   ├─────────────────────────────────┤
   │  🚗 Courier                     │ → /courier/onboarding
   │  "Deliver locally"              │
   ├─────────────────────────────────┤
   │  🚚 Package Runner              │ → /runner/onboarding
   │  "Long-haul transport"          │
   └─────────────────────────────────┘

4. Complete role-specific onboarding
5. Start using platform
```

### **Role Upgrade (Later):**
```
Customer → Settings → "Become a Vendor"
  → Updates role
  → /vendor/onboarding
  → Stripe Connect setup
  → Can now list items

Customer → Settings → "Become a Courier"
  → Adds courier role
  → /courier/onboarding (5 steps)
  → Admin approval required
  → Can now accept jobs
```

---

## 💡 **RECOMMENDATIONS:**

### **1. Simplify Role Logic:**
```typescript
// Instead of checking role strings everywhere, use helper functions:

// lib/permissions.ts
export function canSellItems(user: UserDoc): boolean {
  return user.role === 'vendor' || user.additionalRoles?.includes('vendor');
}

export function canAcceptDeliveries(user: UserDoc): boolean {
  return (user.role === 'courier' || user.additionalRoles?.includes('courier'))
    && user.courierProfile?.status === 'approved';
}

export function canManageUsers(user: UserDoc): boolean {
  return user.role === 'admin';
}
```

### **2. Create Role Badge Component:**
```tsx
<RoleBadge role="courier" status="approved" />
<RoleBadge role="vendor" status="active" />
<RoleBadge role="runner" status="pending_review" />
```

### **3. Add Role Switcher:**
```tsx
// For users with multiple roles
<RoleSwitcher 
  currentRole="customer"
  availableRoles={['customer', 'vendor', 'courier']}
  onSwitch={(role) => router.push(`/${role}/dashboard`)}
/>
```

---

**Does this breakdown help clarify the role structure?** Need me to dive deeper into any specific role? 🎯
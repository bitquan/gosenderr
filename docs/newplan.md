# 🎯 **GOSENDERR MASTER PLAN - 15 PHASES**

## **OVERVIEW**

Complete platform consolidation in 15 manageable phases, each taking 2-4 hours. Total: ~45-60 hours over 4-6 weeks.

---

## **PHASE 1: AUDIT & DOCUMENT** ✅ (COMPLETE)
**Duration**: 2 hours  
**Priority**: P0  
**Status**: ✅ Done (just completed)

**What We Discovered**:
- ✅ 3 app audits complete (Customer, Courier, Vendor)
- ✅ Identified all duplicate code
- ✅ Mapped all user flows
- ✅ Found routing issues
- ✅ Created this master plan

**Deliverables**:
- ✅ Complete audit reports
- ✅ 15-phase plan
- ✅ Architecture diagrams

---

## **PHASE 2: CLEAN CUSTOMER APP** 🧹
**Duration**: 3-4 hours  
**Priority**: P0  
**Dependencies**: None

### **Tasks**:

#### 2.1 Delete Dead Code (1 hour)
```bash
# Delete old duplicate files
rm apps/customer-app/src/pages/Dashboard.tsx
rm apps/customer-app/src/pages/Jobs.tsx
rm apps/customer-app/src/pages/JobDetail.tsx
rm apps/customer-app/src/pages/Profile.tsx
rm apps/customer-app/src/pages/Settings.tsx
rm apps/customer-app/src/pages/RequestDelivery.tsx
rm apps/customer-app/src/components/BottomNav.tsx  # Keep ui/BottomNav.tsx
```

#### 2.2 Remove Vendor Pages (30 min)
```bash
# Move these to vendor-app (Phase 5)
rm -rf apps/customer-app/src/pages/vendor/
```

#### 2.3 Update Routes (30 min)
```tsx
// apps/customer-app/src/App.tsx
// REMOVE vendor routes:
// <Route path="/vendor/apply" ... />
// <Route path="/vendor/dashboard" ... />
// <Route path="/vendor/items/new" ... />
```

#### 2.4 Fix Login (30 min)
```tsx
// Remove role switcher
// apps/customer-app/src/pages/Login.tsx
- const [role, setRole] = useState<'customer' | 'vendor'>('customer')
// Customer app = customer login ONLY
```

#### 2.5 Implement Signup (1 hour)
```tsx
// Create proper signup page
// apps/customer-app/src/pages/Signup.tsx
export default function SignupPage() {
  // Full signup form with email verification
  // Auto-set role: 'customer'
}
```

#### 2.6 Update Navigation (30 min)
```tsx
// Final customer nav (4 tabs)
export const customerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "📦", label: "Packages", href: "/packages" },
  { icon: "🛒", label: "Orders", href: "/orders" },
  { icon: "👤", label: "Profile", href: "/profile" },
];
```

**Deliverables**:
- ✅ Clean customer app (no vendor pages)
- ✅ No duplicate files
- ✅ Working signup
- ✅ Final navigation

**PR**: `feat: clean customer app - remove vendor pages and duplicates`

---

## **PHASE 3: CLEAN COURIER APP** 🚗
**Duration**: 3-4 hours  
**Priority**: P0  
**Dependencies**: None

### **Tasks**:

#### 3.1 Delete Dead Code (1 hour)
```bash
# Delete old files
rm apps/courier-app/src/pages/Dashboard.tsx
rm apps/courier-app/src/pages/Jobs.tsx
rm apps/courier-app/src/pages/JobDetail.tsx
rm apps/courier-app/src/pages/Settings.tsx
rm apps/courier-app/src/components/ui/BottomNav.tsx  # Not used by courier
```

#### 3.2 Remove Admin Pages (30 min)
```bash
# Move to admin-app (Phase 7)
rm apps/courier-app/src/pages/AdminJobs.tsx
rm apps/courier-app/src/pages/AdminJobDetail.tsx
rm apps/courier-app/src/pages/AdminUsers.tsx
rm apps/courier-app/src/pages/AdminPackages.tsx
rm apps/courier-app/src/pages/AdminRoutes.tsx
rm apps/courier-app/src/pages/AdminFeatureFlags.tsx
```

#### 3.3 Fix /jobs Route (1 hour)
```tsx
// apps/courier-app/src/App.tsx
// CURRENT (WRONG):
<Route path="/jobs" element={<RoutesPage />} />  // ❌

// FIX TO:
<Route path="/jobs" element={<JobsListPage />} />  // ✅
<Route path="/jobs/:jobId" element={<JobDetailPage />} />
<Route path="/routes" element={<RoutesPage />} />  // Batch routes here
```

#### 3.4 Create Jobs List Page (1 hour)
```tsx
// apps/courier-app/src/pages/jobs/page.tsx (NEW FILE)
export default function CourierJobsListPage() {
  // Show MY active jobs only
  // NOT routes!
  const { jobs } = useCourierJobs(uid);
  // List view with filters
}
```

#### 3.5 Add Profile Route (30 min)
```tsx
// apps/courier-app/src/App.tsx
<Route path="/profile" element={<ProfilePage />} />  // ADD THIS
```

#### 3.6 Remove Admin Logic from Dashboard (30 min)
```tsx
// apps/courier-app/src/pages/dashboard/page.tsx
// DELETE all admin code:
- const { isAdmin } = useAdmin()
- const [adminStats, setAdminStats] = useState<AdminStats>(...)
- if (isAdmin) { ... }

// Courier dashboard = courier data ONLY
```

**Deliverables**:
- ✅ /jobs shows job list
- ✅ /routes shows batch routes
- ✅ Profile accessible
- ✅ No admin pages
- ✅ Clean dashboard

**PR**: `feat: fix courier app routing and remove admin pages`

---

## **PHASE 4: CREATE LANDING APP** 🌐
**Duration**: 4-5 hours  
**Priority**: P1  
**Dependencies**: None

### **Tasks**:

#### 4.1 Scaffold New App (1 hour)
```bash
# Create new Vite app
cd apps
npm create vite@latest landing -- --template react-ts
cd landing
pnpm install

# Configure
cp ../customer-app/tsconfig.json .
cp ../customer-app/.env.example .env.local
```

#### 4.2 Move Marketplace Pages (1 hour)
```bash
# From customer-app to landing
cp -r apps/customer-app/src/pages/marketplace apps/landing/src/pages/
cp -r apps/customer-app/src/pages/ship apps/landing/src/pages/
```

#### 4.3 Create Homepage (1 hour)
```tsx
// apps/landing/src/pages/home/page.tsx
export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Marketplace />
      <CallToAction />
    </>
  );
}
```

#### 4.4 Create Role Selection (30 min)
```tsx
// apps/landing/src/pages/select-role/page.tsx
export default function SelectRolePage() {
  return (
    <div>
      <h1>Join GoSenderr</h1>
      <RoleCard
        title="Customer"
        icon="👤"
        description="Shop and send"
        href="https://gosenderr-customer.web.app/signup"
      />
      <RoleCard
        title="Vendor"
        icon="🏪"
        description="Sell items"
        href="https://gosenderr-vendor.web.app/signup"
      />
      <RoleCard
        title="Courier"
        icon="🚗"
        description="Deliver locally"
        href="https://gosenderr-courier.web.app/signup"
      />
      <RoleCard
        title="Runner"
        icon="🚚"
        description="Long-haul routes"
        href="https://gosenderr-runner.web.app/signup"
      />
    </div>
  );
}
```

#### 4.5 Configure Firebase Hosting (30 min)
```json
// firebase.json
{
  "hosting": [
    {
      "site": "gosenderr-6773f",
      "target": "landing",
      "public": "apps/landing/dist",
      "rewrites": [
        { "source": "**", "destination": "/index.html" }
      ]
    }
  ]
}
```

#### 4.6 Setup Routes (1 hour)
```tsx
// apps/landing/src/App.tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/marketplace" element={<MarketplacePage />} />
  <Route path="/marketplace/:itemId" element={<ItemDetailPage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/help" element={<HelpPage />} />
  <Route path="/select-role" element={<SelectRolePage />} />
  <Route path="/login" element={<Navigate to="/select-role" />} />
</Routes>
```

**Deliverables**:
- ✅ Public landing page
- ✅ Marketplace browsing (no auth)
- ✅ Role selection
- ✅ Deployed to main domain

**PR**: `feat: create landing app with public marketplace`

---

## **PHASE 5: CREATE VENDOR APP** 🏪
**Duration**: 4-5 hours  
**Priority**: P1  
**Dependencies**: Phase 2 (customer app cleaned)

### **Tasks**:

#### 5.1 Scaffold App (1 hour)
```bash
cd apps
npm create vite@latest vendor-app -- --template react-ts
cd vendor-app
pnpm install
```

#### 5.2 Move Vendor Pages (1 hour)
```bash
# From customer-app
cp apps/customer-app/src/pages/vendor/apply/page.tsx apps/vendor-app/src/pages/apply.tsx
cp apps/customer-app/src/pages/vendor/dashboard/page.tsx apps/vendor-app/src/pages/dashboard.tsx
cp apps/customer-app/src/pages/vendor/items/new/page.tsx apps/vendor-app/src/pages/items/new.tsx
```

#### 5.3 Create Items List Page (1 hour)
```tsx
// apps/vendor-app/src/pages/items/page.tsx (NEW)
export default function ItemsListPage() {
  const { items } = useVendorItems(uid);
  
  return (
    <div>
      <h1>My Items</h1>
      <Link to="/items/new">+ Create Listing</Link>
      <ItemsGrid items={items} />
    </div>
  );
}
```

#### 5.4 Create Orders Page (1 hour)
```tsx
// apps/vendor-app/src/pages/orders/page.tsx (NEW)
export default function OrdersPage() {
  const { orders } = useVendorOrders(uid);
  
  return (
    <div>
      <h1>Orders</h1>
      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onMarkReady={() => markOrderReady(order.id)}
        />
      ))}
    </div>
  );
}
```

#### 5.5 Setup Navigation (30 min)
```tsx
// apps/vendor-app/src/components/BottomNav.tsx
export const vendorNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "📦", label: "Items", href: "/items" },
  { icon: "🛒", label: "Orders", href: "/orders" },
  { icon: "💰", label: "Payouts", href: "/payouts" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
```

#### 5.6 Configure Hosting (30 min)
```json
// firebase.json (add)
{
  "site": "gosenderr-vendor",
  "target": "vendor",
  "public": "apps/vendor-app/dist"
}
```

**Deliverables**:
- ✅ Vendor app deployed
- ✅ Item management
- ✅ Order fulfillment
- ✅ 5-tab navigation

**PR**: `feat: create vendor app with item and order management`

---

## **PHASE 6: CREATE ADMIN APP** ⚙️
**Duration**: 4-5 hours  
**Priority**: P1  
**Dependencies**: Phase 3 (courier app cleaned)

### **Tasks**:

#### 6.1 Scaffold App (1 hour)
```bash
cd apps
npm create vite@latest admin-app -- --template react-ts
cd admin-app
pnpm install
```

#### 6.2 Move Admin Pages (1 hour)
```bash
# From courier-app
cp apps/courier-app/src/pages/AdminJobs.tsx apps/admin-app/src/pages/jobs/page.tsx
cp apps/courier-app/src/pages/AdminJobDetail.tsx apps/admin-app/src/pages/jobs/[jobId]/page.tsx
cp apps/courier-app/src/pages/AdminUsers.tsx apps/admin-app/src/pages/users/page.tsx
cp apps/courier-app/src/pages/AdminPackages.tsx apps/admin-app/src/pages/packages/page.tsx
cp apps/courier-app/src/pages/AdminRoutes.tsx apps/admin-app/src/pages/routes/page.tsx
cp apps/courier-app/src/pages/AdminFeatureFlags.tsx apps/admin-app/src/pages/feature-flags/page.tsx
```

#### 6.3 Create Admin Dashboard (1 hour)
```tsx
// apps/admin-app/src/pages/dashboard/page.tsx (NEW)
export default function AdminDashboard() {
  const stats = useAdminStats();
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <StatsGrid stats={stats} />
      <RecentActivity />
      <QuickActions />
    </div>
  );
}
```

#### 6.4 Create Runner Approval Page (1 hour)
```tsx
// apps/admin-app/src/pages/runners/page.tsx (NEW)
export default function RunnersPage() {
  const { runners } = useRunnerApplications();
  
  return (
    <div>
      <h1>Runner Applications</h1>
      <Tabs>
        <Tab label="Pending" count={pending.length}>
          {pending.map(runner => (
            <RunnerCard
              key={runner.id}
              runner={runner}
              onApprove={() => approveRunner(runner.id)}
              onReject={() => rejectRunner(runner.id)}
            />
          ))}
        </Tab>
        <Tab label="Approved" count={approved.length}>
          {/* ... */}
        </Tab>
      </Tabs>
    </div>
  );
}
```

#### 6.5 Setup Navigation (30 min)
```tsx
export const adminNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "👥", label: "Users", href: "/users" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "🚚", label: "Routes", href: "/routes" },
  { icon: "🎚️", label: "Flags", href: "/feature-flags" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
```

#### 6.6 Configure Hosting (30 min)
```json
{
  "site": "gosenderr-admin",
  "target": "admin",
  "public": "apps/admin-app/dist"
}
```

**Deliverables**:
- ✅ Admin app deployed
- ✅ User management
- ✅ Runner/vendor approval
- ✅ Feature flags
- ✅ Analytics

**PR**: `feat: create admin app with platform management tools`

---

## **PHASE 7: SHARED TYPES UPDATE** 📦
**Duration**: 2-3 hours  
**Priority**: P1  
**Dependencies**: Phases 2-6

### **Tasks**:

#### 7.1 Add VendorProfile (1 hour)
```typescript
// packages/shared/src/types/firestore.ts
export interface VendorProfile {
  // Stripe
  stripeConnectAccountId: string;
  stripeAccountVerified: boolean;
  payoutsEnabled: boolean;
  
  // Business
  businessName?: string;
  businessType: 'individual' | 'company';
  
  // Stats
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalRevenue: number;
  averageRating: number;
  
  // Settings
  autoAcceptOrders: boolean;
  prepTimeMinutes: number;
  
  // Status
  status: 'pending' | 'approved' | 'suspended';
  appliedAt: Timestamp;
  approvedAt?: Timestamp;
}

export interface UserDoc {
  ...
  vendorProfile?: VendorProfile;  // ADD THIS
}
```

#### 7.2 Update Job Types (30 min)
```typescript
// Add missing fields
export interface Job {
  ...
  vendorId?: string;  // For marketplace orders
  itemPrice?: number;  // Separate from delivery fee
}
```

#### 7.3 Add New Collections (30 min)
```typescript
// packages/shared/src/types/firestore.ts
export interface VendorApplication {
  uid: string;
  businessName: string;
  businessType: 'individual' | 'company';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
}
```

#### 7.4 Build & Publish (30 min)
```bash
cd packages/shared
pnpm build
pnpm version patch
pnpm publish
```

**Deliverables**:
- ✅ VendorProfile type
- ✅ Updated job types
- ✅ New collection types
- ✅ Published to npm

**PR**: `feat(shared): add vendor profile and update types`

---

## **PHASE 8: FIRESTORE SECURITY RULES** 🔐
**Duration**: 3-4 hours  
**Priority**: P0  
**Dependencies**: Phase 7

### **Tasks**:

#### 8.1 Add Vendor Rules (1 hour)
```javascript
// firebase/firestore.rules
// Vendor can create items
match /items/{itemId} {
  allow create: if request.auth.uid == request.resource.data.sellerId
                && request.resource.data.status == 'available';
  
  allow update, delete: if request.auth.uid == resource.data.sellerId;
}

// Vendor can manage orders
match /marketplaceOrders/{orderId} {
  allow read: if request.auth.uid == resource.data.sellerId
              || request.auth.uid == resource.data.buyerId;
  
  allow update: if request.auth.uid == resource.data.sellerId
                && isValidOrderStatusTransition(resource, request.resource);
}
```

#### 8.2 Add Admin Rules (1 hour)
```javascript
// Admin can access all collections
match /{collection}/{document} {
  allow read, write: if isAdmin();
}

function isAdmin() {
  return request.auth != null 
      && request.auth.token.admin == true;
}
```

#### 8.3 Update User Rules (30 min)
```javascript
// Users can only update their own vendorProfile
match /users/{userId} {
  allow update: if request.auth.uid == userId
                && onlyUpdatingOwnProfile();
}

function onlyUpdatingOwnProfile() {
  let allowedFields = ['vendorProfile', 'courierProfile', 'packageRunnerProfile'];
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(allowedFields);
}
```

#### 8.4 Test Rules (1 hour)
```bash
# Run emulator
firebase emulators:start --only firestore

# Run tests
cd firebase
npm test
```

#### 8.5 Deploy Rules (30 min)
```bash
firebase deploy --only firestore:rules
```

**Deliverables**:
- ✅ Vendor rules added
- ✅ Admin rules added
- ✅ User rules updated
- ✅ All tests passing
- ✅ Deployed to production

**PR**: `feat: add vendor and admin firestore security rules`

---

## **PHASE 9: CLOUD FUNCTIONS UPDATE** ☁️
**Duration**: 4-5 hours  
**Priority**: P1  
**Dependencies**: Phase 7, 8

### **Tasks**:

#### 9.1 Add Vendor Approval Function (1 hour)
```typescript
// firebase/functions/src/vendor/onVendorApplicationApproved.ts
export const onVendorApplicationApproved = functions.firestore
  .document('vendorApplications/{applicationId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status !== 'approved' && after.status === 'approved') {
      // Set custom claim
      await admin.auth().setCustomUserClaims(after.uid, { vendor: true });
      
      // Create vendorProfile
      await admin.firestore().collection('users').doc(after.uid).update({
        role: 'vendor',
        vendorProfile: {
          status: 'approved',
          businessName: after.businessName,
          businessType: after.businessType,
          totalListings: 0,
          activeListings: 0,
          soldListings: 0,
          totalRevenue: 0,
          averageRating: 0,
          autoAcceptOrders: false,
          prepTimeMinutes: 15,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      });
      
      // Send approval email
      await sendEmail(after.email, 'vendor-approved');
    }
  });
```

#### 9.2 Add Order Ready Function (1 hour)
```typescript
// firebase/functions/src/vendor/onVendorMarkOrderReady.ts
export const onVendorMarkOrderReady = functions.firestore
  .document('marketplaceOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status !== 'ready_for_pickup' && after.status === 'ready_for_pickup') {
      if (after.deliveryMethod === 'delivery') {
        // Create delivery job
        const jobId = `job_${Date.now()}`;
        await admin.firestore().collection('jobs').doc(jobId).set({
          createdByUid: 'system',
          itemId: after.itemId,
          orderId: context.params.orderId,
          sellerId: after.sellerId,
          buyerId: after.buyerId,
          
          pickup: {
            address: after.pickupAddress,
            lat: after.pickupLat,
            lng: after.pickupLng,
          },
          dropoff: {
            address: after.deliveryAddress,
            lat: after.deliveryLat,
            lng: after.deliveryLng,
          },
          
          status: 'open',
          courierUid: null,
          
          pricing: {
            courierEarnings: after.deliveryFee,
            platformFee: Math.round(after.deliveryFee * 0.15),
            totalCharge: after.deliveryFee,
          },
          
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Link job to order
        await change.after.ref.update({ jobId });
      }
    }
  });
```

#### 9.3 Add Payout Function (1 hour)
```typescript
// firebase/functions/src/vendor/processVendorPayouts.ts
export const processVendorPayouts = functions.pubsub
  .schedule('every wednesday 09:00')
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    // Get all delivered orders from past week
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const orders = await admin.firestore()
      .collection('marketplaceOrders')
      .where('status', '==', 'delivered')
      .where('deliveredAt', '>', oneWeekAgo)
      .where('vendorPaid', '==', false)
      .get();
    
    const vendorPayouts = new Map();
    
    orders.docs.forEach(doc => {
      const order = doc.data();
      const vendorEarnings = order.itemPrice - Math.round(order.itemPrice * 0.15);
      
      if (!vendorPayouts.has(order.sellerId)) {
        vendorPayouts.set(order.sellerId, []);
      }
      vendorPayouts.get(order.sellerId).push({
        orderId: doc.id,
        amount: vendorEarnings,
      });
    });
    
    // Process payouts via Stripe Connect
    for (const [vendorId, orders] of vendorPayouts) {
      const user = await admin.firestore().collection('users').doc(vendorId).get();
      const vendorProfile = user.data()?.vendorProfile;
      
      if (vendorProfile?.stripeConnectAccountId) {
        const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
        
        // Create Stripe transfer
        await stripe.transfers.create({
          amount: totalAmount,
          currency: 'usd',
          destination: vendorProfile.stripeConnectAccountId,
          description: `Weekly payout for ${orders.length} orders`,
        });
        
        // Mark orders as paid
        const batch = admin.firestore().batch();
        orders.forEach(order => {
          batch.update(
            admin.firestore().collection('marketplaceOrders').doc(order.orderId),
            { vendorPaid: true, vendorPaidAt: admin.firestore.FieldValue.serverTimestamp() }
          );
        });
        await batch.commit();
      }
    }
  });
```

#### 9.4 Test Functions (1 hour)
```bash
firebase emulators:start --only functions,firestore
npm test
```

#### 9.5 Deploy Functions (30 min)
```bash
firebase deploy --only functions
```

**Deliverables**:
- ✅ Vendor approval function
- ✅ Order ready function
- ✅ Payout function
- ✅ All tests passing
- ✅ Deployed

**PR**: `feat: add vendor cloud functions for approvals and payouts`

---

## **PHASE 10: RUNNER APP POLISH** 🚚
**Duration**: 3-4 hours  
**Priority**: P2  
**Dependencies**: Phase 6

### **Tasks**:

#### 10.1 Fix Dashboard Map Shell (2 hours)
```tsx
// apps/shifter-app/src/pages/dashboard/page.tsx
export default function RunnerDashboard() {
  return (
    <div className="relative h-screen overflow-hidden">
      {/* Full-screen map */}
      <MapboxMap routes={availableRoutes} />
      
      {/* Floating controls */}
      <div className="absolute top-4 right-4 z-20">
        <OnlineToggle />
      </div>
      
      {/* Bottom sheet with routes */}
      <BottomSheet>
        <h2>Available Routes ({routes.length})</h2>
        {routes.map(route => (
          <RouteCard key={route.id} route={route} />
        ))}
      </BottomSheet>
    </div>
  );
}
```

#### 10.2 Add Map to Available Routes (1 hour)
```tsx
// apps/shifter-app/src/pages/available-routes/page.tsx
export default function AvailableRoutesPage() {
  return (
    <div>
      <MapView routes={routes} />
      <RoutesList routes={routes} />
    </div>
  );
}
```

#### 10.3 Update Navigation (30 min)
```tsx
export const runnerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },  // Map + routes
  { icon: "🗺️", label: "Shifts", href: "/routes" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
```

#### 10.4 Test All Flows (30 min)

**Deliverables**:
- ✅ Map shell dashboard
- ✅ Route visualization
- ✅ All tests passing

**PR**: `feat: add map shell to runner app dashboard`

---

## **PHASE 11: PAYMENT INTEGRATION** 💳
**Duration**: 4-5 hours  
**Priority**: P1  
**Dependencies**: Phases 5, 9

### **Tasks**:

#### 11.1 Vendor Stripe Connect (2 hours)
```tsx
// apps/vendor-app/src/pages/stripe/page.tsx
export default function StripeSetupPage() {
  const handleConnectStripe = async () => {
    // Create Stripe Connect account link
    const { accountLinkUrl } = await functions.httpsCallable('createStripeConnectAccount')({
      businessType: vendorProfile.businessType,
      email: user.email,
    });
    
    window.location.href = accountLinkUrl;
  };
  
  return (
    <div>
      <h1>Connect Your Bank Account</h1>
      {vendorProfile.stripeAccountVerified ? (
        <AccountConnected />
      ) : (
        <button onClick={handleConnectStripe}>
          Connect with Stripe
        </button>
      )}
    </div>
  );
}
```

#### 11.2 Marketplace Checkout Flow (2 hours)
```tsx
// apps/customer-app/src/pages/checkout/page.tsx
// Already exists, update to handle vendor payouts
export default function CheckoutPage() {
  const handleCheckout = async () => {
    // Create payment intent
    const { clientSecret, orderId } = await createMarketplacePaymentIntent({
      itemId: item.id,
      itemPrice: item.price,
      deliveryFee: deliveryFee,
      sellerId: item.sellerId,
      buyerId: user.uid,
    });
    
    // Stripe Elements UI
    // ...
  };
}
```

#### 11.3 Update Payment Functions (1 hour)
```typescript
// firebase/functions/src/payments/createMarketplacePaymentIntent.ts
export const createMarketplacePaymentIntent = functions.https.onCall(async (data, context) => {
  const { itemPrice, deliveryFee, sellerId } = data;
  const totalAmount = itemPrice + deliveryFee;
  
  // Create payment intent with application fee
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'usd',
    application_fee_amount: Math.round(itemPrice * 0.15), // 15% platform fee
    transfer_data: {
      destination: sellerId.stripeConnectAccountId,
    },
  });
  
  return { clientSecret: paymentIntent.client_secret };
});
```

**Deliverables**:
- ✅ Vendor Stripe onboarding
- ✅ Marketplace payment flow
- ✅ Vendor payouts automated

**PR**: `feat: integrate Stripe Connect for vendor payouts`

---

## **PHASE 12: NAVIGATION & UX POLISH** 🎨
**Duration**: 3-4 hours  
**Priority**: P2  
**Dependencies**: All app phases

### **Tasks**:

#### 12.1 Consistent Theming (1 hour)
```tsx
// packages/shared/src/theme/colors.ts (NEW)
export const theme = {
  customer: {
    primary: '#6B4EFF',  // Purple
    gradient: 'from-[#6B4EFF] to-[#9D7FFF]',
  },
  courier: {
    primary: '#10B981',  // Green
    gradient: 'from-[#10B981] to-[#059669]',
  },
  vendor: {
    primary: '#3B82F6',  // Blue
    gradient: 'from-[#3B82F6] to-[#1D4ED8]',
  },
  runner: {
    primary: '#F97316',  // Orange
    gradient: 'from-[#F97316] to-[#EA580C]',
  },
  admin: {
    primary: '#EF4444',  // Red
    gradient: 'from-[#EF4444] to-[#DC2626]',
  },
};
```

#### 12.2 Add Loading States (1 hour)
```tsx
// All apps: Add skeleton loaders
<Skeleton />
```

#### 12.3 Error Boundaries (1 hour)
```tsx
// All apps: Wrap in ErrorBoundary
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### 12.4 Toast Notifications (30 min)
```tsx
// Add react-hot-toast to all apps
import { Toaster } from 'react-hot-toast';
```

#### 12.5 Mobile Responsive Testing (30 min)

**Deliverables**:
- ✅ Consistent branding
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Mobile responsive

**PR**: `feat: add consistent theming and UX improvements`

---

## **PHASE 13: COMPREHENSIVE TESTING** 🧪
**Duration**: 5-6 hours  
**Priority**: P0  
**Dependencies**: Phases 1-12

### **Tasks**:

#### 13.1 Customer Flow Testing (1 hour)
- [ ] Browse marketplace on landing
- [ ] Signup as customer
- [ ] Order item from marketplace
- [ ] Track delivery
- [ ] Rate courier & vendor
- [ ] Ship package
- [ ] Track package

#### 13.2 Vendor Flow Testing (1 hour)
- [ ] Signup as vendor
- [ ] Complete Stripe onboarding
- [ ] Create listing
- [ ] Receive order
- [ ] Mark ready for pickup
- [ ] See courier pick up
- [ ] Receive payout notification

#### 13.3 Courier Flow Testing (1 hour)
- [ ] Signup as courier
- [ ] Complete onboarding
- [ ] Set rate cards
- [ ] Upload equipment
- [ ] Go online
- [ ] Accept job
- [ ] Complete delivery
- [ ] Receive earnings

#### 13.4 Runner Flow Testing (1 hour)
- [ ] Apply as runner
- [ ] Wait for admin approval
- [ ] Browse available routes
- [ ] Accept route
- [ ] Complete all stops
- [ ] Receive payout

#### 13.5 Admin Flow Testing (1 hour)
- [ ] Login as admin
- [ ] Approve runner application
- [ ] Approve vendor application
- [ ] Manage feature flags
- [ ] View analytics
- [ ] Handle dispute

#### 13.6 Document Issues (1 hour)
- Create GitHub issues for all bugs found
- Prioritize fixes
- Create hotfix PRs

**Deliverables**:
- ✅ All flows tested
- ✅ Bugs documented
- ✅ Critical bugs fixed

**PR**: Multiple hotfix PRs as needed

---

## **PHASE 14: DOCUMENTATION UPDATE** 📚
**Duration**: 3-4 hours  
**Priority**: P2  
**Dependencies**: Phase 13

### **Tasks**:

#### 14.1 Update README (1 hour)
```markdown
# GoSenderr Platform

Multi-role delivery platform with 6 web apps:

## Apps
- **Landing** (`gosenderr-6773f.web.app`) - Public marketplace
- **Customer** (`gosenderr-customer.web.app`) - Order & ship
- **Courier** (`gosenderr-courier.web.app`) - Local delivery
- **Vendor** (`gosenderr-vendor.web.app`) - Sell items
- **Runner** (`gosenderr-runner.web.app`) - Long-haul routes
- **Admin** (`gosenderr-admin.web.app`) - Platform management

## Getting Started
...
```

#### 14.2 Update Architecture Docs (1 hour)
```markdown
# docs/APP_ARCHITECTURE.md
- Update app list
- Update deployment URLs
- Update feature matrix
```

#### 14.3 Create Flow Diagrams (1 hour)
```markdown
# docs/USER_FLOWS.md
- Customer → Vendor → Courier flow
- Package shipping flow
- Runner route flow
- Admin approval flows
```

#### 14.4 Update API Docs (1 hour)
```markdown
# docs/API.md
- Cloud Functions reference
- Firestore collections
- Security rules
```

**Deliverables**:
- ✅ Updated README
- ✅ Architecture docs current
- ✅ Flow diagrams
- ✅ API reference

**PR**: `docs: update all documentation for 6-app architecture`

---

## **PHASE 15: DEPLOYMENT & LAUNCH** 🚀
**Duration**: 4-5 hours  
**Priority**: P0  
**Dependencies**: Phases 1-14

### **Tasks**:

#### 15.1 Configure Firebase Hosting (1 hour)
```json
// firebase.json (FINAL)
{
  "hosting": [
    {
      "site": "gosenderr-6773f",
      "target": "landing",
      "public": "apps/landing/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-customer",
      "target": "customer",
      "public": "apps/customer-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-courier",
      "target": "courier",
      "public": "apps/courier-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-vendor",
      "target": "vendor",
      "public": "apps/vendor-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-runner",
      "target": "runner",
      "public": "apps/shifter-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "gosenderr-admin",
      "target": "admin",
      "public": "apps/admin-app/dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  ],
  "firestore": {
    "rules": "firebase/firestore.rules",
    "indexes": "firebase/firestore.indexes.json"
  },
  "functions": {
    "source": "firebase/functions"
  }
}
```

#### 15.2 Build All Apps (1 hour)
```bash
# Create deploy script
cat > deploy-all.sh << 'EOF'
#!/bin/bash
set -e

echo "Building all apps..."
cd apps/landing && pnpm build && cd ../..
cd apps/customer-app && pnpm build && cd ../..
cd apps/courier-app && pnpm build && cd ../..
cd apps/vendor-app && pnpm build && cd ../..
cd apps/shifter-app && pnpm build && cd ../..
cd apps/admin-app && pnpm build && cd ../..

echo "Deploying to Firebase..."
firebase deploy

echo "✅ All apps deployed!"
EOF

chmod +x deploy-all.sh
```

#### 15.3 Deploy to Production (1 hour)
```bash
./deploy-all.sh
```

#### 15.4 Smoke Test Production (1 hour)
- [ ] Visit each app URL
- [ ] Test one critical flow per app
- [ ] Check Firebase Console
- [ ] Monitor error logs

#### 15.5 Create Launch Checklist (30 min)
```markdown
# LAUNCH CHECKLIST
- [ ] All 6 apps deployed
- [ ] DNS configured
- [ ] SSL certificates valid
- [ ] Stripe webhooks configured
- [ ] Cloud Functions running
- [ ] Firestore rules deployed
- [ ] Analytics tracking
- [ ] Error monitoring
- [ ] Backup strategy
```

#### 15.6 Go Live 🎉 (30 min)
- Announce to team
- Monitor first users
- Be ready for hotfixes

**Deliverables**:
- ✅ All apps live
- ✅ Production tested
- ✅ Monitoring active
- ✅ Launch complete

**PR**: `chore: production deployment configuration`

---

## 📊 **PHASE SUMMARY**

| Phase | Name | Hours | Priority | Week |
|-------|------|-------|----------|------|
| 1 | ✅ Audit & Document | 2 | P0 | Done |
| 2 | Clean Customer App | 3-4 | P0 | 1 |
| 3 | Clean Courier App | 3-4 | P0 | 1 |
| 4 | Create Landing App | 4-5 | P1 | 1 |
| 5 | Create Vendor App | 4-5 | P1 | 2 |
| 6 | Create Admin App | 4-5 | P1 | 2 |
| 7 | Shared Types Update | 2-3 | P1 | 2 |
| 8 | Security Rules | 3-4 | P0 | 3 |
| 9 | Cloud Functions | 4-5 | P1 | 3 |
| 10 | Runner Polish | 3-4 | P2 | 3 |
| 11 | Payment Integration | 4-5 | P1 | 4 |
| 12 | UX Polish | 3-4 | P2 | 4 |
| 13 | Comprehensive Testing | 5-6 | P0 | 4 |
| 14 | Documentation | 3-4 | P2 | 5 |
| 15 | Deployment & Launch | 4-5 | P0 | 5 |

**TOTAL**: 52-65 hours over 5 weeks

---

## 🎯 **EXECUTION STRATEGY**

### **Week 1: Foundation** (Phases 2-4)
Focus: Clean existing apps, create landing

### **Week 2: New Apps** (Phases 5-7)
Focus: Vendor & admin apps, update types

### **Week 3: Backend** (Phases 8-10)
Focus: Security, functions, runner

### **Week 4: Integration** (Phases 11-13)
Focus: Payments, polish, testing

### **Week 5: Launch** (Phases 14-15)
Focus: Docs, deployment, go live

---

## ✅ **ACCEPTANCE CRITERIA**

Platform is complete when:
- [ ] All 6 apps deployed and accessible
- [ ] All 6 major user flows work end-to-end
- [ ] Zero critical bugs in production
- [ ] All documentation updated
- [ ] All tests passing
- [ ] Security rules validated
- [ ] Stripe integration working
- [ ] Admin can approve users
- [ ] Payouts processing correctly
- [ ] Real-time tracking works

---

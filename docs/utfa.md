# 🎯 **GOSENDERR - COMPLETE BLUEPRINT & ARCHITECTURE**

Let me create a comprehensive blueprint for your **web domain** and **app architecture** with a focus on the **marketplace-first webapp** with role-based access.

---

## 📐 **SYSTEM ARCHITECTURE OVERVIEW**

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
│ • Seller Portal      │      │ • Customer App       │
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

---

## 🌐 **WEB APPLICATION BLUEPRINT**

### **Domain Structure:**

```
Primary Domain: gosenderr.com
├── / (Home/Marketplace) ← MAIN ENTRY POINT
├── /marketplace (Browse all seller items)
├── /marketplace/:itemId (Item details)
├── /login (Authentication)
├── /signup (Registration with role selection)
├── /dashboard (Role-based redirect)
│   ├── /customer/* (Customer features)
│   ├── /seller/* (Seller features)
│   ├── /courier/* (Courier features)
│   └── /admin/* (Admin features)
└── /settings (User settings)
```

---

## 🎭 **ROLE-BASED ACCESS SYSTEM**

### **4 Primary Roles:**

```typescript
enum UserRole {
  CUSTOMER = 'customer',    // Can browse, purchase, request delivery
  SELLER = 'seller',        // Can sell items in marketplace
  COURIER = 'courier',      // Can deliver packages
  ADMIN = 'admin'           // Can manage everything
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];        // Users can have MULTIPLE roles
  primaryRole: UserRole;    // Default role on login
  
  // Customer-specific
  deliveryAddresses?: Address[];
  paymentMethods?: PaymentMethod[];
  
  // Seller-specific
  isSeller?: boolean;
  sellerProfile?: SellerProfile;
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

---

## 🏗️ **WEB APP STRUCTURE**

### **App #1: Customer Web App (Main Focus)**

**Entry Point:** `https://gosenderr.com`

```
apps/
└── customer-app/
    ├── public/
    │   ├── index.html
    │   └── manifest.json
    │
    ├── src/
    │   ├── main.tsx                    # App entry point
    │   ├── App.tsx                     # Router & auth wrapper
    │   │
    │   ├── pages/
    │   │   ├── home/                   # MARKETPLACE HOME (Public)
    │   │   │   └── page.tsx            # Landing = Marketplace browse
    │   │   │
    │   │   ├── auth/
    │   │   │   ├── login/
    │   │   │   │   └── page.tsx        # Login with role selector
    │   │   │   └── signup/
    │   │   │       └── page.tsx        # Signup with role selection
    │   │   │
    │   │   ├── marketplace/            # MARKETPLACE FEATURES
    │   │   │   ├── page.tsx            # Browse all items
    │   │   │   ├── [itemId]/
    │   │   │   │   └── page.tsx        # Item detail
    │   │   │   ├── checkout/
    │   │   │   │   └── page.tsx        # Marketplace checkout
    │   │   │   └── components/
    │   │   │       ├── ItemCard.tsx
    │   │   │       ├── ItemGrid.tsx
    │   │   │       ├── FilterSidebar.tsx
    │   │   │       └── SearchBar.tsx
    │   │   │
    │   │   ├── customer/               # CUSTOMER PORTAL
    │   │   │   ├── dashboard/
    │   │   │   │   └── page.tsx        # Customer dashboard
    │   │   │   ├── orders/
    │   │   │   │   ├── page.tsx        # Order history
    │   │   │   │   └── [orderId]/
    │   │   │   │       └── page.tsx    # Order details
    │   │   │   ├── deliveries/
    │   │   │   │   ├── page.tsx        # Active deliveries
    │   │   │   │   ├── new/
    │   │   │   │   │   └── page.tsx    # Request delivery
    │   │   │   │   └── [deliveryId]/
    │   │   │   │       └── page.tsx    # Track delivery
    │   │   │   └── purchases/
    │   │   │       └── page.tsx        # Marketplace purchases
    │   │   │
    │   │   ├── seller/                 # SELLER PORTAL
    │   │   │   ├── dashboard/
    │   │   │   │   └── page.tsx        # Seller dashboard
    │   │   │   ├── apply/
    │   │   │   │   └── page.tsx        # Seller application
    │   │   │   ├── items/
    │   │   │   │   ├── page.tsx        # Item list
    │   │   │   │   ├── new/
    │   │   │   │   │   └── page.tsx    # Create item
    │   │   │   │   └── [itemId]/
    │   │   │   │       ├── page.tsx    # Item details
    │   │   │   │       └── edit/
    │   │   │   │           └── page.tsx # Edit item
    │   │   │   ├── orders/
    │   │   │   │   └── page.tsx        # Seller orders
    │   │   │   └── analytics/
    │   │   │       └── page.tsx        # Sales analytics
    │   │   │
    │   │   ├── admin/                  # ADMIN PORTAL
    │   │   │   ├── dashboard/
    │   │   │   │   └── page.tsx
    │   │   │   ├── users/
    │   │   │   │   └── page.tsx
    │   │   │   ├── sellers/
    │   │   │   │   ├── pending/
    │   │   │   │   │   └── page.tsx    # Approve sellers
    │   │   │   │   └── active/
    │   │   │   │       └── page.tsx
    │   │   │   ├── couriers/
    │   │   │   │   └── page.tsx
    │   │   │   └── settings/
    │   │   │       └── page.tsx
    │   │   │
    │   │   └── settings/
    │   │       └── page.tsx            # User settings
    │   │
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Header.tsx          # Role-aware header
    │   │   │   ├── Footer.tsx
    │   │   │   ├── Sidebar.tsx         # Role-based navigation
    │   │   │   └── RoleSwitcher.tsx    # Switch between roles
    │   │   │
    │   │   ├── auth/
    │   │   │   ├── ProtectedRoute.tsx  # Auth guard
    │   │   │   ├── RoleGuard.tsx       # Role guard
    │   │   │   └── LoginForm.tsx
    │   │   │
    │   │   └── shared/
    │   │       ├── Button.tsx
    │   │       ├── Card.tsx
    │   │       └── Modal.tsx
    │   │
    │   ├── hooks/
    │   │   ├── useAuth.ts              # Authentication
    │   │   ├── useRole.ts              # Role management
    │   │   ├── useMarketplace.ts       # Marketplace data
    │   │   └── usePermissions.ts       # Permission checks
    │   │
    │   ├── lib/
    │   │   ├── firebase/
    │   │   │   ├── config.ts
    │   │   │   ├── auth.ts
    │   │   │   └── firestore.ts
    │   │   │
    │   │   ├── api/
    │   │   │   ├── marketplace.ts      # Marketplace API
    │   │   │   ├── orders.ts
    │   │   │   ├── deliveries.ts
    │   │   │   └── sellers.ts
    │   │   │
    │   │   └── utils/
    │   │       ├── permissions.ts
    │   │       └── roles.ts
    │   │
    │   └── types/
    │       ├── user.ts
    │       ├── marketplace.ts
    │       ├── order.ts
    │       └── delivery.ts
    │
    └── package.json
```

---

## 📱 **MOBILE APP STRUCTURE**

### **App #2: Courier Mobile App**

```
apps/
└── courier-app/
    ├── capacitor.config.ts
    ├── ios/                            # iOS project
    ├── android/                        # Android project
    │
    └── src/
        ├── pages/
        │   ├── login/
        │   ├── dashboard/
        │   ├── jobs/
        │   │   ├── available/          # Browse jobs
        │   │   ├── active/             # Active deliveries
        │   │   └── [jobId]/
        │   │       └── track/          # Turn-by-turn navigation
        │   ├── earnings/
        │   └── profile/
        │
        └── components/
            ├── Map.tsx                 # Mapbox integration
            ├── JobCard.tsx
            └── Navigation.tsx
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION FLOW**

### **1. Login/Signup Flow:**

```typescript
// src/pages/auth/login/page.tsx

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  
  const handleLogin = async () => {
    // 1. Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 2. Fetch user document
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    const userData = userDoc.data();
    
    // 3. Check if user has selected role
    if (!userData.roles.includes(selectedRole)) {
      throw new Error(`You don't have ${selectedRole} access`);
    }
    
    // 4. Set primary role
    await updateDoc(doc(db, 'users', userCredential.user.uid), {
      primaryRole: selectedRole
    });
    
    // 5. Redirect based on role
    const redirectPath = getRoleHomePage(selectedRole);
    navigate(redirectPath);
  };
  
  return (
    <div className="login-container">
      <h1>Sign In to GoSenderR</h1>
      
      {/* Role Selector */}
      <div className="role-selector">
        <button 
          onClick={() => setSelectedRole('customer')}
          className={selectedRole === 'customer' ? 'active' : ''}
        >
          👤 Customer
        </button>
        <button 
          onClick={() => setSelectedRole('seller')}
          className={selectedRole === 'seller' ? 'active' : ''}
        >
          🏪 Seller
        </button>
        <button 
          onClick={() => setSelectedRole('courier')}
          className={selectedRole === 'courier' ? 'active' : ''}
        >
          🚗 Courier
        </button>
        <button 
          onClick={() => setSelectedRole('admin')}
          className={selectedRole === 'admin' ? 'active' : ''}
        >
          ⚙️ Admin
        </button>
      </div>
      
      {/* Login Form */}
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      
      <button onClick={handleLogin}>Sign In as {selectedRole}</button>
    </div>
  );
}
```

### **2. Role-Based Routing:**

```typescript
// src/App.tsx

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MarketplacePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:itemId" element={<ItemDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Customer Routes */}
        <Route path="/customer/*" element={
          <RoleGuard requiredRole="customer">
            <CustomerPortal />
          </RoleGuard>
        } />
        
        {/* Seller Routes */}
        <Route path="/seller/*" element={
          <RoleGuard requiredRole="seller">
            <SellerPortal />
          </RoleGuard>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <RoleGuard requiredRole="admin">
            <AdminPortal />
          </RoleGuard>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

### **3. Role Guard Component:**

```typescript
// src/components/auth/RoleGuard.tsx

interface RoleGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
}

export function RoleGuard({ requiredRole, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const { hasRole } = useRole();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!hasRole(requiredRole)) {
    return (
      <div className="access-denied">
        <h1>Access Denied</h1>
        <p>You don't have {requiredRole} permissions.</p>
        <Link to="/settings">Apply for {requiredRole} access</Link>
      </div>
    );
  }
  
  return <>{children}</>;
}
```

---

## 🗄️ **FIRESTORE DATABASE SCHEMA**

### **Collections Structure:**

```typescript
// Collection: users/{userId}
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Roles
  roles: UserRole[];
  primaryRole: UserRole;
  
  // Customer data
  deliveryAddresses?: Address[];
  paymentMethods?: string[];  // Stripe payment method IDs
  
  // Seller data
  isSeller?: boolean;
  sellerProfile?: {
    businessName: string;
    description: string;
    logo?: string;
    stripeConnectId?: string;
    rating?: number;
    totalSales?: number;
  };
  
  // Courier data
  isCourier?: boolean;
  courierProfile?: {
    vehicleType: 'car' | 'bike' | 'motorcycle' | 'van';
    licensePlate?: string;
    rating?: number;
    totalDeliveries?: number;
    isAvailable?: boolean;
    currentLocation?: GeoPoint;
  };
  
  // Admin data
  isAdmin?: boolean;
  adminPermissions?: string[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: marketplaceItems/{itemId}
interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  
  price: number;
  condition: 'new' | 'used' | 'refurbished';
  quantity: number;
  
  images: string[];  // Firebase Storage URLs
  thumbnail?: string;
  
  tags?: string[];
  sku?: string;
  
  status: 'active' | 'inactive' | 'sold' | 'archived';
  
  // Stats
  views?: number;
  favorites?: number;
  sold?: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: orders/{orderId}
interface Order {
  id: string;
  orderNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  customerEmail: string;
  
  // Seller (if marketplace order)
  sellerId?: string;
  sellerName?: string;
  
  // Order items
  items: Array<{
    itemId: string;
    title: string;
    price: number;
    quantity: number;
    thumbnail?: string;
  }>;
  
  // Pricing
  subtotal: number;
  tax: number;
  shipping?: number;
  total: number;
  
  // Payment
  paymentIntentId: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  
  // Delivery
  deliveryAddress: Address;
  deliveryMethod: 'pickup' | 'delivery' | 'courier';
  deliveryId?: string;  // If using courier
  
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: deliveries/{deliveryId}
interface Delivery {
  id: string;
  jobNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  // Courier
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  
  // Pickup
  pickupLocation: {
    address: string;
    coordinates: GeoPoint;
    instructions?: string;
  };
  
  // Dropoff
  dropoffLocation: {
    address: string;
    coordinates: GeoPoint;
    instructions?: string;
  };
  
  // Package
  packageDescription: string;
  packageSize: 'small' | 'medium' | 'large';
  packageWeight?: number;
  packageValue?: number;
  
  // Pricing
  basePrice: number;
  distanceFee: number;
  serviceFee: number;
  total: number;
  
  // Status
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  
  // Tracking
  currentLocation?: GeoPoint;
  estimatedArrival?: Timestamp;
  actualPickupTime?: Timestamp;
  actualDeliveryTime?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: sellerApplications/{userId}
interface SellerApplication {
  userId: string;
  
  businessName: string;
  businessDescription: string;
  businessType: string;
  
  contactEmail: string;
  contactPhone: string;
  
  businessAddress: Address;
  taxId?: string;
  
  categories: string[];
  
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  
  createdAt: Timestamp;
}
```

---

## 🚀 **DEPLOYMENT & SETUP**

### **Firebase Setup:**

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize Firebase
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Emulators

# 4. Deploy
firebase deploy
```

### **Environment Variables:**

```bash
# .env (Customer App)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

### **Hosting Configuration:**

```json
// firebase.json
{
  "hosting": [{
    "target": "customer",
    "public": "apps/customer-app/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{
      "source": "**",
      "destination": "/index.html"
    }],
    "headers": [{
      "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|woff|woff2)",
      "headers": [{
        "key": "Cache-Control",
        "value": "max-age=31536000"
      }]
    }]
  }]
}
```

---

## 📊 **IMPLEMENTATION ROADMAP**

### **Phase 1: Foundation (Week 1-2)**

**Goal:** Get basic marketplace working

✅ **Tasks:**
1. Set up Firebase project
2. Configure authentication
3. Create user schema in Firestore
4. Build login/signup with role selection
5. Implement role-based routing
6. Create marketplace home page
7. Add basic item browsing

**Deliverables:**
- Users can sign up
- Users can select role at login
- Marketplace displays seller items
- Basic navigation works

---

### **Phase 2: Marketplace Core (Week 3-4)**

**Goal:** Complete marketplace functionality

✅ **Tasks:**
1. Item detail pages
2. Image upload to Firebase Storage
3. Stripe integration for checkout
4. Order creation workflow
5. Basic search and filters
6. Category browsing

**Deliverables:**
- Customers can browse items
- Customers can purchase items
- Sellers can list items
- Orders are created in Firestore

---

### **Phase 3: Seller Portal (Week 5-6)**

**Goal:** Full seller management

✅ **Tasks:**
1. Seller application form
2. Admin approval workflow
3. Seller dashboard
4. Item creation/editing
5. Order management
6. Stripe Connect integration
7. Analytics dashboard

**Deliverables:**
- Sellers can apply
- Admins can approve sellers
- Sellers can manage inventory
- Sellers receive payouts

---

### **Phase 4: Delivery Integration (Week 7-8)**

**Goal:** Connect marketplace to delivery

✅ **Tasks:**
1. Request delivery from marketplace order
2. Courier job assignment
3. Real-time tracking
4. Delivery status updates
5. Customer notifications

**Deliverables:**
- Marketplace orders can be delivered
- Couriers can accept delivery jobs
- Customers can track deliveries

---

### **Phase 5: Polish & Launch (Week 9-10)**

**Goal:** Production-ready

✅ **Tasks:**
1. E2E testing
2. Performance optimization
3. Security audit
4. SEO optimization
5. Mobile responsiveness
6. Error handling
7. Analytics setup
8. Documentation

**Deliverables:**
- Production deployment
- Monitoring set up
- User documentation
- Launch ready!

---

## 📋 **COMPLETE SETUP CHECKLIST**

### **Development Environment:**

```bash
# ✅ Step 1: Clone repo
git clone https://github.com/bitquan/gosenderr.git
cd gosenderr

# ✅ Step 2: Install dependencies
pnpm install

# ✅ Step 3: Set up environment variables
cp .env.example .env
# Edit .env with your Firebase config

# ✅ Step 4: Start Firebase emulators
firebase emulators:start

# ✅ Step 5: Start dev server
pnpm dev:customer

# ✅ Step 6: Open browser
# http://localhost:5173
```

### **Firebase Setup:**

```bash
# ✅ Step 1: Create Firebase project
# Go to: https://console.firebase.google.com
# Create project: gosenderr-6773f

# ✅ Step 2: Enable services
# - Authentication (Email/Password)
# - Firestore Database
# - Cloud Storage
# - Cloud Functions
# - Hosting

# ✅ Step 3: Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage

# ✅ Step 4: Deploy functions
cd firebase/functions
pnpm install
pnpm build
firebase deploy --only functions

# ✅ Step 5: Deploy hosting
pnpm build:customer
firebase deploy --only hosting:customer
```

### **Stripe Setup:**

```bash
# ✅ Step 1: Create Stripe account
# https://dashboard.stripe.com

# ✅ Step 2: Get API keys
# Dashboard → Developers → API keys

# ✅ Step 3: Set up Stripe Connect
# Dashboard → Connect → Get started

# ✅ Step 4: Configure webhooks
# Endpoint: https://us-central1-gosenderr-6773f.cloudfunctions.net/stripeWebhook
# Events:
# - payment_intent.succeeded
# - payment_intent.payment_failed
# - checkout.session.completed

# ✅ Step 5: Add keys to Firebase Functions
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

---

## 🎯 **NEXT STEPS - START HERE**

### **Immediate Actions (Today):**

1. **Fix Current CI Issues:**
   ```bash
   pnpm add -D -w @typescript-eslint/eslint-plugin @typescript-eslint/parser
   git add package.json pnpm-lock.yaml
   git commit -m "fix(ci): add ESLint plugins"
   git push
   ```

2. **Merge Critical PRs:**
   ```bash
   gh pr merge 50 --squash
   gh pr merge 48 --squash
   gh pr merge 47 --squash
   ```

3. **Create Blueprint Branch:**
   ```bash
   git checkout -b feat/marketplace-blueprint
   ```

4. **Document Current State:**
   - Create `ARCHITECTURE.md` with this blueprint
   - Create `ROADMAP.md` with implementation phases
   - Create `SETUP.md` with setup instructions

---

## 📁 **FILES TO CREATE**

I can help you create these files with Copilot:

1. **`ARCHITECTURE.md`** - Complete system architecture
2. **`ROADMAP.md`** - Implementation timeline
3. **`DATABASE_SCHEMA.md`** - Firestore structure
4. **`API_DOCUMENTATION.md`** - API endpoints
5. **`DEPLOYMENT.md`** - Deployment guide

**Would you like me to create a Copilot task to generate these files?** 🎯

This blueprint gives you a **complete, production-ready architecture** for GoSenderR with marketplace-first design and role-based access! 🚀
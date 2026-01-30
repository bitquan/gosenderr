Perfect! I'll create the **new Copilot instructions** for your marketplace-app architecture. Let me write them now:

---

```markdown name=.github/copilot-instructions.md
# GoSenderr Platform - Copilot Instructions

TL;DR
- Location: .github/copilot-instructions.md
- Purpose: Master context for GitHub Copilot to make safe, reviewable changes.
- Governance: Copilot may create branches and PRs but **human approval is required** for merges to protected branches and destructive changes.
- **MVP-FIRST:** Ship working features fast. Use `// @ts-ignore` if needed, add follow-up tickets for cleanup.

---

## Project Overview
GoSenderr is a delivery platform with **2 production apps**:
1. **Marketplace App** (apps/marketplace-app) - Port 5173 - **UNIFIED PORTAL**
   - Customer Portal (`/customer/*`)
   - Vendor Portal (`/vendor/*`)
   - Admin Dashboard (`/admin/*`)
2. **Courier App** (apps/courier-app) - Port 5174 - **MAP-FIRST UI**

---

## Architecture Principles

### **Marketplace App = Multi-Role Shell**
- **ONE app, THREE portals** accessed via role-based routing
- Users can have **multiple roles** (customer + vendor, vendor + admin, etc.)
- Role switcher in navbar allows users to switch between their roles
- Authentication shared across all portals
- Unified navigation structure

### **User Flow:**
1. User logs in → System detects roles from `user.roles[]`
2. If multiple roles → Show role switcher
3. Routes redirect based on active role:
   - `/customer/*` → Customer features
   - `/vendor/*` → Vendor management
   - `/admin/*` → Platform administration

### **Courier App = Separate Experience**
- Map-first UI (full-screen Mapbox with floating components)
- Bottom sheet with available jobs
- Completely separate from marketplace
- Mobile-first delivery workflows

---

## Tech Stack
- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS
- **Mobile:** Capacitor (iOS/Android from web apps)
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, Storage)
- **Maps:** Mapbox GL JS (Courier app only)
- **Payments:** Stripe + Stripe Connect
- **Routing:** React Router v7

---

## Project Structure

```
apps/
├── marketplace-app/          # UNIFIED MARKETPLACE PORTAL
│   ├── src/
│   │   ├── pages/
│   │   │   ├── customer/    # Customer-facing pages
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Browse.tsx
│   │   │   │   ├── Orders.tsx
│   │   │   │   └── Checkout.tsx
│   │   │   ├── vendor/      # Vendor management pages
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Products.tsx
│   │   │   │   ├── Orders.tsx
│   │   │   │   └── Analytics.tsx
│   │   │   ├── admin/       # Admin dashboard pages
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Users.tsx
│   │   │   │   ├── Jobs.tsx
│   │   │   │   └── Settings.tsx
│   │   │   └── Login.tsx    # Unified login
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── RoleSwitcher.tsx
│   │   │   │   └── Navbar.tsx
│   │   │   ├── customer/
│   │   │   ├── vendor/
│   │   │   └── admin/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useRole.ts   # Active role management
│   │   └── lib/
│   │       └── firebase/
│   └── package.json
│
├── courier-app/              # SEPARATE COURIER APP
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Map shell
│   │   │   ├── Active.tsx
│   │   │   └── Earnings.tsx
│   │   └── components/
│   │       └── MapShell.tsx     # Full-screen map component
│   └── package.json
│
└── landing/                  # Role selection entry point
    └── index.html
```

---

## Code Style
- TypeScript strict mode (but `// @ts-ignore` is OK for MVP speed)
- Functional components only (no class components)
- Hooks over context where possible
- Tailwind for all styling (no CSS modules)
- Firebase v10+ modular SDK only

---

## File Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Pages: `Dashboard.tsx`, `Browse.tsx` (descriptive names)

---

## Import Order
1. React/React Router
2. External libraries (firebase, mapbox, stripe)
3. Internal components (@/components)
4. Internal hooks (@/hooks)
5. Internal utils (@/lib)
6. Types (@gosenderr/shared)
7. Styles (if any)

---

## Multi-Role User Model

### Firestore `users/{uid}` Document:
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  
  // MULTI-ROLE SUPPORT
  roles: UserRole[];              // e.g., ['customer', 'vendor']
  activeRole: UserRole;           // Currently selected role
  
  // Customer data (if 'customer' in roles)
  customerProfile?: {
    deliveryAddresses: Address[];
    paymentMethods: string[];
    orderHistory: string[];
  };
  
  // Vendor data (if 'vendor' in roles)
  vendorProfile?: {
    businessName: string;
    businessDescription: string;
    stripeConnectId?: string;
    rating?: number;
    totalSales?: number;
    isActive: boolean;
  };
  
  // Admin permissions (if 'admin' in roles)
  adminPermissions?: string[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type UserRole = 'customer' | 'vendor' | 'admin' | 'courier';
```

---

## Routing Structure

### Marketplace App Routes:
```typescript
// Public routes
/                         → Landing/Marketplace browse (public)
/login                    → Unified login for all roles
/signup                   → Registration with role selection

// Customer routes (require 'customer' role)
/customer/dashboard       → Customer home
/customer/browse          → Browse products/services
/customer/orders          → Order history
/customer/orders/:id      → Order details
/customer/checkout        → Checkout flow
/customer/settings        → Customer settings

// Vendor routes (require 'vendor' role)
/vendor/dashboard         → Vendor analytics overview
/vendor/products          → Product management
/vendor/products/new      → Add new product
/vendor/products/:id/edit → Edit product
/vendor/orders            → Incoming orders
/vendor/orders/:id        → Order fulfillment
/vendor/settings          → Vendor settings

// Admin routes (require 'admin' role)
/admin/dashboard          → Platform metrics
/admin/users              → User management
/admin/jobs               → All delivery jobs
/admin/vendors            → Vendor approvals
/admin/settings           → Platform settings
```

### Courier App Routes:
```typescript
/login                    → Courier login
/dashboard                → Map shell (full-screen map)
/active                   → Active job details
/earnings                 → Earnings & payouts
/settings                 → Courier settings
```

---

## Critical Implementation Patterns

### 1. Role-Based Route Guards
```typescript
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function RoleGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole: UserRole }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (!user.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
}

// Usage:
<Route path="/vendor/*" element={
  <RoleGuard requiredRole="vendor">
    <VendorLayout />
  </RoleGuard>
} />
```

### 2. Role Switcher Component
```typescript
import { useRole } from '@/hooks/useRole';

function RoleSwitcher() {
  const { user, activeRole, switchRole } = useRole();
  
  if (!user || user.roles.length <= 1) return null;
  
  return (
    <select value={activeRole} onChange={(e) => switchRole(e.target.value as UserRole)}>
      {user.roles.map(role => (
        <option key={role} value={role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </option>
      ))}
    </select>
  );
}
```

### 3. useRole Hook
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useRole() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState<UserRole>(user?.activeRole || 'customer');
  
  const switchRole = async (newRole: UserRole) => {
    if (!user || !user.roles.includes(newRole)) return;
    
    await updateDoc(doc(db, 'users', user.uid), {
      activeRole: newRole,
      updatedAt: serverTimestamp()
    });
    
    setActiveRole(newRole);
    
    // Redirect to role-specific dashboard
    window.location.href = `/${newRole}/dashboard`;
  };
  
  return { user, activeRole, switchRole };
}
```

---

## Firebase Setup

### Security Rules (Firestore):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([role]);
    }
    
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    // Customer orders
    match /orders/{orderId} {
      allow read: if hasRole('customer') || hasRole('vendor') || hasRole('admin');
      allow create: if hasRole('customer');
      allow update: if hasRole('vendor') || hasRole('admin');
    }
    
    // Vendor products
    match /products/{productId} {
      allow read: if true; // Public
      allow create, update, delete: if hasRole('vendor') || hasRole('admin');
    }
    
    // Admin-only collections
    match /systemSettings/{docId} {
      allow read, write: if hasRole('admin');
    }
  }
}
```

---

## Common Patterns

### Firebase Queries
```typescript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Real-time listener for vendor's products
const unsubscribe = onSnapshot(
  query(
    collection(db, 'products'),
    where('vendorId', '==', user.uid),
    orderBy('createdAt', 'desc')
  ),
  (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(products);
  }
);

return () => unsubscribe();
```

### Authentication Flow
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

async function login(email: string, password: string) {
  // 1. Sign in
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // 2. Fetch user document to get roles
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  const userData = userDoc.data();
  
  // 3. Redirect based on activeRole
  const role = userData.activeRole || userData.roles[0];
  window.location.href = `/${role}/dashboard`;
}
```

### Stripe Payment (Customer)
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
    
    if (!error) {
      // Send paymentMethod.id to your backend
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>Pay</button>
    </form>
  );
}

// Wrap in Elements provider
<Elements stripe={stripePromise}>
  <CheckoutForm />
</Elements>
```

### Mapbox Integration (Courier App Only)
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
    
    // Add user location marker
    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([-122.4, 37.8])
      .addTo(map.current);
  }, []);

  return (
    <div className="relative h-screen">
      {/* Full-screen map */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Floating controls */}
      <button className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full">
        🟢 Online
      </button>
      
      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-[60vh] overflow-y-auto">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-4">Available Jobs (5)</h2>
        {/* Job cards */}
      </div>
    </div>
  );
}
```

---

## Cloud Functions Patterns

### Transfer Payout to Vendor
```typescript
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const transferVendorPayout = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // If order marked as delivered
    if (after.status === 'delivered' && before.status !== 'delivered') {
      const vendorDoc = await admin.firestore()
        .collection('users')
        .doc(after.vendorId)
        .get();
      
      const stripeConnectId = vendorDoc.data()?.vendorProfile?.stripeConnectId;
      
      if (stripeConnectId) {
        // Transfer 90% to vendor (10% platform fee)
        const vendorAmount = Math.floor(after.totalAmount * 0.9);
        
        await stripe.transfers.create({
          amount: vendorAmount,
          currency: 'usd',
          destination: stripeConnectId,
          transfer_group: context.params.orderId,
        });
        
        // Update order with payout info
        await change.after.ref.update({
          vendorPayout: {
            amount: vendorAmount,
            transferredAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
          }
        });
      }
    }
  });
```

---

## Environment Variables

### Marketplace App (`.env.local`):
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

### Courier App (`.env.local`):
```bash
# Same Firebase config as above
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJhYmNkZWYifQ.xxxxx
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

### Cloud Functions (Firebase Secrets):
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

---

## Testing Strategy

### Local Development:
```bash
# Start Firebase Emulators
firebase emulators:start

# Seed test data
node scripts/seed-emulator-data.js

# Start marketplace app
cd apps/marketplace-app
pnpm dev  # Port 5173

# Start courier app (separate terminal)
cd apps/courier-app
pnpm dev  # Port 5174
```

### E2E Tests (Playwright):
Use the dedicated VS Code test tasks for running E2E tests (defined in `.vscode/tasks.json`):

- ▶ Run Marketplace E2E: Smoke - Key smoke tests (marketplace + vendor)
- ▶ Run Marketplace E2E: Admin Smoke - Admin functionality tests  
- ▶ Run Marketplace E2E: Courier Smoke - Courier app tests
- ▶ Run Marketplace E2E: Full - Complete E2E suite
- ▶ Run Marketplace E2E: Only Failed - Re-run failed tests

These tasks automatically start the E2E environment (emulators + preview server) and run tests. Access them via Terminal > Run Task > Test in VS Code.

**Note:** Always check `.vscode/tasks.json` for the latest available test tasks and update this documentation when new tasks are added.

Example test:
```typescript
// tests/e2e/marketplace.spec.ts
import { test, expect } from '@playwright/test';

test('customer can browse and checkout', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Login as customer
  await page.fill('[name="email"]', 'customer@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Should redirect to customer dashboard
  await expect(page).toHaveURL('/customer/dashboard');
  
  // Browse products
  await page.click('a[href="/customer/browse"]');
  
  // Add to cart
  await page.click('button:has-text("Add to Cart")');
  
  // Checkout
  await page.click('a[href="/customer/checkout"]');
  await expect(page.locator('h1')).toContainText('Checkout');
});
```

---

## Deployment

### Marketplace App:
```bash
cd apps/marketplace-app
pnpm build
firebase deploy --only hosting:marketplace
```

### Courier App:
```bash
cd apps/courier-app
pnpm build
firebase deploy --only hosting:courier
```

### Firebase Hosting Config (`firebase.json`):
```json
{
  "hosting": [
    {
      "site": "gosenderr-marketplace",
      "public": "apps/marketplace-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "site": "gosenderr-courier",
      "public": "apps/courier-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

---

## Mobile Considerations

### Capacitor Setup (Both Apps):
```bash
# Install Capacitor
cd apps/marketplace-app
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# Initialize
npx cap init

# Build and sync
pnpm build
npx cap sync

# Open in native IDE
npx cap open ios      # Xcode
npx cap open android  # Android Studio
```

### Native Features:
- 📸 **Camera** - Photo capture for delivery proof
- 📍 **Geolocation** - Real-time location tracking (courier app)
- 🔔 **Push Notifications** - Job alerts
- 🔐 **Biometrics** - Face ID/Touch ID login

---

## Performance Optimizations

### Code Splitting:
```typescript
// Lazy load role-specific pages
const CustomerDashboard = lazy(() => import('@/pages/customer/Dashboard'));
const VendorDashboard = lazy(() => import('@/pages/vendor/Dashboard'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));

<Route path="/customer/dashboard" element={
  <Suspense fallback={<LoadingSpinner />}>
    <CustomerDashboard />
  </Suspense>
} />
```

### Image Optimization:
```typescript
import imageCompression from 'browser-image-compression';

async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  
  return await imageCompression(file, options);
}
```

### Debounce Search:
```typescript
import { useState, useEffect } from 'react';

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage in search
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  // Fetch results with debouncedSearch
}, [debouncedSearch]);
```

---

## Security Best Practices

### Input Validation:
```typescript
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food', 'other']),
  stock: z.number().int().nonnegative(),
});

function validateProduct(data: unknown) {
  try {
    return ProductSchema.parse(data);
  } catch (error) {
    throw new Error('Invalid product data');
  }
}
```

### Sanitize HTML (if needed):
```typescript
import DOMPurify from 'dompurify';

function SafeHTML({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### Cloud Function Auth Check:
```typescript
export const createProduct = functions.https.onCall(async (data, context) => {
  // Always check auth
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  // Check role
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get();
  
  if (!userDoc.data()?.roles.includes('vendor')) {
    throw new functions.https.HttpsError('permission-denied', 'Must be a vendor');
  }
  
  // Proceed with logic
});
```

---

## Debugging Tips

### React DevTools:
- Install React DevTools browser extension
- Inspect component state and props
- Profile performance

### Firebase Emulator UI:
```bash
firebase emulators:start
# Open http://localhost:4000
```
- View Firestore data
- Test Cloud Functions
- Monitor Auth users

### Console Logging:
```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('[DEBUG] User roles:', user.roles);
  console.log('[DEBUG] Active role:', activeRole);
}
```

### Network Tab:
- Check failed API requests
- Verify Firebase SDK calls
- Monitor Stripe checkout sessions

---

## Governance & Safety

### MVP-First Development:
- ✅ Ship working features fast
- ✅ Use `// @ts-ignore` if TypeScript blocks you
- ✅ Skip failing tests temporarily (add `test.skip()`)
- ✅ Seed emulator data for local testing
- ✅ Open ONE PR with all changes
- ✅ Add follow-up tickets for cleanup

### Allowed Copilot Actions:
- Create branches: `copilot/*` or `chore/copilot/*`
- Open PRs with label: `generated-by-copilot`
- Run tests via VS Code tasks

### Human Approval Required:
- Merges to `main`, `production`, or protected branches
- Destructive operations (deleting data, removing infrastructure)
- Changes to CI/CD or deployment configs

### PR Requirements:
- Clear description of changes
- Basic manual QA steps
- At least one human reviewer assigned
- All CI checks pass (or documented exceptions)

---

## Secrets & Environment

### Never Commit:
- ❌ API keys
- ❌ Firebase credentials
- ❌ Stripe secret keys
- ❌ `.env.local` files

### Use Instead:
- ✅ GitHub Secrets for CI/CD
- ✅ Firebase Secrets for Cloud Functions
- ✅ `.env.example` templates (no real values)

---

## Quick Reference

### Start Development:
```bash
# 1. Start Firebase Emulators
firebase emulators:start

# 2. Seed test data
node scripts/seed-emulator-data.js

# 3. Start marketplace app
cd apps/marketplace-app && pnpm dev

# 4. Start courier app (separate terminal)
cd apps/courier-app && pnpm dev
```

### Deploy:
```bash
# Build both apps
pnpm build

# Deploy marketplace
firebase deploy --only hosting:marketplace

# Deploy courier
firebase deploy --only hosting:courier

# Deploy functions
firebase deploy --only functions
```

### Test:
Use the VS Code test tasks for E2E testing (defined in `.vscode/tasks.json`):
- ▶ Run Marketplace E2E: Smoke
- ▶ Run Marketplace E2E: Admin Smoke
- ▶ Run Marketplace E2E: Courier Smoke
- ▶ Run Marketplace E2E: Full
- ▶ Run Marketplace E2E: Only Failed

**Note:** Check `.vscode/tasks.json` for the complete list of available tasks and update this documentation when new tasks are added.

For manual testing:
```bash
# E2E tests
cd apps/marketplace-app
pnpm test:e2e

# Unit tests
pnpm test
```

---

## When in Doubt:

1. **Check existing code patterns** in the app
2. **Prioritize speed over perfection** (MVP mindset)
3. **Use TypeScript strictly** but `// @ts-ignore` is OK for shipping
4. **Handle loading and error states** gracefully
5. **Test on mobile** if UI-related (use Chrome DevTools mobile view)
6. **Add `// TODO:` comments** for follow-up work

---

## Common Workflows

### Add New Customer Feature:
1. Create component in `apps/marketplace-app/src/pages/customer/`
2. Add route to customer routes
3. Update navigation if needed
4. Test locally with emulator data
5. Open PR

### Add New Vendor Feature:
1. Create component in `apps/marketplace-app/src/pages/vendor/`
2. Add route to vendor routes
3. Check role guard is applied
4. Test with vendor role user
5. Open PR

### Add New Admin Feature:
1. Create component in `apps/marketplace-app/src/pages/admin/`
2. Add route to admin routes
3. Ensure `hasRole('admin')` security rule
4. Test with admin user
5. Open PR

---

## Support & Questions

For questions or modifications to Copilot policy, contact the repository owners.

**Last Updated:** January 29, 2026  
**Maintained By:** GoSenderr Engineering Team

---

*These instructions guide GitHub Copilot to build features aligned with GoSenderr's multi-role marketplace architecture. All code should prioritize shipping working MVPs quickly, with follow-up refinement.*
```

---

## **✅ What I've Created:**

This is your **NEW comprehensive Copilot instructions file** that includes:

1. ✅ **Marketplace-app architecture** (customer + vendor + admin in one app)
2. ✅ **Courier-app separation** (map-first delivery app)
3. ✅ **Multi-role user system** with role switcher
4. ✅ **Route structure** for all three portals
5. ✅ **Complete code patterns** (auth, Firebase, Stripe, Mapbox)
6. ✅ **MVP-first mindset** (ship fast, clean up later)
7. ✅ **Security rules** for role-based access
8. ✅ **Testing & deployment** instructions
9. ✅ **Mobile considerations** (Capacitor setup)
10. ✅ **Quick reference** commands

---

## **🚀 Next Steps:**

**Option 1:** Should I **save this file** to your repository by creating a PR?

**Option 2:** Do you want to **review/modify** anything first?

**Option 3:** Should I also help you **rename customer-app → marketplace-app** and update all the references?

What would you like to do next? 🎯
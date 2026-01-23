# Vite Migration Plan: Next.js → Vite + React + TypeScript

## Executive Summary

Migrate GoSenderR web app from Next.js 15 to Vite + React 19 + TypeScript, following the ShiftX stack architecture. This migration will deliver:

- ⚡ **10x faster builds** (30s vs 5min)
- 📦 **Simpler deployments** (static export, no Cloud Functions for SSR)
- 🎯 **Better DX** (faster HMR, clearer architecture)
- 💰 **Lower costs** (no Cloud Functions compute for SSR)

---

## Current Stack

### Technology
- **Framework**: Next.js 15.5.9 (App Router)
- **Build Tool**: Webpack (via Next.js)
- **Hosting**: Firebase Hosting with Cloud Functions (SSR)
- **Deployment Time**: 5-10 minutes (includes Cloud Build)
- **Bundle**: ~102KB first load JS + dynamic routes

### Pain Points
1. **Slow deploys**: Cloud Functions build takes 3-5 minutes
2. **Complex config**: frameworksBackend, package-lock.json issues
3. **SSR overhead**: Not needed for most pages (auth-gated SPA)
4. **Lock file conflicts**: pnpm vs npm package-lock.json
5. **Build warnings**: SWC dependencies patching errors

---

## Target Stack (ShiftX-Style)

### Technology
- **Framework**: React 19
- **Build Tool**: Vite 6
- **Language**: TypeScript 5.7
- **Routing**: React Router v7 (or TanStack Router)
- **Hosting**: Firebase Hosting (static files only)
- **Deployment Time**: 30-60 seconds

### Directory Structure
```
apps/
  customer-app/        # Customer-facing SPA
    ├── src/
    │   ├── pages/     # Route components
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   └── main.tsx
    ├── public/
    ├── index.html
    ├── vite.config.ts
    └── package.json
  
  senderr-app/         # Senderr/Courier SPA
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── ...
    └── ...
  
  admin-app/           # Admin portal SPA (optional)
    └── ...
  
  vendor-app/          # Vendor portal SPA (optional)
    └── ...

packages/
  shared/              # Shared types, utils (existing)
  ui/                  # Shared UI components (NEW)
    ├── src/
    │   ├── Avatar.tsx
    │   ├── Card.tsx
    │   ├── GlassCard.tsx
    │   └── ...
    └── package.json
```

---

## Migration Strategy

### Phase 1: Foundation Setup (Week 1)

#### Day 1-2: Project Structure
- [ ] Create `apps/customer-app` directory
- [ ] Initialize Vite project with React + TypeScript template
- [ ] Set up Vite configuration (vite.config.ts)
- [ ] Configure path aliases (@/, @components, @hooks, etc.)
- [ ] Install core dependencies:
  ```bash
  pnpm create vite@latest apps/customer-app --template react-ts
  cd apps/customer-app
  pnpm add react-router-dom firebase framer-motion clsx
  pnpm add -D @types/node
  ```

#### Day 3-4: Shared Packages
- [ ] Create `packages/ui` for shared components
- [ ] Move reusable components from `apps/web/src/components`:
  - Avatar, Card, GlassCard, LoadingSkeleton, NotFoundPage
  - FloatingButton
- [ ] Set up package exports in `packages/ui/package.json`
- [ ] Configure Vite to resolve workspace packages

#### Day 5: Firebase & Core Setup
- [ ] Copy Firebase config from existing app
- [ ] Set up Firebase client initialization
- [ ] Migrate hooks from `apps/web/src/hooks/v2`:
  - useAuthUser, useUserRole, useUserDoc
  - useOpenJobs, useCourierLocationWriter
  - useFeatureFlags, useRoutes
- [ ] Set up environment variables (.env.local)

---

### Phase 2: Authentication & Routing (Week 1-2)

#### Routing Setup
- [ ] Install React Router v7:
  ```bash
  pnpm add react-router@latest react-router-dom@latest
  ```
- [ ] Create route structure matching Next.js App Router:
  ```tsx
  // src/App.tsx
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  
  function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-role" element={<SelectRolePage />} />
          <Route path="/customer/*" element={<CustomerRoutes />} />
          {/* ... */}
        </Routes>
      </BrowserRouter>
    );
  }
  ```

#### Auth Pages Migration
- [ ] `/login` - Migrate to `src/pages/Login.tsx`
- [ ] `/select-role` - Migrate to `src/pages/SelectRole.tsx`
- [ ] Create `<AuthGuard>` component (replace Next.js middleware)
- [ ] Set up role-based routing

**Migration Pattern**:
```tsx
// Next.js (before)
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  // ...
  router.push('/customer/dashboard');
}

// Vite + React Router (after)
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  // ...
  navigate('/customer/dashboard');
}
```

---

### Phase 3: Customer Portal (Week 2)

#### Pages to Migrate
- [ ] `/customer/dashboard`
- [ ] `/customer/jobs`
- [ ] `/customer/jobs/:jobId`
- [ ] `/customer/checkout`
- [ ] `/customer/packages`
- [ ] `/customer/packages/:packageId`
- [ ] `/customer/orders`
- [ ] `/customer/profile`
- [ ] `/customer/settings`

#### Components to Port
- [ ] LiveTripStatus (already framework-agnostic)
- [ ] MapboxMap
- [ ] AddressAutocomplete
- [ ] CourierSelector

#### Data Fetching Pattern
```tsx
// Next.js (SSR - not needed)
export async function generateMetadata() { /* ... */ }

// Vite (client-side)
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

export function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchJob() {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      setJob(jobDoc.data());
      setLoading(false);
    }
    fetchJob();
  }, [jobId]);
  
  if (loading) return <LoadingSkeleton />;
  return <JobDetails job={job} />;
}
```

---

### Phase 4: Marketplace (Week 2-3)

#### Pages to Migrate
- [ ] `/marketplace` - Browse items
- [ ] `/marketplace/:itemId` - Item details
- [ ] `/marketplace/create` - Create listing

#### Components
- [ ] Item card grid
- [ ] Item filters
- [ ] Image galleries

**All components are already pure React - direct port!**

---

### Phase 5: Senderr/Courier App (Week 3)

#### Option A: Separate App
Create `apps/senderr-app` with dedicated build:
- Lighter bundle (only courier features)
- Independent deployment
- Better performance

#### Option B: Unified App with Lazy Loading
Keep in `customer-app` with React.lazy:
```tsx
const CourierDashboard = lazy(() => import('./pages/courier/Dashboard'));
```

#### Pages to Migrate
- [ ] `/courier/dashboard`
- [ ] `/courier/onboarding`
- [ ] `/courier/rate-cards`
- [ ] `/courier/equipment`
- [ ] `/courier/jobs/:jobId`
- [ ] `/courier/routes`
- [ ] `/courier/active-route`

---

### Phase 6: Admin & Vendor Portals (Week 3-4)

#### Admin Pages
- [ ] `/admin/dashboard`
- [ ] `/admin/users`
- [ ] `/admin/equipment-review`
- [ ] `/admin/feature-flags`
- [ ] `/admin/analytics` (with Recharts)

#### Vendor Pages
- [ ] `/vendor/items`
- [ ] `/vendor/items/new`
- [ ] `/vendor/orders`

---

### Phase 7: API Routes → Cloud Functions (Week 4)

#### Current API Routes (Next.js)
- `/api/create-payment-intent`
- `/api/stripe/connect`
- `/api/stripe/marketplace-checkout`
- `/api/stripe/webhook`

#### Migration to Cloud Functions
```typescript
// firebase/functions/src/api/stripe.ts
import * as functions from 'firebase-functions/v2';
import Stripe from 'stripe';

export const createPaymentIntent = functions.https.onCall(async (request) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { amount, currency } = request.data;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
  });
  
  return { clientSecret: paymentIntent.client_secret };
});
```

#### Client-Side Call (Vite)
```typescript
import { httpsCallable } from 'firebase/functions';

const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
const result = await createPaymentIntent({ amount: 1000, currency: 'usd' });
```

---

## Build Configuration

### Vite Config (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@gosenderr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@gosenderr/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui': ['framer-motion', 'clsx'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
```

### TypeScript Config (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@lib/*": ["./src/lib/*"],
      "@gosenderr/shared": ["../../packages/shared/src"],
      "@gosenderr/ui": ["../../packages/ui/src"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Firebase Hosting Configuration

### Updated `firebase.json` for Multiple Sites
```json
{
  "hosting": [
    {
      "target": "customer",
      "site": "gosenderr-customer",
      "public": "apps/customer-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    },
    {
      "target": "senderr",
      "site": "gosenderr-senderr",
      "public": "apps/senderr-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ],
  "functions": {
    "source": "firebase/functions"
  }
}
```

### Firebase Targets Setup
```bash
# Initialize hosting targets
firebase target:apply hosting customer gosenderr-customer
firebase target:apply hosting senderr gosenderr-senderr

# Deploy specific target
firebase deploy --only hosting:customer
firebase deploy --only hosting:senderr

# Deploy all
firebase deploy --only hosting
```

---

## Deployment Workflow

### Build Commands
```json
// package.json (root)
{
  "scripts": {
    "build": "turbo run build",
    "build:customer": "pnpm --filter customer-app build",
    "build:senderr": "pnpm --filter senderr-app build",
    "deploy:customer": "pnpm build:customer && firebase deploy --only hosting:customer",
    "deploy:senderr": "pnpm build:senderr && firebase deploy --only hosting:senderr",
    "deploy:all": "pnpm build && firebase deploy --only hosting"
  }
}
```

### Individual App Build
```json
// apps/customer-app/package.json
{
  "name": "customer-app",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## Testing Strategy

### Unit Tests
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### E2E Tests
Keep existing Playwright tests, update selectors if needed.

---

## Migration Checklist

### Pre-Migration
- [x] Document current features (WEB_APP_FEATURES.md)
- [x] Document deployment process (FIREBASE_HOSTING_DEPLOY.md)
- [ ] Create git branch: `feature/vite-migration`
- [ ] Set up Vite project structure

### During Migration
- [ ] Port components one portal at a time
- [ ] Test each portal thoroughly before moving to next
- [ ] Keep Next.js app running until full migration complete

### Post-Migration
- [ ] Performance comparison (bundle size, load time)
- [ ] Update all documentation
- [ ] Train team on new stack
- [ ] Archive Next.js app code

---

## Risk Mitigation

### Potential Issues

1. **Image Optimization**
   - **Next.js**: Built-in `next/image` with automatic optimization
   - **Solution**: Use `vite-imagetools` or serve optimized images from Firebase Storage

2. **SEO (if needed)**
   - **Next.js**: SSR for SEO
   - **Solution**: Most pages are auth-gated (no SEO needed). For public pages, use prerendering or Firebase Dynamic Links.

3. **API Routes**
   - **Next.js**: Co-located API routes
   - **Solution**: Migrate to Firebase Cloud Functions (already partially done)

4. **Environment Variables**
   - **Next.js**: `process.env.NEXT_PUBLIC_*`
   - **Vite**: `import.meta.env.VITE_*`
   - **Solution**: Find/replace all env vars

---

## Success Metrics

### Performance Targets
- **Build time**: < 60s (vs 5-10min)
- **Deployment time**: < 90s total (vs 5-10min)
- **First contentful paint**: < 1.5s
- **Time to interactive**: < 3s
- **Bundle size**: < 200KB gzipped

### Developer Experience
- **Hot reload**: < 200ms
- **Type checking**: < 5s
- **Test execution**: < 10s

---

## Timeline

### Conservative Estimate
- **Week 1**: Setup + Auth + Customer portal (30% complete)
- **Week 2**: Marketplace + Senderr portal (60% complete)
- **Week 3**: Admin + Vendor + API migration (90% complete)
- **Week 4**: Testing + documentation + deployment (100% complete)

### Aggressive Estimate (with dedicated focus)
- **Week 1-2**: All major portals migrated
- **Week 3**: Polish + testing + deployment

---

## Rollback Plan

### If Migration Fails
1. Next.js app remains deployed and functional
2. Git branch can be abandoned
3. No data loss (Firestore unchanged)
4. Firebase Hosting can host both versions simultaneously

### Staged Rollout
1. Deploy Vite version to `beta.gosenderr.com`
2. Test with internal team
3. Gradual rollout to users
4. Keep Next.js as fallback for 30 days

---

## Conclusion

The migration from Next.js to Vite is **highly feasible** with **significant benefits**:

✅ **95% of code is directly reusable** (React components, hooks, Firebase logic)  
✅ **10x faster builds** = better developer productivity  
✅ **Simpler deployments** = fewer bugs, faster iterations  
✅ **Lower hosting costs** = no Cloud Functions for SSR  

**Recommendation**: Proceed with migration. Start with customer portal as proof of concept, then expand to other portals.

---

**Next Steps**:
1. Get stakeholder approval
2. Create `feature/vite-migration` branch
3. Set up `apps/customer-app` scaffold
4. Begin Phase 1 (Foundation Setup)

**Questions?** See `WEB_APP_FEATURES.md` for full feature inventory.

**Last Updated**: January 23, 2026

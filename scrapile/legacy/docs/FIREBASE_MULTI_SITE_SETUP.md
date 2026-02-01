# Firebase Multiple Hosting Sites Configuration

## Overview
This document explains how to configure Firebase Hosting to support multiple sites (customer app, senderr app, admin app, etc.) from a single Firebase project, following the ShiftX architecture pattern.

## Current Configuration (Single Site)

```json
{
  "hosting": {
    "site": "gosenderr-6773f",
    "source": "apps/web",
    "ignore": ["firebase.json", "**/node_modules/**"],
    "frameworksBackend": {
      "region": "us-central1",
      "runtime": "nodejs20"
    }
  }
}
```

## Target Configuration (Multiple Sites)

### Option A: Multiple Sites with Targets

```json
{
  "hosting": [
    {
      "target": "main",
      "site": "gosenderr-6773f",
      "public": "apps/web/.next",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
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
          "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        },
        {
          "source": "**",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "no-cache, no-store, must-revalidate"
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
    },
    {
      "target": "admin",
      "site": "gosenderr-admin",
      "public": "apps/admin-app/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ],
  "firestore": {
    "rules": "firebase/firestore.rules"
  },
  "storage": {
    "rules": "firebase/storage.rules"
  },
  "functions": {
    "source": "firebase/functions"
  }
}
```

## Setup Instructions

### 1. Create Firebase Hosting Sites

In Firebase Console (https://console.firebase.google.com/project/gosenderr-6773f/hosting):

1. Navigate to **Hosting** section
2. Click **Add another site**
3. Create sites:
   - `gosenderr-customer` (Customer app)
   - `gosenderr-senderr` (Senderr app)
   - `gosenderr-admin` (Admin app)
  - `gosenderr-seller` (Seller app - optional)

### 2. Configure Hosting Targets

```bash
# Navigate to project root
cd /path/to/gosenderr

# Apply hosting targets (maps target names to site IDs)
firebase target:apply hosting main gosenderr-6773f
firebase target:apply hosting customer gosenderr-customer
firebase target:apply hosting senderr gosenderr-senderr
firebase target:apply hosting admin gosenderr-admin

# Verify targets
firebase target:list
```

This creates a `.firebaserc` file:
```json
{
  "projects": {
    "default": "gosenderr-6773f"
  },
  "targets": {
    "gosenderr-6773f": {
      "hosting": {
        "main": ["gosenderr-6773f"],
        "customer": ["gosenderr-customer"],
        "senderr": ["gosenderr-senderr"],
        "admin": ["gosenderr-admin"]
      }
    }
  }
}
```

### 3. Deploy Individual Sites

```bash
# Deploy only customer app
firebase deploy --only hosting:customer

# Deploy only senderr app  
firebase deploy --only hosting:senderr

# Deploy specific site
firebase deploy --only hosting:main

# Deploy all hosting sites
firebase deploy --only hosting

# Deploy hosting + functions
firebase deploy --only hosting,functions
```

## Custom Domains

### Configure Custom Domains

1. Go to Firebase Console → Hosting → [Select Site] → Add custom domain
2. Add domains:
   - `app.gosenderr.com` → gosenderr-customer
   - `senderr.gosenderr.com` → gosenderr-senderr
   - `admin.gosenderr.com` → gosenderr-admin
   - `www.gosenderr.com` → gosenderr-6773f (main/legacy)

3. Follow DNS configuration prompts

### DNS Records (Example for Cloudflare)

```
Type    Name      Content                            TTL
A       app       151.101.1.195                      Auto
A       app       151.101.65.195                     Auto
TXT     app       hosting-site=gosenderr-customer    Auto

A       senderr   151.101.1.195                      Auto
A       senderr   151.101.65.195                     Auto
TXT     senderr   hosting-site=gosenderr-senderr     Auto
```

## Package.json Scripts

Add these scripts to root `package.json`:

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:customer": "pnpm --filter customer-app build",
    "build:senderr": "pnpm --filter senderr-app build",
    "build:admin": "pnpm --filter admin-app build",
    "build:main": "pnpm --filter web build",
    
    "deploy:customer": "pnpm build:customer && firebase deploy --only hosting:customer",
    "deploy:senderr": "pnpm build:senderr && firebase deploy --only hosting:senderr",
    "deploy:admin": "pnpm build:admin && firebase deploy --only hosting:admin",
    "deploy:main": "pnpm build:main && firebase deploy --only hosting:main",
    
    "deploy:hosting": "pnpm build && firebase deploy --only hosting",
    "deploy:all": "pnpm build && firebase deploy"
  }
}
```

## Turbo Configuration

Update `turbo.json` for optimized builds:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

## Environment Variables per Site

### Customer App (.env.customer)
```env
VITE_APP_NAME=GoSenderR Customer
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

### Senderr App (.env.senderr)
```env
VITE_APP_NAME=GoSenderR Senderr
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

Load environment files in package.json:
```json
{
  "scripts": {
    "build:customer": "cp .env.customer apps/customer-app/.env && pnpm --filter customer-app build",
    "build:senderr": "cp .env.senderr apps/senderr-app/.env && pnpm --filter senderr-app build"
  }
}
```

## Benefits of Multiple Sites

### ✅ Advantages
- **Independent deployments**: Deploy customer app without affecting senderr app
- **Faster builds**: Build only what changed
- **Better caching**: Separate cache headers per app
- **Cleaner URLs**: app.gosenderr.com vs senderr.gosenderr.com
- **Smaller bundles**: Each app only includes its features
- **Better performance**: Faster load times due to code splitting

### ⚠️ Considerations
- **More configuration**: Need to manage multiple sites
- **DNS setup**: Custom domains for each site
- **Environment management**: Separate env files per app

## Testing Locally

### Preview Individual Sites

```bash
# Build and preview customer app
pnpm build:customer
cd apps/customer-app
pnpm preview

# Build and preview senderr app
pnpm build:senderr
cd apps/senderr-app
pnpm preview
```

### Firebase Emulator
```bash
# Start all emulators
firebase emulators:start

# Access sites:
# - http://localhost:5000 (main)
# - http://localhost:5001 (customer - if configured)
```

## Rollback Strategy

### Rollback to Previous Version

```bash
# List releases
firebase hosting:channel:list --site gosenderr-customer

# Clone previous version to live
firebase hosting:clone gosenderr-customer:PREVIOUS_VERSION_ID gosenderr-customer:live
```

### Staged Rollouts

```bash
# Deploy to preview channel
firebase hosting:channel:deploy preview --only hosting:customer

# Preview URL: https://gosenderr-customer--preview-<hash>.web.app

# Promote to live when ready
firebase hosting:clone gosenderr-customer:preview gosenderr-customer:live
```

## Security Rules

All apps share same Firestore/Storage rules but can implement different auth logic:

```typescript
// apps/customer-app/src/lib/firebase/client.ts
export const requireCustomerRole = () => {
  const user = useUserRole();
  if (user.role !== 'customer') {
    throw new Error('Customer access required');
  }
};

// apps/senderr-app/src/lib/firebase/client.ts
export const requireCourierRole = () => {
  const user = useUserRole();
  if (user.role !== 'courier') {
    throw new Error('Senderr access required');
  }
};
```

## Monitoring

### Firebase Console
- Monitor each site independently in Hosting section
- View bandwidth, requests, storage per site

### Performance Monitoring
```typescript
// Add to each app's main.tsx
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
// Automatic monitoring enabled
```

## Cost Optimization

### Bandwidth Usage
Each site counts toward total bandwidth:
- **Free tier**: 10 GB/month
- **Beyond free**: $0.15/GB

### Tips to Reduce Costs
- Enable aggressive caching for static assets
- Compress images before upload
- Use CDN for large assets
- Implement lazy loading

## Migration Path

### Phase 1: Keep Next.js as Main
```json
{
  "hosting": [
    {
      "target": "main",
      "site": "gosenderr-6773f",
      "source": "apps/web"
    }
  ]
}
```

### Phase 2: Add Vite Customer App
```json
{
  "hosting": [
    {
      "target": "main",
      "site": "gosenderr-6773f",
      "source": "apps/web"
    },
    {
      "target": "customer",
      "site": "gosenderr-customer",
      "public": "apps/customer-app/dist"
    }
  ]
}
```

### Phase 3: Migrate All Apps
```json
{
  "hosting": [
    {
      "target": "customer",
      "site": "gosenderr-customer",
      "public": "apps/customer-app/dist"
    },
    {
      "target": "senderr",
      "site": "gosenderr-senderr",
      "public": "apps/senderr-app/dist"
    },
    {
      "target": "admin",
      "site": "gosenderr-admin",
      "public": "apps/admin-app/dist"
    }
  ]
}
```

---

**Ready to implement?** Follow `VITE_MIGRATION_PLAN.md` for detailed migration steps.

**Last Updated**: January 23, 2026

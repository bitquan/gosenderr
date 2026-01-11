# GoSenderr Customer Web App

Next.js 15 web application for the GoSenderr customer platform. Provides job management, real-time tracking, and Mapbox integration.

## 🚀 Quick Start

```bash
# From monorepo root
pnpm install

# Start dev server
pnpm dev:web

# Or from this directory
cd apps/web
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Tech Stack
- **Framework:** Next.js 15.5.9 (App Router)
- **React:** 19.0.0
- **TypeScript:** 5.7.3
- **Firebase:** Auth, Firestore (modular v9+ SDK)
- **Maps:** Mapbox GL JS 3.8.0
- **Shared Types:** `@gosenderr/shared` package

### Project Structure
```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── login/        # Authentication entry
│   │   ├── select-role/  # Role selection for new users
│   │   └── customer/     # Customer-protected routes
│   │       └── jobs/     # Job management (list, create, detail)
│   ├── components/       # React components
│   │   ├── AuthGate.tsx      # Auth protection wrapper
│   │   ├── RoleGate.tsx      # Role-based access control
│   │   ├── JobForm.tsx       # Reusable job creation form
│   │   └── MapboxMap.tsx     # Mapbox GL JS map component
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuthUser.ts    # Firebase Auth state
│   │   ├── useUserDoc.ts     # Realtime user document
│   │   ├── useUserRole.ts    # User role helper
│   │   ├── useJobs.ts        # Realtime jobs list
│   │   └── useJob.ts         # Realtime single job
│   └── lib/              # Utilities
│       └── firebase/     # Firebase client SDK setup
└── .env.local            # Environment variables (not in git)
```

## 🔐 Authentication & Authorization

### Auth Flow
1. User visits protected route (e.g., `/customer/jobs`)
2. `AuthGate` checks authentication → redirects to `/login` if not signed in
3. After login, check Firestore `users/{uid}` document
4. If no role → redirect to `/select-role`
5. `RoleGate` enforces role-based access:
   - Customer → allow access to `/customer/*`
   - Driver → redirect to `/driver-not-implemented`

### Gate Components
- **AuthGate:** Wraps routes requiring authentication
- **RoleGate:** Wraps routes requiring specific roles

```tsx
// Example: Protect customer routes
<AuthGate>
  <RoleGate allowedRoles={['customer']}>
    {children}
  </RoleGate>
</AuthGate>
```

## 📋 Customer Features

### Jobs Management
- **List Jobs:** View all jobs with realtime updates
- **Create Job:** Form with coordinate validation
- **Job Details:** Live status updates, map view, photos

### Realtime Updates
All data uses Firestore `onSnapshot` for live synchronization:
- Job status changes
- Driver assignment
- Driver location updates
- No page refresh needed

### Status Colors
- 🟠 **Orange:** open, idle
- 🔵 **Blue:** assigned, enroute, arrived (in-progress states)
- 🟢 **Green:** completed

## 🗺️ Mapbox Integration

### MapboxMap Component
Displays interactive map with:
- 🟢 **Green marker:** Pickup location
- 🔴 **Red marker:** Dropoff location
- 🔵 **Blue marker:** Driver location (when assigned)

Features:
- Auto-fit bounds to show all markers
- Popups with location details
- Realtime driver marker updates
- Proper cleanup on unmount

### Configuration
Requires Mapbox token in `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx
```

Get token from [Mapbox Account](https://account.mapbox.com/)

## 🔥 Firebase Setup

### Required Services
- **Auth:** Email/password (phone auth optional, requires reCAPTCHA)
- **Firestore:** `users` and `jobs` collections
- **Storage:** (future) for photo uploads

### Environment Variables
Create `apps/web/.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx
```

### Firestore Composite Index
Jobs list query requires composite index on `jobs` collection:
- `createdByUid` (Ascending)
- `createdAt` (Descending)

If you see an index error, follow the link in the error message to create it automatically.

## 🧪 Testing

### Manual E2E Flow
1. **Clear Storage:**
   - Open DevTools → Application → Clear site data
   
2. **Authentication:**
   - Navigate to `/customer/jobs` → redirects to `/login`
   - Sign up with email/password
   - Redirects to `/select-role`
   
3. **Role Selection:**
   - Select "Customer" role
   - Redirects to `/customer/jobs` (empty list)
   
4. **Create Job:**
   - Click "Create New Job"
   - Enter coordinates (e.g., pickup: 37.7749, -122.4194, dropoff: 37.8044, -122.2712)
   - Submit → job appears in list with "open" status (orange)
   
5. **Job Details:**
   - Click job → view detail page
   - Verify map shows pickup (green) and dropoff (red) markers
   
6. **Simulate Driver Assignment:**
   - Open Firebase Console → `jobs/{jobId}` document
   - Update fields:
     ```json
     {
       "driverUid": "test_driver_123",
       "driverLocation": { "lat": 37.7849, "lng": -122.4094 },
       "status": "assigned"
     }
     ```
   
7. **Verify Realtime Updates:**
   - Return to web app (don't refresh)
   - Status badge turns blue
   - Driver marker appears on map (blue)
   - All updates happen automatically

### Test Coordinates
San Francisco area examples:
- **Pickup:** 37.7749, -122.4194 (Downtown SF)
- **Dropoff:** 37.8044, -122.2712 (Oakland)
- **Driver:** 37.7849, -122.4094 (Near pickup)

## 🚧 Known Limitations

1. **Phone Auth:** Requires reCAPTCHA configuration for production
2. **Firestore Index:** May need manual creation (link provided in UI)
3. **Driver App:** Not implemented yet (`/driver-not-implemented` placeholder)
4. **Photo Upload:** UI shows photos if URL exists, but upload flow not implemented

## 📦 Dependencies

Key packages:
- `next@15.5.9` - React framework
- `react@19.0.0` - UI library
- `firebase@11.1.0` - Backend services
- `mapbox-gl@3.8.0` - Interactive maps
- `@gosenderr/shared` - Shared TypeScript types

## 🔄 State Management

### Custom Hooks Pattern
```tsx
// Realtime user document
const { userDoc, loading, error } = useUserDoc(uid);

// Realtime jobs list
const { jobs, loading, error } = useJobs();

// Realtime single job
const { job, loading, error } = useJob(jobId);
```

All hooks use Firestore `onSnapshot` for live updates and handle:
- Loading states
- Error handling
- Automatic cleanup on unmount

## 🚀 Deployment

### Build
```bash
# From monorepo root
pnpm build:web

# Or from this directory
pnpm build
```

### Environment
Ensure all environment variables are set in your deployment platform (Vercel, etc.)

### Firestore Rules
Ensure proper security rules are configured:
```javascript
// Example rules (adjust as needed)
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

match /jobs/{jobId} {
  allow read: if request.auth.uid == resource.data.createdByUid 
              || request.auth.uid == resource.data.driverUid;
  allow create: if request.auth != null;
  allow update: if request.auth.uid == resource.data.createdByUid 
                || request.auth.uid == resource.data.driverUid;
}
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Project Checkpoints](../../CHECKPOINTS.md)

## 🤝 Contributing

This is part of the GoSenderr monorepo. See root README for contribution guidelines.

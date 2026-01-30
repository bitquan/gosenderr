# Tech Stack Reference

**Last Updated:** January 2026  
**Version:** 2.0  
**Purpose:** Complete technology reference for GoSenderr v2

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Frontend Technologies](#frontend-technologies)
3. [Mobile Technologies](#mobile-technologies)
4. [Desktop Technologies](#desktop-technologies)
5. [Backend Technologies](#backend-technologies)
6. [Maps & Location](#maps--location)
7. [Payments](#payments)
8. [Development Tools](#development-tools)
9. [Common Commands](#common-commands)
10. [Best Practices](#best-practices)

---

## Overview

### Technology Stack Summary

| Category | Technology | Version | Used In |
|----------|-----------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | All apps |
| **Language** | TypeScript | 5.7.2 | All apps |
| **Mobile (iOS Native)** | React Native | 0.72+ | Courier app |
| **Mobile (Web Wrapper)** | Capacitor | 5.5+ | Marketplace iOS |
| **Desktop** | Electron | 28.0+ | Admin Desktop |
| **Build Tool (Web)** | Vite | 7.3.1 | Admin, Marketplace |
| **Styling** | Tailwind CSS | 3.4+ | Web apps |
| **Backend** | Firebase | - | All apps |
| **Database** | Cloud Firestore | - | All apps |
| **Authentication** | Firebase Auth | - | All apps |
| **Storage** | Firebase Storage | - | All apps |
| **Functions** | Cloud Functions | Gen 2 | Backend |
| **Hosting** | Firebase Hosting | - | Web apps |
| **Maps** | Mapbox | GL JS v3 | All apps |
| **Payments** | Stripe | 14.x | All apps |
| **State Management** | Zustand | 4.5+ | All apps |
| **Routing (Web)** | React Router | 6.x | Web apps |
| **Routing (RN)** | React Navigation | 6.x | Courier app |
| **Package Manager** | pnpm | 8.15+ | Monorepo |
| **Monorepo** | Turborepo | 2.3+ | Build system |

---

## Frontend Technologies

### React

**Version:** 18.3.1  
**Purpose:** UI framework for all applications  
**Documentation:** https://react.dev

#### Key Features Used
- Functional components with hooks
- Context API for shared state
- Suspense and Error Boundaries
- Concurrent rendering
- Server components (future)

#### Installation
```bash
pnpm add react@^18.3.1 react-dom@^18.3.1
pnpm add -D @types/react @types/react-dom
```

#### Common Patterns

**Component Structure:**
```typescript
import React, { useState, useEffect } from 'react'

interface Props {
  userId: string
  onUpdate?: (user: User) => void
}

export const UserProfile: React.FC<Props> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Spinner />
  if (!user) return <EmptyState />

  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      {/* ... */}
    </div>
  )
}
```

**Custom Hooks:**
```typescript
import { useState, useEffect } from 'react'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
```

---

### TypeScript

**Version:** 5.7.2  
**Purpose:** Type safety and developer experience  
**Documentation:** https://www.typescriptlang.org

#### Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

#### Type Definitions

**User Types:**
```typescript
// packages/shared/src/types/user.ts
export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  phoneNumber?: string
  roles: UserRole[]
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'customer' | 'seller' | 'courier' | 'admin'

export interface SellerProfile {
  userId: string
  businessName: string
  bio: string
  rating: number
  totalSales: number
  stripeAccountId?: string
}

export interface CourierProfile {
  userId: string
  vehicleType: 'car' | 'bike' | 'scooter' | 'van'
  licensePlate: string
  isOnline: boolean
  rating: number
  totalDeliveries: number
  stripeAccountId?: string
}
```

**Order Types:**
```typescript
// packages/shared/src/types/order.ts
export interface Order {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  courierId?: string
  status: OrderStatus
  amount: number
  platformFee: number
  deliveryFee: number
  pickupAddress: Address
  deliveryAddress: Address
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus =
  | 'pending'
  | 'payment_processing'
  | 'paid'
  | 'courier_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  coordinates: {
    latitude: number
    longitude: number
  }
}
```

---

### Tailwind CSS

**Version:** 3.4+  
**Purpose:** Utility-first CSS framework  
**Documentation:** https://tailwindcss.com

#### Installation
```bash
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### Configuration

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

#### Common Utilities

**Layout:**
```jsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div className="col-span-1">...</div>
  </div>
</div>
```

**Flexbox:**
```jsx
<div className="flex items-center justify-between">
  <div className="flex-1">...</div>
  <div className="flex-shrink-0">...</div>
</div>
```

**Responsive:**
```jsx
<div className="text-sm md:text-base lg:text-lg">
  <h1 className="hidden md:block">Desktop Title</h1>
  <h1 className="block md:hidden">Mobile Title</h1>
</div>
```

**States:**
```jsx
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300">
  Click Me
</button>
```

---

### Vite

**Version:** 7.3.1  
**Purpose:** Fast build tool and dev server  
**Documentation:** https://vitejs.dev

#### Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
})
```

#### Commands
```bash
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Build for production
pnpm preview      # Preview production build
```

---

### React Router

**Version:** 6.x  
**Purpose:** Client-side routing for web apps  
**Documentation:** https://reactrouter.com

#### Installation
```bash
pnpm add react-router-dom
pnpm add -D @types/react-router-dom
```

#### Configuration

**routes/index.tsx:**
```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'browse', element: <Browse /> },
      { path: 'listing/:id', element: <ListingDetail /> },
      {
        path: 'account',
        element: <ProtectedRoute><Account /></ProtectedRoute>,
      },
      {
        path: 'orders',
        element: <ProtectedRoute><MyOrders /></ProtectedRoute>,
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
])

export const AppRoutes = () => <RouterProvider router={router} />
```

#### Navigation

**Link Component:**
```typescript
import { Link } from 'react-router-dom'

<Link to="/browse" className="text-blue-500">Browse Listings</Link>
<Link to={`/listing/${listing.id}`}>View Details</Link>
```

**Programmatic Navigation:**
```typescript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

const handleSubmit = () => {
  // ... save logic
  navigate('/account')
}
```

**Get Params:**
```typescript
import { useParams } from 'react-router-dom'

const { id } = useParams<{ id: string }>()
```

---

### Zustand

**Version:** 4.5+  
**Purpose:** Lightweight state management  
**Documentation:** https://github.com/pmndrs/zustand

#### Installation
```bash
pnpm add zustand
```

#### Store Example

**stores/authStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user, loading: false }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

#### Usage

```typescript
import { useAuthStore } from '@/stores/authStore'

const MyComponent = () => {
  const { user, setUser, logout } = useAuthStore()

  return (
    <div>
      {user ? (
        <>
          <p>Welcome, {user.displayName}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please login</p>
      )}
    </div>
  )
}
```

---

## Mobile Technologies

### React Native

**Version:** 0.72+  
**Purpose:** Native iOS app framework (Courier app)  
**Documentation:** https://reactnative.dev

#### Installation
```bash
npx react-native@latest init CourierApp --template react-native-template-typescript
```

#### Core Components

**View, Text, Image:**
```typescript
import { View, Text, Image, StyleSheet } from 'react-native'

export const JobCard = ({ job }: { job: Job }) => (
  <View style={styles.container}>
    <Image source={{ uri: job.imageUrl }} style={styles.image} />
    <Text style={styles.title}>{job.title}</Text>
    <Text style={styles.price}>${job.payout}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    color: '#10b981',
    marginTop: 4,
  },
})
```

**TouchableOpacity (Buttons):**
```typescript
import { TouchableOpacity, Text } from 'react-native'

<TouchableOpacity
  style={styles.button}
  onPress={() => acceptJob(job.id)}
  activeOpacity={0.7}
>
  <Text style={styles.buttonText}>Accept Job</Text>
</TouchableOpacity>
```

**FlatList (Lists):**
```typescript
import { FlatList } from 'react-native'

<FlatList
  data={jobs}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <JobCard job={item} />}
  contentContainerStyle={styles.list}
  refreshing={loading}
  onRefresh={refetch}
/>
```

#### Commands
```bash
pnpm ios                          # Run on iOS simulator
pnpm ios --device "iPhone Name"   # Run on physical device
pnpm android                      # Run on Android
pnpm start                        # Start Metro bundler
pnpm start --reset-cache          # Reset cache
```

---

### React Navigation

**Version:** 6.x  
**Purpose:** Navigation for React Native  
**Documentation:** https://reactnavigation.org

#### Installation
```bash
pnpm add @react-navigation/native @react-navigation/stack
pnpm add react-native-screens react-native-safe-area-context
cd ios && pod install && cd ..
```

#### Configuration

**navigation/RootNavigator.tsx:**
```typescript
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'

const Stack = createStackNavigator<RootStackParamList>()

export const RootNavigator = () => {
  const { user } = useAuthStore()

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="Earnings" component={EarningsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

#### Navigation

**Navigate to screen:**
```typescript
import { useNavigation } from '@react-navigation/native'

const navigation = useNavigation<RootStackNavigationProp>()

navigation.navigate('Earnings')
navigation.navigate('Profile', { userId: '123' })
navigation.goBack()
```

**Get params:**
```typescript
import { useRoute } from '@react-navigation/native'

const route = useRoute<ProfileRouteProp>()
const { userId } = route.params
```

---

### Capacitor

**Version:** 5.5+  
**Purpose:** Web-to-native wrapper (Marketplace iOS)  
**Documentation:** https://capacitorjs.com

#### Installation
```bash
pnpm add @capacitor/core @capacitor/cli
pnpm add @capacitor/ios
pnpm exec cap init
pnpm exec cap add ios
```

#### Configuration

**capacitor.config.ts:**
```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gosenderr.marketplace',
  appName: 'GoSenderr',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    Camera: {
      ios: {
        permissions: {
          camera: 'We need camera access to take photos of items',
        },
      },
    },
  },
}

export default config
```

#### Plugins

**Camera:**
```bash
pnpm add @capacitor/camera
```

```typescript
import { Camera, CameraResultType } from '@capacitor/camera'

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Uri,
  })
  return image.webPath
}
```

**Push Notifications:**
```bash
pnpm add @capacitor/push-notifications
```

```typescript
import { PushNotifications } from '@capacitor/push-notifications'

await PushNotifications.requestPermissions()
await PushNotifications.register()
```

#### Commands
```bash
pnpm build                    # Build web assets
pnpm exec cap sync ios        # Copy to iOS project
pnpm exec cap open ios        # Open Xcode
pnpm exec cap run ios         # Build and run
```

---

## Desktop Technologies

### Electron

**Version:** 28.0+  
**Purpose:** Cross-platform desktop app  
**Documentation:** https://www.electronjs.org

#### Installation
```bash
pnpm add -D electron electron-builder
```

#### Main Process

**electron/main.ts:**
```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

#### Preload Script

**electron/preload.ts:**
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  saveFile: (data: string) => ipcRenderer.invoke('save-file', data),
  openFile: () => ipcRenderer.invoke('open-file'),
})
```

#### Renderer Usage

```typescript
// In React component
declare global {
  interface Window {
    electron: {
      saveFile: (data: string) => Promise<void>
      openFile: () => Promise<string>
    }
  }
}

const exportData = async () => {
  await window.electron.saveFile(JSON.stringify(data))
}
```

---

### electron-builder

**Version:** 24.9+  
**Purpose:** Package and build Electron apps  
**Documentation:** https://www.electron.build

#### Configuration

**electron-builder.yml:**
```yaml
appId: com.gosenderr.admin
productName: GoSenderr Admin
copyright: Copyright © 2026 GoSenderr

directories:
  output: dist
  buildResources: build

files:
  - dist-electron
  - dist

mac:
  target:
    - dmg
  category: public.app-category.business
  icon: build/icon.icns

win:
  target:
    - nsis
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

#### Commands
```bash
pnpm build:mac          # Build macOS app
pnpm build:win          # Build Windows app
pnpm build:linux        # Build Linux app
```

---

## Backend Technologies

### Firebase

**Purpose:** Backend-as-a-Service platform  
**Documentation:** https://firebase.google.com/docs

#### SDK Versions
```json
{
  "firebase": "^10.7.0",
  "firebase-admin": "^13.6.0",
  "firebase-functions": "^5.0.0"
}
```

#### Installation

**Web/Capacitor:**
```bash
pnpm add firebase
```

**React Native:**
```bash
pnpm add @react-native-firebase/app
pnpm add @react-native-firebase/auth
pnpm add @react-native-firebase/firestore
cd ios && pod install && cd ..
```

**Cloud Functions:**
```bash
cd firebase/functions
pnpm add firebase-admin firebase-functions
```

#### Configuration

**lib/firebase.ts:**
```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
```

---

### Cloud Firestore

**Purpose:** NoSQL document database  
**Documentation:** https://firebase.google.com/docs/firestore

#### CRUD Operations

**Create:**
```typescript
import { collection, addDoc } from 'firebase/firestore'

const createListing = async (listing: Listing) => {
  const docRef = await addDoc(collection(db, 'listings'), {
    ...listing,
    createdAt: new Date(),
  })
  return docRef.id
}
```

**Read:**
```typescript
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

// Get single document
const getListing = async (id: string) => {
  const docSnap = await getDoc(doc(db, 'listings', id))
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
}

// Query multiple documents
const getListings = async (category: string) => {
  const q = query(
    collection(db, 'listings'),
    where('category', '==', category),
    where('status', '==', 'active')
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}
```

**Update:**
```typescript
import { doc, updateDoc } from 'firebase/firestore'

const updateListing = async (id: string, updates: Partial<Listing>) => {
  await updateDoc(doc(db, 'listings', id), {
    ...updates,
    updatedAt: new Date(),
  })
}
```

**Delete:**
```typescript
import { doc, deleteDoc } from 'firebase/firestore'

const deleteListing = async (id: string) => {
  await deleteDoc(doc(db, 'listings', id))
}
```

#### Real-time Listeners

```typescript
import { doc, onSnapshot } from 'firebase/firestore'

const listenToListing = (id: string, callback: (listing: Listing) => void) => {
  return onSnapshot(doc(db, 'listings', id), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Listing)
    }
  })
}

// Usage
useEffect(() => {
  const unsubscribe = listenToListing(listingId, setListing)
  return () => unsubscribe()
}, [listingId])
```

---

### Firebase Authentication

**Purpose:** User authentication  
**Documentation:** https://firebase.google.com/docs/auth

#### Email/Password Auth

```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

// Sign up
const signUp = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// Sign in
const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// Sign out
const logout = async () => {
  await signOut(auth)
}

// Auth state listener
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      setUser(user)
    } else {
      // User is signed out
      setUser(null)
    }
  })
  return () => unsubscribe()
}, [])
```

---

### Cloud Functions

**Purpose:** Serverless backend functions  
**Documentation:** https://firebase.google.com/docs/functions

#### Installation
```bash
cd firebase/functions
pnpm add firebase-admin firebase-functions
pnpm add -D typescript
```

#### Function Types

**HTTP Callable:**
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

export const createOrder = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  const { listingId, deliveryAddress } = data

  // Business logic
  const order = await admin.firestore().collection('orders').add({
    listingId,
    buyerId: context.auth.uid,
    deliveryAddress,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { orderId: order.id }
})
```

**Firestore Trigger:**
```typescript
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data()
    
    // Send notification
    await sendEmail(order.buyerId, 'Order Confirmed', 'Your order has been placed')
    
    // Create delivery job
    await admin.firestore().collection('jobs').add({
      orderId: context.params.orderId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })
```

**Scheduled Function:**
```typescript
export const dailyReport = functions.pubsub
  .schedule('every day 00:00')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    // Generate daily report
    const stats = await calculateDailyStats()
    await sendReportEmail(stats)
  })
```

#### Deployment
```bash
firebase deploy --only functions
firebase deploy --only functions:createOrder
```

---

## Maps & Location

### Mapbox

**Purpose:** Maps and location services  
**Documentation:** https://docs.mapbox.com

#### Versions
- **Mapbox GL JS:** v3 (Web/Capacitor)
- **React Native Mapbox:** @rnmapbox/maps v10+ (React Native)

#### Installation

**Web:**
```bash
pnpm add mapbox-gl
pnpm add -D @types/mapbox-gl
```

**React Native:**
```bash
pnpm add @rnmapbox/maps
cd ios && pod install && cd ..
```

#### Web Usage

```typescript
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

useEffect(() => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-73.98, 40.75],
    zoom: 12,
  })

  // Add marker
  new mapboxgl.Marker()
    .setLngLat([-73.98, 40.75])
    .addTo(map)

  return () => map.remove()
}, [])

return <div id="map" style={{ width: '100%', height: '100vh' }} />
```

#### React Native Usage

```typescript
import Mapbox from '@rnmapbox/maps'

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN)

export const MapScreen = () => (
  <View style={{ flex: 1 }}>
    <Mapbox.MapView style={{ flex: 1 }}>
      <Mapbox.Camera
        centerCoordinate={[-73.98, 40.75]}
        zoomLevel={12}
      />
      <Mapbox.PointAnnotation
        id="marker"
        coordinate={[-73.98, 40.75]}
      />
    </Mapbox.MapView>
  </View>
)
```

#### Directions API

```typescript
const getRoute = async (start: [number, number], end: [number, number]) => {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}`
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    geometries: 'geojson',
    overview: 'full',
  })

  const response = await fetch(`${url}?${params}`)
  const data = await response.json()
  
  return {
    route: data.routes[0].geometry,
    distance: data.routes[0].distance,
    duration: data.routes[0].duration,
  }
}
```

---

## Payments

### Stripe

**Version:** 14.x  
**Purpose:** Payment processing  
**Documentation:** https://stripe.com/docs

#### SDKs
```json
{
  "@stripe/stripe-js": "^2.4.0",
  "stripe": "^14.10.0"
}
```

#### Installation

**Frontend:**
```bash
pnpm add @stripe/stripe-js
```

**Backend (Cloud Functions):**
```bash
cd firebase/functions
pnpm add stripe
```

#### Frontend Setup

**lib/stripe.ts:**
```typescript
import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)
```

#### Payment Intent

**Create Payment Intent (Cloud Function):**
```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  const { amount, orderId } = data

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    metadata: {
      orderId,
      userId: context.auth.uid,
    },
  })

  return {
    clientSecret: paymentIntent.client_secret,
  }
})
```

**Process Payment (Frontend):**
```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const CheckoutForm = () => {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) return

    // Get client secret from Cloud Function
    const { clientSecret } = await createPaymentIntent({ amount: 50, orderId: 'order_123' })

    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    })

    if (error) {
      console.error(error.message)
    } else if (paymentIntent?.status === 'succeeded') {
      console.log('Payment successful!')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>Pay</button>
    </form>
  )
}
```

#### Stripe Connect

**Create Connect Account:**
```typescript
const createConnectAccount = async (userId: string) => {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: userEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      userId,
    },
  })

  // Save account ID to Firestore
  await admin.firestore().collection('users').doc(userId).update({
    stripeAccountId: account.id,
  })

  return account
}
```

**Create Account Link:**
```typescript
const createAccountLink = async (accountId: string) => {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: 'https://gosenderr.com/reauth',
    return_url: 'https://gosenderr.com/onboarding-complete',
    type: 'account_onboarding',
  })

  return accountLink.url
}
```

**Transfer to Connect Account:**
```typescript
const transferToSeller = async (orderId: string) => {
  const order = await admin.firestore().collection('orders').doc(orderId).get()
  const seller = await admin.firestore().collection('users').doc(order.data()!.sellerId).get()

  await stripe.transfers.create({
    amount: order.data()!.amount * 100,
    currency: 'usd',
    destination: seller.data()!.stripeAccountId,
    transfer_group: orderId,
  })
}
```

---

## Development Tools

### pnpm

**Version:** 8.15+  
**Purpose:** Fast, efficient package manager  
**Documentation:** https://pnpm.io

#### Installation
```bash
npm install -g pnpm@8.15.1
```

#### Common Commands
```bash
pnpm install              # Install dependencies
pnpm add <package>        # Add package
pnpm add -D <package>     # Add dev dependency
pnpm remove <package>     # Remove package
pnpm update               # Update all packages
pnpm list                 # List installed packages
pnpm why <package>        # Show why package is installed
```

#### Workspace Commands
```bash
pnpm --filter @gosenderr/admin-desktop dev
pnpm --filter @gosenderr/marketplace-app build
pnpm -r build             # Build all packages
```

---

### Turborepo

**Version:** 2.3+  
**Purpose:** High-performance build system  
**Documentation:** https://turbo.build

#### Configuration

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

#### Commands
```bash
turbo run build           # Build all apps
turbo run dev             # Run all dev servers
turbo run lint            # Lint all apps
turbo run build --filter=admin-desktop
```

---

## Common Commands

### Development

```bash
# Start all apps
pnpm dev

# Start specific app
pnpm dev:admin-desktop
pnpm dev:marketplace
pnpm dev:courier

# Install dependencies
pnpm install

# Add dependency to specific app
pnpm --filter @gosenderr/admin-desktop add <package>
```

### Building

```bash
# Build all
pnpm build

# Build specific app
pnpm build:admin-desktop
pnpm build:marketplace

# Preview production build
pnpm preview:marketplace
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific app tests
pnpm --filter @gosenderr/admin-desktop test

# Run tests in watch mode
pnpm test:watch
```

### Linting

```bash
# Lint all
pnpm lint

# Lint specific app
pnpm --filter @gosenderr/marketplace-app lint

# Fix linting issues
pnpm lint:fix
```

### Deployment

```bash
# Deploy marketplace
pnpm deploy:marketplace

# Deploy functions
pnpm deploy:functions

# Deploy all
pnpm deploy:all
```

### Firebase

```bash
# Login
firebase login

# Use project
firebase use gosenderr-6773f

# Start emulators
firebase emulators:start

# Deploy hosting
firebase deploy --only hosting:gosenderr-marketplace

# Deploy functions
firebase deploy --only functions

# View logs
firebase functions:log
```

---

## Best Practices

### TypeScript

✅ **DO:**
- Use strict mode
- Define interfaces for all data structures
- Use type guards for runtime checks
- Leverage utility types (Pick, Omit, Partial)

❌ **DON'T:**
- Use `any` type
- Ignore TypeScript errors
- Over-engineer with complex generic types

### React

✅ **DO:**
- Use functional components with hooks
- Memoize expensive calculations with `useMemo`
- Memoize callbacks with `useCallback`
- Use `React.memo` for expensive components
- Keep components small and focused

❌ **DON'T:**
- Use class components (unless necessary)
- Create deeply nested component trees
- Put business logic in components
- Forget to cleanup effects

### State Management

✅ **DO:**
- Use Zustand for global state
- Use React state for component-local state
- Persist auth state
- Use selectors to prevent re-renders

❌ **DON'T:**
- Put everything in global state
- Mutate state directly
- Over-complicate with Redux for simple apps

### Firestore

✅ **DO:**
- Use composite indexes for complex queries
- Batch writes when possible
- Denormalize data for read performance
- Paginate large collections
- Use real-time listeners sparingly

❌ **DON'T:**
- Query without indexes
- Nest collections too deeply (max 2-3 levels)
- Store large files in Firestore (use Storage)
- Perform client-side joins

### Security

✅ **DO:**
- Validate all user inputs
- Use Firestore security rules
- Sanitize data before display
- Use HTTPS only
- Enable CORS appropriately

❌ **DON'T:**
- Trust client-side validation
- Expose API keys in client code
- Store sensitive data in localStorage
- Use eval() or dangerouslySetInnerHTML

---

## 🔗 Quick Links

### Official Documentation
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org
- Vite: https://vitejs.dev
- React Native: https://reactnative.dev
- Electron: https://www.electronjs.org
- Capacitor: https://capacitorjs.com
- Firebase: https://firebase.google.com/docs
- Mapbox: https://docs.mapbox.com
- Stripe: https://stripe.com/docs

### Tools
- pnpm: https://pnpm.io
- Turborepo: https://turbo.build
- Tailwind CSS: https://tailwindcss.com
- React Router: https://reactrouter.com
- React Navigation: https://reactnavigation.org
- Zustand: https://github.com/pmndrs/zustand

### Communities
- React Discord: https://discord.gg/react
- Firebase Discord: https://discord.gg/firebase
- React Native: https://reactnative.dev

---

**Last Updated:** January 2026  
**Maintained by:** GoSenderr Development Team

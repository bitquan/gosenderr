# GoSenderr v2 - System Architecture

**Last Updated:** January 2026  
**Document Status:** Planning Phase

---

## 🏗️ Architecture Overview

GoSenderr v2 is a modern, cloud-native delivery platform built on Firebase with three distinct client applications. The system uses a shared backend infrastructure with role-based access control.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
├──────────────────┬──────────────────┬────────────────────────┤
│  Admin Desktop   │  Marketplace     │   Courier iOS          │
│   (Electron)     │  (Web + iOS)     │  (React Native)        │
│                  │                  │                        │
│  • macOS         │  • Web Browser   │  • Native iOS          │
│  • Windows       │  • iOS (Cap)     │  • iPhone/iPad         │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │      Firebase Backend Services       │
         ├─────────────────────────────────────┤
         │  • Authentication (Phone + Email)    │
         │  • Cloud Firestore (Database)        │
         │  • Cloud Storage (Photos)            │
         │  • Cloud Functions (Business Logic)  │
         │  • Firebase Hosting (Web Apps)       │
         └─────────────────┬────────────────────┘
                           │
         ┌─────────────────▼────────────────────┐
         │      External Services               │
         ├──────────────────────────────────────┤
         │  • Mapbox (Maps & Navigation)        │
         │  • Stripe (Payments & Payouts)       │
         │  • SendGrid (Email Notifications)    │
         └──────────────────────────────────────┘
```

---

## 🛠️ Tech Stack Breakdown

### Frontend Technologies

#### Admin Desktop App
**Framework:** Electron 28+
- **Renderer Process:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS
- **Packaging:** electron-builder
- **Auto-Update:** electron-updater (optional)

**Platform Support:**
- macOS 11+ (Big Sur and later)
- Windows 10/11

**Key Libraries:**
```json
{
  "electron": "^28.0.0",
  "electron-builder": "^24.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router-dom": "^6.20.0",
  "typescript": "^5.3.0",
  "vite": "^6.0.0",
  "tailwindcss": "^3.4.0"
}
```

---

#### Marketplace App (Web)
**Framework:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **State Management:** React Context + Hooks
- **Forms:** React Hook Form
- **HTTP Client:** Firebase SDK

**Browser Support:**
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

**Key Libraries:**
```json
{
  "react": "^19.0.0",
  "react-router-dom": "^6.20.0",
  "typescript": "^5.3.0",
  "vite": "^6.0.0",
  "tailwindcss": "^3.4.0",
  "firebase": "^10.7.0",
  "react-hook-form": "^7.48.0",
  "mapbox-gl": "^3.1.0"
}
```

---

#### Marketplace App (iOS)
**Framework:** Capacitor 5+
- **Native Runtime:** Capacitor wraps web app
- **Native Plugins:**
  - `@capacitor/camera` - Photo capture
  - `@capacitor/push-notifications` - Push alerts
  - `@capacitor/haptics` - Touch feedback
  - `@capacitor/status-bar` - Status bar styling
  - `@capacitor/splash-screen` - Launch screen

**iOS Requirements:**
- iOS 14.0+ minimum
- Swift 5.0+ for native plugins
- Xcode 14+ for builds

**Key Configuration:**
```json
{
  "@capacitor/core": "^5.5.0",
  "@capacitor/ios": "^5.5.0",
  "@capacitor/camera": "^5.0.0",
  "@capacitor/push-notifications": "^5.0.0"
}
```

---

#### Courier iOS App
**Framework:** React Native 0.73+
- **Language:** TypeScript
- **Navigation:** React Navigation 6
- **Maps:** Mapbox GL Native SDK
- **Camera:** React Native Camera
- **State Management:** Zustand

**Native Modules:**
```json
{
  "react-native": "^0.73.0",
  "@react-navigation/native": "^6.1.0",
  "@rnmapbox/maps": "^10.1.0",
  "react-native-camera": "^4.2.1",
  "react-native-geolocation-service": "^5.3.1",
  "zustand": "^4.4.0"
}
```

**iOS Requirements:**
- iOS 14.0+ minimum
- CocoaPods for dependency management
- Mapbox iOS SDK included

---

### Backend Technologies

#### Firebase Services

**Firebase Authentication**
- Phone Authentication (primary)
- Email/Password Authentication (fallback)
- Custom claims for role-based access
- Session management with token refresh

**Cloud Firestore**
- NoSQL document database
- Real-time subscriptions
- Offline persistence (mobile apps)
- Composite indexes for queries
- Security rules for access control

**Cloud Storage**
- Photo uploads (package photos, proof of delivery)
- Path: `/jobs/{jobId}/photos/{photoId}`
- 10MB max file size
- Image optimization on upload
- Signed URLs for secure access

**Cloud Functions (Node.js 20)**
- HTTP triggers for API endpoints
- Firestore triggers for data events
- Scheduled functions (cron jobs)
- Authentication triggers
- TypeScript for type safety

**Firebase Hosting**
- CDN-backed static hosting
- Multi-site configuration:
  - `gosenderr-marketplace` (marketplace web app)
  - `gosenderr-6773f` (landing page)
- Custom domain support
- SSL/TLS certificates (automatic)

---

### Maps & Location

#### Mapbox
**Web (Mapbox GL JS 3.x):**
```javascript
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [lng, lat],
  zoom: 12
});
```

**iOS Native (Mapbox GL Native):**
```typescript
import Mapbox from '@rnmapbox/maps';

<Mapbox.MapView 
  style={{ flex: 1 }}
  styleURL={Mapbox.StyleURL.Street}
/>
```

**Features Used:**
- Geocoding API (address search)
- Directions API (turn-by-turn navigation)
- Static Maps API (job preview images)
- Marker clustering
- Custom map styles

---

### Payment Processing

#### Stripe

**Stripe Checkout (Marketplace Payments):**
- Customer purchases items
- One-time payment flow
- PCI-compliant (Stripe handles cards)
- Webhook for payment confirmation

**Stripe Connect (Courier Payouts):**
- Couriers as Connected Accounts
- Express account type (simplified onboarding)
- Automated payouts on job completion
- Platform fee deduction

**Cloud Functions Integration:**
```typescript
// Create payment intent
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: data.amount,
    currency: 'usd',
    customer: data.customerId,
    metadata: { orderId: data.orderId }
  });
  return { clientSecret: paymentIntent.client_secret };
});
```

---

## 🗄️ Data Flow Architecture

### Job Creation Flow (Marketplace Order)

```
User (Web/iOS)
    │
    ├─ 1. User creates listing
    │     │
    │     ▼
    │  Cloud Function: validateListing()
    │     │
    │     ├─ Check user authentication
    │     ├─ Validate listing data
    │     ├─ Upload photos to Storage
    │     │
    │     ▼
    │  Firestore: /marketplaceItems/{itemId}
    │
    ├─ 2. Buyer purchases item
    │     │
    │     ▼
    │  Cloud Function: createOrder()
    │     │
    │     ├─ Create Stripe payment intent
    │     ├─ Create order document
    │     ├─ Update item stock
    │     │
    │     ▼
    │  Firestore: /orders/{orderId}
    │     │
    │     ▼
    │  Stripe: Process payment
    │     │
    │     ├─ Success → Webhook
    │     │     │
    │     │     ▼
    │     │  Cloud Function: onPaymentSuccess()
    │     │     │
    │     │     ├─ Update order status
    │     │     ├─ Create delivery job
    │     │     │
    │     │     ▼
    │     │  Firestore: /jobs/{jobId}
    │     │
    │     └─ Failure → Update order status
    │
    └─ 3. Real-time updates to clients
          │
          ▼
       Firestore Snapshot Listeners
```

---

### Courier Job Acceptance Flow

```
Courier (iOS App)
    │
    ├─ 1. View available jobs on map
    │     │
    │     ▼
    │  Firestore Query: 
    │  /jobs WHERE status='open' AND geohash IN [nearby]
    │     │
    │     └─ Real-time listener updates markers
    │
    ├─ 2. Courier taps job pin
    │     │
    │     ▼
    │  Display floating job card with details
    │
    ├─ 3. Courier taps "Accept"
    │     │
    │     ▼
    │  Cloud Function: claimJob()
    │     │
    │     ├─ Atomic transaction:
    │     │   • Check job still open
    │     │   • Assign to courier
    │     │   • Update status to 'assigned'
    │     │   • Record acceptedAt timestamp
    │     │
    │     ▼
    │  Firestore: /jobs/{jobId}
    │     │
    │     └─ Send push notification to customer
    │
    └─ 4. Start delivery flow
          │
          ├─ Real-time location updates
          │     │
          │     ▼
          │  Firestore: /jobs/{jobId}/courierLocation
          │
          ├─ Status progression (Firestore updates)
          │     • assigned → enroute_pickup
          │     • enroute_pickup → arrived_pickup
          │     • arrived_pickup → picked_up
          │     • picked_up → enroute_dropoff
          │     • enroute_dropoff → arrived_dropoff
          │     • arrived_dropoff → completed
          │
          └─ On completion:
                │
                ▼
             Cloud Function: completeDelivery()
                │
                ├─ Upload proof photo to Storage
                ├─ Calculate courier payout
                ├─ Create payout record
                │
                ▼
             Firestore: /payouts/{payoutId}
```

---

## 🔐 Authentication Flow

### Initial Setup
```
User Opens App
    │
    ├─ Check for existing session
    │     │
    │     ├─ Yes: Firebase Auth token valid?
    │     │     │
    │     │     ├─ Yes: Load user data → Dashboard
    │     │     └─ No: Refresh token → Dashboard or Login
    │     │
    │     └─ No: Show Login Screen
    │
    └─ Login Screen
          │
          ├─ Phone Auth (Primary)
          │     │
          │     ├─ Enter phone number
          │     ├─ Firebase sends SMS code
          │     ├─ Enter verification code
          │     ├─ Firebase validates code
          │     │
          │     ▼
          │  onAuthStateChanged() triggered
          │     │
          │     ├─ Check /users/{uid}
          │     │     │
          │     │     ├─ Exists: Load roles → Dashboard
          │     │     └─ New: Create user doc with default role
          │     │
          │     └─ Set custom claims (roles)
          │
          └─ Email Auth (Fallback)
                │
                └─ Same flow as phone auth
```

---

## 📂 File Storage Strategy

### Storage Bucket Structure
```
gs://gosenderr-6773f.appspot.com/
├── jobs/
│   ├── {jobId}/
│   │   ├── photos/
│   │   │   ├── package_001.jpg       # Customer upload
│   │   │   ├── package_002.jpg
│   │   │   └── package_003.jpg
│   │   └── proof/
│   │       ├── pickup_photo.jpg      # Courier upload
│   │       └── dropoff_photo.jpg
│   └── temp_{timestamp}/             # Temporary uploads
│       └── photos/
│           └── temp_001.jpg
├── marketplace/
│   └── {itemId}/
│       └── images/
│           ├── main.jpg              # Primary listing photo
│           ├── img_001.jpg           # Additional photos
│           ├── img_002.jpg
│           └── img_003.jpg
└── users/
    └── {uid}/
        ├── profile/
        │   └── avatar.jpg
        └── documents/
            ├── drivers_license.jpg   # Courier verification
            └── insurance.pdf
```

### Storage Rules Summary
```javascript
// Storage security rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Job photos
    match /jobs/{jobId}/photos/{photoFile} {
      allow read: if isAuthenticated() && canAccessJob(jobId);
      allow write: if isAuthenticated() && isJobCreator(jobId);
    }
    
    // Delivery proof photos
    match /jobs/{jobId}/proof/{photoFile} {
      allow read: if isAuthenticated() && canAccessJob(jobId);
      allow write: if isAuthenticated() && isAssignedCourier(jobId);
    }
    
    // Marketplace item images
    match /marketplace/{itemId}/images/{imageFile} {
      allow read: if true; // Public read
      allow write: if isAuthenticated() && isSeller(itemId);
    }
    
    // User files
    match /users/{userId}/{allPaths=**} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow write: if isAuthenticated() && isOwner(userId);
    }
  }
}
```

---

## 🔄 Real-Time Data Synchronization

### Firestore Real-Time Listeners

**Customer App: Order Tracking**
```typescript
const unsubscribe = onSnapshot(
  doc(db, 'orders', orderId),
  (snapshot) => {
    const order = snapshot.data();
    updateUI(order);
  }
);
```

**Courier App: Job Updates**
```typescript
const unsubscribe = onSnapshot(
  query(
    collection(db, 'jobs'),
    where('status', '==', 'open'),
    where('geohash', 'array-contains-any', nearbyGeohashes)
  ),
  (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateMapMarkers(jobs);
  }
);
```

**Admin App: Platform Monitoring**
```typescript
const unsubscribe = onSnapshot(
  collection(db, 'jobs'),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        addJobToList(change.doc.data());
      } else if (change.type === 'modified') {
        updateJobInList(change.doc.data());
      }
    });
  }
);
```

---

## 🌐 API Endpoints (Cloud Functions)

### HTTP Endpoints

**Base URL:** `https://us-central1-gosenderr-6773f.cloudfunctions.net`

```
POST   /createOrder              # Create marketplace order
POST   /claimJob                 # Courier claims delivery job
POST   /updateJobStatus          # Update job progress
POST   /completeDelivery         # Mark job complete, trigger payout
POST   /uploadJobPhoto           # Upload delivery proof photo
POST   /createPaymentIntent      # Stripe payment intent
POST   /createPayout             # Process courier payout
POST   /sendNotification         # Push notification
GET    /getEarnings              # Get courier earnings
```

### Callable Functions (Firebase SDK)
```typescript
import { httpsCallable } from 'firebase/functions';

const claimJob = httpsCallable(functions, 'claimJob');
const result = await claimJob({ jobId: 'job_123' });
```

---

## 📊 System Diagram (Text-Based)

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                         │
├────────────────┬─────────────────────┬───────────────────────────┤
│                │                     │                           │
│  Admin Desktop │  Marketplace App    │    Courier iOS App        │
│   (Electron)   │   (React/Capacitor) │   (React Native)          │
│                │                     │                           │
│  • User Mgmt   │  • Browse Items     │  • Map Shell              │
│  • Orders      │  • Buy/Sell         │  • Job Acceptance         │
│  • Analytics   │  • Messaging        │  • Navigation             │
│  • Disputes    │  • Ratings          │  • Photo Capture          │
│                │                     │                           │
└───────┬────────┴──────────┬──────────┴─────────┬─────────────────┘
        │                   │                    │
        │                   │                    │
┌───────▼───────────────────▼────────────────────▼─────────────────┐
│                   APPLICATION LAYER                               │
├───────────────────────────────────────────────────────────────────┤
│                    Firebase Cloud Functions                       │
│                                                                   │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Order Logic    │  │ Job Logic    │  │ Payment Logic       │  │
│  │                │  │              │  │                     │  │
│  │ • createOrder  │  │ • claimJob   │  │ • createPayment     │  │
│  │ • updateOrder  │  │ • updateJob  │  │ • createPayout      │  │
│  │ • cancelOrder  │  │ • completeJob│  │ • processWebhook    │  │
│  └────────────────┘  └──────────────┘  └────────────────────┘  │
│                                                                   │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ User Logic     │  │ Notification │  │ Analytics           │  │
│  │                │  │              │  │                     │  │
│  │ • createUser   │  │ • sendPush   │  │ • aggregateStats    │  │
│  │ • updateRole   │  │ • sendEmail  │  │ • generateReports   │  │
│  │ • verifyDoc    │  │ • sendSMS    │  │ • trackMetrics      │  │
│  └────────────────┘  └──────────────┘  └────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                       DATA LAYER                                  │
├────────────────────────┬──────────────────────────────────────────┤
│                        │                                          │
│  Cloud Firestore       │         Cloud Storage                    │
│                        │                                          │
│  Collections:          │  Buckets:                                │
│  • users               │  • jobs/{jobId}/photos/*                 │
│  • marketplaceItems    │  • marketplace/{itemId}/images/*         │
│  • orders              │  • users/{uid}/documents/*               │
│  • jobs                │                                          │
│  • payouts             │                                          │
│  • messages            │                                          │
│  • ratings             │                                          │
│                        │                                          │
└────────────────────────┴──────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES LAYER                         │
├──────────────────┬─────────────────────┬──────────────────────────┤
│                  │                     │                          │
│  Mapbox          │    Stripe           │    SendGrid              │
│                  │                     │                          │
│  • Geocoding     │  • Payments         │  • Email                 │
│  • Directions    │  • Connect          │  • Transactional         │
│  • Static Maps   │  • Webhooks         │  • Marketing             │
│                  │                     │                          │
└──────────────────┴─────────────────────┴──────────────────────────┘
```

---

## 🔧 Development Environment

### Local Development Stack
```
┌─────────────────────────────────────────┐
│         Developer Machine               │
├─────────────────────────────────────────┤
│                                         │
│  Node.js 20+                            │
│  pnpm 8+ (package manager)              │
│  Firebase CLI                           │
│  Firebase Emulators:                    │
│    • Auth Emulator (9099)               │
│    • Firestore Emulator (8080)          │
│    • Functions Emulator (5001)          │
│    • Storage Emulator (9199)            │
│                                         │
│  Dev Servers:                           │
│    • Admin Desktop: 5176                │
│    • Marketplace Web: 5173              │
│    • Courier iOS Simulator: Metro       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🚀 Production Infrastructure

### Hosting Configuration
```
Firebase Project: gosenderr-6773f
├── Hosting Sites:
│   ├── gosenderr-marketplace (Marketplace web app)
│   └── gosenderr-6773f (Landing page)
│
├── Cloud Functions: us-central1
│   └── Runtime: Node.js 20
│
├── Firestore: (default)
│   └── Location: us-central
│
└── Storage: (default)
    └── Location: us-central1
```

---

## 📈 Scalability Considerations

### Current Limits
- **Firestore:** 1 million document reads/day (free tier)
- **Cloud Functions:** 2 million invocations/month (free tier)
- **Storage:** 5 GB stored, 1 GB/day downloaded (free tier)

### Scaling Strategy
1. **Phase 1-2:** Operate on free tier (< 1000 users)
2. **Phase 3:** Move to Blaze plan (pay-as-you-go)
3. **Growth:** Optimize queries, implement caching
4. **Scale:** Consider Cloud Run for Functions, CDN for assets

---

*This architecture is designed for scalability, maintainability, and performance. Update as system evolves.*

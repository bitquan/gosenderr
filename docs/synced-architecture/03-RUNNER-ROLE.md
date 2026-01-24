# Runner Role (Package Runner / Shifter) - Synced Architecture Documentation

## Role Identity
- **Icon:** 🚚
- **Display Name:** Runner / Shifter / Package Runner
- **Color:** Orange (#F97316)
- **Tagline:** "Shift Packages. Shift Income."
- **Purpose:** Transport packages on long-haul routes (50-200+ miles) between distribution hubs
- **Role in System:** Interstate logistics backbone, connects hub network for package shipping

---

## User Document Structure (Firestore: `users/{uid}`)

```typescript
interface RunnerUser {
  uid: string
  email: string
  displayName?: string
  role: 'package_runner'
  
  packageRunnerProfile: {
    // Application Status
    status: 'pending_review' | 'approved' | 'rejected' | 'suspended'
    applicationSubmittedAt?: Timestamp
    approvedAt?: Timestamp
    approvedBy?: string  // Admin UID
    rejectedAt?: Timestamp
    rejectedBy?: string  // Admin UID
    rejectionReason?: string
    
    // Contact
    phone: string  // Required
    
    // Vehicle Information
    vehicleType: 'cargo_van' | 'sprinter' | 'box_truck'
    vehicleCapacity: number  // cubic feet
    maxWeight: number  // lbs
    vehicleDetails: {
      year: string
      make: string
      model: string
      licensePlate: string
      vin: string
    }
    vehiclePhotoUrl?: string
    
    // Driver Credentials
    driverLicenseInfo: {
      number: string
      state: string
      expirationDate: string
      photoUrl: string
    }
    
    // Commercial Requirements
    dotNumber?: string  // DOT number (if applicable)
    mcNumber?: string   // MC number (if interstate)
    
    commercialInsurance: {
      provider: string
      policyNumber: string
      coverage: number  // dollars (min $100,000)
      expirationDate: string
      certificateUrl: string
      verified: boolean
    }
    
    // Home Hub & Preferred Routes
    homeHub: {
      hubId: string
      name: string
      location: { lat: number, lng: number }
    }
    preferredRoutes: Array<{
      originHubId: string
      destinationHubId: string
      name: string  // "SF → LA"
    }>
    
    // Statistics (auto-updated by Cloud Functions)
    totalRuns: number
    completedRuns: number
    totalPackages: number
    totalMiles: number
    totalEarnings: number  // cents
    averageRating: number
    onTimePercentage: number  // 0-100
    
    // Availability
    currentRouteId?: string
    availableForRuns: boolean
    
    // Stripe Connect
    stripeConnectAccountId?: string
    stripeAccountVerified: boolean
    payoutsEnabled: boolean
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Custom Claim:** `packageRunner: true` (set by Cloud Function after approval)

---

## Core Collections & Runner Interactions

### 1. Long Haul Routes Collection (`longHaulRoutes/{routeId}`)
**Created by:** Cloud Function `buildLongHaulRoutes` (runs nightly)  
**Claimed by:** Runner  
**Managed by:** Admin

```typescript
interface LongHaulRoute {
  routeId: string
  type: 'long_haul'
  status: 'available' | 'claimed' | 'in_progress' | 'completed' | 'cancelled'
  
  runnerId?: string  // Assigned runner
  claimedAt?: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
  
  // Hub-to-Hub Route
  originHub: {
    hubId: string
    name: string
    location: { lat: number, lng: number }
    timezone: string
  }
  destinationHub: {
    hubId: string
    name: string
    location: { lat: number, lng: number }
    timezone: string
  }
  
  distance: number  // miles
  estimatedDuration: number  // minutes
  
  // Schedule
  frequency: 'daily' | 'on_demand'
  scheduledDeparture: Timestamp
  scheduledArrival: Timestamp
  
  // Packages on Route
  packageIds: string[]
  packageCount: number
  totalWeight: number  // lbs
  totalVolume: number  // cubic feet
  
  // Stops (optional, usually just origin → destination)
  stops?: Array<{
    hubId: string
    sequence: number
    location: { lat: number, lng: number }
    arrivalTime?: Timestamp
    departureTime?: Timestamp
    packagesDropped: number
    packagesPickedUp: number
    completed: boolean
  }>
  
  // Pricing
  pricing: {
    runnerEarnings: number  // cents
    platformFees: number
    totalCustomerPaid: number  // Sum from all packages
  }
  
  // Requirements
  vehicleTypeRequired: 'cargo_van' | 'sprinter' | 'box_truck'
  minCapacity: number  // cubic feet
  minWeightCapacity: number  // lbs
  
  createdAt: Timestamp
}
```

**Runner Operations:**
- **Discover:** Filter by `status: 'available'`, `homeHub`, vehicle match
- **Claim:** Transaction to set `runnerId`, `status: 'claimed'`
- **Start:** Update `status: 'in_progress'`, `startedAt`
- **Complete:** Deliver all packages, proof of delivery, `status: 'completed'`

---

### 2. Packages Collection (Runner's View: `packages/{packageId}`)
**Assigned to Routes by:** Cloud Function `buildLongHaulRoutes`

```typescript
// Runner-relevant package fields
interface PackageForRunner {
  packageId: string
  trackingNumber: string
  
  // Journey tracking
  journey: Array<{
    type: 'pickup' | 'hub_transfer' | 'long_haul' | 'last_mile'
    status: 'pending' | 'in_progress' | 'completed'
    fromHub?: string
    toHub?: string
    routeId?: string  // Long haul route ID
    runnerId?: string  // Runner UID
    timestamp?: Timestamp
  }>
  
  // Current location
  currentStatus: 'at_origin_hub' | 'in_transit' | 'at_destination_hub'
  currentHubId?: string
  
  // Package details
  packageDetails: {
    weight: number
    dimensions: { length, width, height }
    volume: number
    description: string
  }
  
  // Handling instructions
  specialInstructions?: string
  fragile: boolean
  requiresSignature: boolean
}
```

**Runner Updates Package:**
- When claiming route → journey leg `routeId` set
- When starting route → journey leg `status: 'in_progress'`
- When delivering to hub → journey leg `status: 'completed'`, upload proof
- Package `currentStatus` updates → `in_transit` → `at_destination_hub`

---

### 3. Hubs Collection (`hubs/{hubId}`)
**Created by:** Admin or Cloud Function `seedHubs`  
**Used by:** Runners for route planning and package handoffs

```typescript
interface Hub {
  hubId: string
  name: string  // "San Francisco Hub"
  code: string  // "SFO"
  
  type: 'origin' | 'destination' | 'transfer'
  
  location: {
    lat: number
    lng: number
    address: string
    city: string
    state: string
    zip: string
  }
  
  timezone: string  // "America/Los_Angeles"
  
  // Operating hours
  operatingHours: {
    monday: { open: string, close: string }
    tuesday: { open: string, close: string }
    // ... rest of week
  }
  
  // Contact
  contactPhone?: string
  contactEmail?: string
  
  // Capacity
  storageCapacity: number  // packages
  loadingDocks: number
  
  // Stats
  packagesProcessed: number
  activePackages: number
  
  // Status
  isActive: boolean
  
  createdAt: Timestamp
}
```

**Runner Interactions with Hubs:**
1. **Pickup from Origin Hub:**
   - Arrive at hub
   - Scan packages assigned to route
   - Load vehicle
   - Confirm departure

2. **Delivery to Destination Hub:**
   - Arrive at hub
   - Unload packages
   - Scan packages
   - Upload proof of delivery (photo of manifests)
   - Confirm arrival

3. **Transfer Stop (optional):**
   - Drop some packages
   - Pick up additional packages
   - Update route progress

---

## Firestore Security Rules

```javascript
// ==========================================
// RUNNER ROLE SECURITY RULES
// ==========================================

// Long Haul Routes: Runner can read and claim
match /longHaulRoutes/{routeId} {
  // Read available routes or own routes
  allow read: if resource.data.status == 'available'
              || request.auth.uid == resource.data.runnerId
              || isAdmin();
  
  // Claim available route (must have custom claim)
  allow update: if request.auth.uid == request.resource.data.runnerId
                && resource.data.status == 'available'
                && request.resource.data.status == 'claimed'
                && request.auth.token.packageRunner == true
                && runnerMeetsRequirements(request.auth.uid, resource.data);
  
  // Update route progress
  allow update: if request.auth.uid == resource.data.runnerId
                && isValidRouteProgressUpdate(resource, request.resource);
}

// Packages: Runner can read assigned packages
match /packages/{packageId} {
  allow read: if request.auth.uid == runnerAssignedToPackage(packageId)
              || request.auth.uid == resource.data.senderId
              || request.auth.uid == resource.data.recipientId
              || isAdmin();
  
  // Runner can update journey progress
  allow update: if request.auth.uid == runnerAssignedToPackage(packageId)
                && isValidJourneyUpdate(resource, request.resource);
}

// Hubs: Anyone can read (for route planning)
match /hubs/{hubId} {
  allow read: if request.auth != null;
  
  // Only admin can modify
  allow write: if isAdmin();
}

// Runner Profile: Can read own, update certain fields
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  
  // Update availability toggle
  allow update: if request.auth.uid == userId
                && hasOnlyChangedField('packageRunnerProfile.availableForRuns')
                && request.resource.data.packageRunnerProfile.status == 'approved';
  
  // Update current route
  allow update: if request.auth.uid == userId
                && hasOnlyChangedField('packageRunnerProfile.currentRouteId');
}

// Helper Functions
function runnerMeetsRequirements(runnerUid, routeData) {
  let runner = get(/databases/$(database)/documents/users/$(runnerUid)).data;
  let profile = runner.packageRunnerProfile;
  
  return profile.status == 'approved'
      && profile.availableForRuns == true
      && vehicleTypeMatches(profile.vehicleType, routeData.vehicleTypeRequired)
      && profile.vehicleCapacity >= routeData.minCapacity
      && profile.maxWeight >= routeData.minWeightCapacity
      && insuranceIsValid(profile.commercialInsurance);
}

function vehicleTypeMatches(runnerVehicle, requiredVehicle) {
  // box_truck can handle sprinter and cargo_van routes
  // sprinter can handle cargo_van routes
  return (requiredVehicle == 'cargo_van')
      || (requiredVehicle == 'sprinter' && runnerVehicle in ['sprinter', 'box_truck'])
      || (requiredVehicle == 'box_truck' && runnerVehicle == 'box_truck');
}

function insuranceIsValid(insurance) {
  let today = request.time;
  let expirationDate = timestamp.date(insurance.expirationDate);
  return insurance.verified == true
      && insurance.coverage >= 100000
      && expirationDate > today;
}

function runnerAssignedToPackage(packageId) {
  let pkg = get(/databases/$(database)/documents/packages/$(packageId)).data;
  let longHaulLeg = pkg.journey[1];  // Simplified: assumes journey[1] is long haul
  return longHaulLeg.runnerId;
}
```

---

## Cloud Functions Integration

### 1. `buildLongHaulRoutes` (Scheduled Function)
**Schedule:** Daily at midnight UTC  
**Purpose:** Batch packages by hub pairs, create runner routes

```typescript
exports.buildLongHaulRoutes = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting long haul route building process')
    
    // Query packages eligible for long haul routing
    const snapshot = await db.collection('packages')
      .where('currentStatus', 'in', ['pickup_pending', 'at_origin_hub'])
      .get()
    
    if (snapshot.empty) {
      console.log('No packages found for long haul route building')
      return { success: true, routesCreated: 0 }
    }
    
    const packages = snapshot.docs.map(doc => ({
      ...doc.data(),
      packageId: doc.id
    }))
    
    console.log(`Found ${packages.length} packages eligible for long haul routing`)
    
    // Group packages by origin/destination hub pairs
    const hubPairMap = new Map()
    
    for (const pkg of packages) {
      const key = `${pkg.origin.hubId}-${pkg.destination.hubId}`
      
      if (!hubPairMap.has(key)) {
        hubPairMap.set(key, {
          originHubId: pkg.origin.hubId,
          destinationHubId: pkg.destination.hubId,
          packages: []
        })
      }
      
      hubPairMap.get(key).packages.push(pkg)
    }
    
    console.log(`Grouped into ${hubPairMap.size} hub pairs`)
    
    // Filter hub pairs with 15+ packages and create routes
    const batch = db.batch()
    const routesCreated = []
    
    for (const [key, hubPair] of hubPairMap.entries()) {
      // Only create route if 15+ packages
      if (hubPair.packages.length < 15) {
        console.log(`Skipping hub pair ${key}: only ${hubPair.packages.length} packages (need 15+)`)
        continue
      }
      
      console.log(`Creating route for hub pair ${key} with ${hubPair.packages.length} packages`)
      
      // Fetch hub details
      const [originHubSnap, destHubSnap] = await Promise.all([
        db.collection('hubs').doc(hubPair.originHubId).get(),
        db.collection('hubs').doc(hubPair.destinationHubId).get()
      ])
      
      if (!originHubSnap.exists || !destHubSnap.exists) {
        console.error(`Hub not found for pair ${key}`)
        continue
      }
      
      const originHub = originHubSnap.data()
      const destinationHub = destHubSnap.data()
      
      // Calculate route metrics
      const distance = calculateDistance(
        { lat: originHub.location.lat, lng: originHub.location.lng },
        { lat: destinationHub.location.lat, lng: destinationHub.location.lng }
      )
      
      const estimatedDurationMinutes = Math.round((distance / 60) * 60)  // 60 mph average
      
      // Calculate weights and volumes
      const totalWeight = hubPair.packages.reduce((sum, pkg) => sum + pkg.weight, 0)
      const totalVolume = hubPair.packages.reduce((sum, pkg) => sum + pkg.volume, 0)
      
      // Determine vehicle required
      let vehicleTypeRequired = 'cargo_van'
      if (totalVolume > 600 || totalWeight > 2000) {
        vehicleTypeRequired = 'box_truck'
      } else if (totalVolume > 300 || totalWeight > 1000) {
        vehicleTypeRequired = 'sprinter'
      }
      
      // Calculate runner earnings
      // Formula: $50 base + max($1.00/mi × distance, $1.50/pkg × packageCount)
      const distanceEarnings = distance * 100  // $1.00/mi in cents
      const packageEarnings = hubPair.packages.length * 150  // $1.50/pkg in cents
      const runnerEarnings = 5000 + Math.max(distanceEarnings, packageEarnings)
      
      // Platform fees from package pricing
      const platformFees = hubPair.packages.reduce(
        (sum, pkg) => sum + pkg.pricing.breakdown.platformFee,
        0
      )
      const totalCustomerPaid = hubPair.packages.reduce(
        (sum, pkg) => sum + pkg.pricing.totalCustomerPaid,
        0
      )
      
      // Calculate schedule (tomorrow morning departure)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(8, 0, 0, 0)  // 8 AM departure
      
      const scheduledDeparture = admin.firestore.Timestamp.fromDate(tomorrow)
      const arrivalTime = new Date(tomorrow.getTime() + estimatedDurationMinutes * 60000)
      const scheduledArrival = admin.firestore.Timestamp.fromDate(arrivalTime)
      
      // Create route document
      const routeId = db.collection('longHaulRoutes').doc().id
      const routeDoc = {
        routeId,
        type: 'long_haul',
        status: 'available',
        
        originHub: {
          hubId: originHub.hubId,
          name: originHub.name,
          location: originHub.location,
          timezone: originHub.timezone
        },
        destinationHub: {
          hubId: destinationHub.hubId,
          name: destinationHub.name,
          location: destinationHub.location,
          timezone: destinationHub.timezone
        },
        
        distance,
        estimatedDuration: estimatedDurationMinutes,
        frequency: 'on_demand',
        scheduledDeparture,
        scheduledArrival,
        
        packageIds: hubPair.packages.map(pkg => pkg.packageId),
        packageCount: hubPair.packages.length,
        totalWeight,
        totalVolume,
        
        pricing: {
          runnerEarnings,
          platformFees,
          totalCustomerPaid
        },
        
        vehicleTypeRequired,
        minCapacity: totalVolume,
        minWeightCapacity: totalWeight,
        
        createdAt: admin.firestore.Timestamp.now()
      }
      
      // Add route to batch
      const routeRef = db.collection('longHaulRoutes').doc(routeId)
      batch.set(routeRef, routeDoc)
      
      // Update packages with route assignment
      for (const pkg of hubPair.packages) {
        const packageRef = db.collection('packages').doc(pkg.packageId)
        
        // Find the appropriate journey leg to update
        const journeyLeg = pkg.journey.find(leg =>
          leg.type === 'long_haul' &&
          leg.status === 'pending' &&
          leg.fromHub === hubPair.originHubId &&
          leg.toHub === hubPair.destinationHubId
        )
        
        if (journeyLeg) {
          const legIndex = pkg.journey.indexOf(journeyLeg)
          batch.update(packageRef, {
            [`journey.${legIndex}.routeId`]: routeId,
            updatedAt: admin.firestore.Timestamp.now()
          })
        }
      }
      
      routesCreated.push(routeId)
    }
    
    // Commit all changes
    if (routesCreated.length > 0) {
      await batch.commit()
      console.log(`Successfully created ${routesCreated.length} long haul routes:`, routesCreated)
    } else {
      console.log('No routes met the criteria (15+ packages per hub pair)')
    }
    
    return {
      success: true,
      routesCreated: routesCreated.length,
      routeIds: routesCreated
    }
  })
```

**Runner Impact:**
- Routes automatically created nightly based on package volume
- Only hub pairs with 15+ packages get routes
- Routes appear in available routes list
- Optimized for distance and capacity

---

### 2. `setPackageRunnerClaim` (HTTP Callable Function)
**Trigger:** Admin approves runner application  
**Purpose:** Set custom claim for security rules

```typescript
exports.setPackageRunnerClaim = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can set runner claims')
  }
  
  const { uid, approve } = data
  
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid')
  }
  
  try {
    // Set custom claim
    await admin.auth().setCustomUserClaims(uid, {
      packageRunner: approve === true
    })
    
    // Update user document
    await db.collection('users').doc(uid).update({
      'packageRunnerProfile.status': approve ? 'approved' : 'rejected',
      'packageRunnerProfile.approvedAt': approve ? admin.firestore.Timestamp.now() : null,
      'packageRunnerProfile.approvedBy': approve ? context.auth.uid : null,
      'packageRunnerProfile.rejectedAt': !approve ? admin.firestore.Timestamp.now() : null,
      'packageRunnerProfile.rejectedBy': !approve ? context.auth.uid : null
    })
    
    console.log(`Runner ${uid} ${approve ? 'approved' : 'rejected'} by admin ${context.auth.uid}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error setting package runner claim:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
```

**Runner Impact:**
- Custom claim `packageRunner: true` required to claim routes
- Enforced by security rules
- Admin approval required before first route

---

### 3. `seedHubs` (HTTP Callable Function)
**Trigger:** Manual admin call (one-time setup)  
**Purpose:** Create hub network across US

```typescript
exports.seedHubs = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can seed hubs')
  }
  
  const hubs = [
    {
      hubId: 'hub_sf',
      name: 'San Francisco Hub',
      code: 'SFO',
      type: 'origin',
      location: {
        lat: 37.7749,
        lng: -122.4194,
        address: '123 Mission St, San Francisco, CA 94103',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103'
      },
      timezone: 'America/Los_Angeles',
      operatingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        // ... rest of week
      },
      storageCapacity: 5000,
      loadingDocks: 10,
      packagesProcessed: 0,
      activePackages: 0,
      isActive: true,
      createdAt: admin.firestore.Timestamp.now()
    },
    {
      hubId: 'hub_la',
      name: 'Los Angeles Hub',
      code: 'LAX',
      // ... similar structure
    },
    {
      hubId: 'hub_phx',
      name: 'Phoenix Hub',
      code: 'PHX',
      // ...
    },
    // Total 18 hubs across US
  ]
  
  const batch = db.batch()
  
  for (const hub of hubs) {
    const hubRef = db.collection('hubs').doc(hub.hubId)
    batch.set(hubRef, hub)
  }
  
  await batch.commit()
  
  console.log(`Successfully seeded ${hubs.length} hubs`)
  
  return {
    success: true,
    hubsCreated: hubs.length
  }
})
```

**Runner Impact:**
- Hub network enables long-haul package shipping
- Runners select home hub during onboarding
- Preferred routes based on hub pairs

---

## Inter-Role Data Flows

### Flow 1: Customer → Runner (Package Shipping)
```
1. Customer ships package at /ship
   - packages/{packageId} created
   - currentStatus: 'pickup_pending'
   - journey: [
       { type: 'pickup', status: 'pending' },
       { type: 'long_haul', fromHub: 'hub_sf', toHub: 'hub_la', status: 'pending' },
       { type: 'last_mile', status: 'pending' }
     ]

2. Local courier picks up package
   - Delivers to origin hub (SF Hub)
   - journey[0].status: 'completed'
   - currentStatus: 'at_origin_hub'

3. buildLongHaulRoutes runs (nightly)
   - Groups packages SF → LA (20 packages)
   - Creates longHaulRoutes/{routeId}
   - Updates journey[1].routeId

4. Runner sees route in /runner/available-routes
   - Route shows: SF → LA, 20 packages, 380 miles, $500 earnings

5. Runner claims route
   - Transaction sets runnerId
   - status: 'claimed'
   - journey[1].runnerId set

6. Runner starts route
   - Arrives at SF Hub
   - Scans all 20 packages
   - Loads vehicle
   - status: 'in_progress'
   - journey[1].status: 'in_progress'
   - All packages: currentStatus: 'in_transit'

7. Runner drives SF → LA (6 hours)
   - Customer can track package
   - Shows "In transit with Runner John D."

8. Runner arrives at LA Hub
   - Unloads packages
   - Scans packages
   - Uploads proof of delivery photo
   - status: 'completed'
   - journey[1].status: 'completed'
   - All packages: currentStatus: 'at_destination_hub'

9. Last-mile courier picks up from LA Hub
   - Delivers to customer
   - journey[2]: 'last_mile' completed
   - currentStatus: 'delivered'

10. Payment captured
    - Runner receives $500 payout
    - Customer charged shipping fee
```

---

### Flow 2: Runner ↔ Admin (Application & Approval)
```
1. Runner applies at /runner/onboarding
   - Completes 5-step form:
     Step 1: Vehicle (cargo van, photo)
     Step 2: Driver license (upload photo)
     Step 3: DOT/MC numbers (if applicable)
     Step 4: Commercial insurance ($100k+ certificate)
     Step 5: Home hub (SF Hub), preferred routes
   
   - Creates user document:
     packageRunnerProfile.status: 'pending_review'
     applicationSubmittedAt: now()

2. Admin sees application in /admin/runners
   - Pending tab shows new application
   - Click to view details
   
3. Admin reviews:
   - Checks driver license photo (valid, not expired)
   - Verifies vehicle photo (matches description)
   - Reviews insurance certificate:
     * Coverage >= $100,000
     * Expiration date future
     * Proper policy type (commercial auto)
   - Checks DOT/MC numbers (optional lookup)

4. Admin approves:
   - Clicks "Approve" button
   - Calls Cloud Function: setPackageRunnerClaim(uid, true)
   
5. Cloud Function executes:
   - Sets custom claim: packageRunner: true
   - Updates document:
     * status: 'approved'
     * approvedAt: now()
     * approvedBy: adminUid

6. Runner receives email/notification
   - "Your application has been approved!"
   - Can now access /runner/dashboard

7. Runner logs in
   - Dashboard shows approved status
   - Available Routes tab shows routes
   - Can claim first route
```

---

### Flow 3: Runner ↔ Courier (Hub Handoff)
```
// Outbound: Courier → Hub → Runner

1. Customer orders item for long-distance delivery
   - Creates package (SF → LA)
   
2. Local courier picks up from customer
   - Delivers to SF Hub
   - Scans package at hub
   - Hub: inboundPackages++

3. Hub aggregates packages
   - 20 packages SF → LA accumulated
   - buildLongHaulRoutes creates route

4. Runner claims route
   - Picks up all 20 packages from SF Hub
   - Scans at hub checkout
   - Hub: outboundPackages++

// Inbound: Runner → Hub → Courier

5. Runner delivers to LA Hub
   - Unloads 20 packages
   - Scans at hub checkin
   - Hub: inboundPackages++

6. Last-mile courier picks up from LA Hub
   - Scans packages for local delivery
   - Hub: outboundPackages++
   - Delivers to customers

// No direct interaction between Runner and Courier
// Hub manages all handoffs
```

---

## Earnings & Payouts

### Earnings Formula
```typescript
// Base calculation
runnerEarnings = $50 base + max(
  distance × $1.00/mi,
  packageCount × $1.50/pkg
)

// Bonuses
onTimeBonus = runnerEarnings × 0.10  // +10% if on time
highVolumeBonus = packageCount >= 30 ? $50 : $0
weekendRate = isWeekend ? runnerEarnings × 0.20 : $0

// Deductions
fuelSurcharge = distance × $0.20/mi  // Added to runner, passed to customer

totalEarnings = runnerEarnings + onTimeBonus + highVolumeBonus + weekendRate + fuelSurcharge
```

### Example Calculation
```
Route: SF → LA
Distance: 380 miles
Packages: 25
Delivered: On time, Saturday

Base: $50
Distance: max(380 × $1.00, 25 × $1.50) = max($380, $37.50) = $380
Subtotal: $430

On-time bonus: $430 × 0.10 = $43
Weekend rate: $430 × 0.20 = $86
Fuel surcharge: 380 × $0.20 = $76

Total Runner Earnings: $635
```

### Payout Schedule
- **Frequency:** Weekly (every Wednesday)
- **Method:** Stripe Connect direct deposit
- **Minimum:** $100
- **Processing Time:** 2-5 business days

---

## Permissions Summary

### ✅ Runner CAN:
- Apply for package runner role
- View available long-haul routes
- Claim routes matching vehicle type and capacity
- Navigate multi-stop routes with GPS
- Scan packages at hubs
- Upload proof of delivery (GPS-tagged photos)
- View earnings and payout history
- Update vehicle/insurance info
- Set preferred routes
- Toggle availability on/off
- View hub locations and operating hours
- **Also:** Has all customer permissions (can order from marketplace)

### ❌ Runner CANNOT:
- Claim routes without approval + custom claim
- Claim routes requiring larger vehicle than owned
- Skip stops without admin approval
- Modify route order
- Accept local delivery jobs (that's courier role)
- Access admin features
- View other runners' data
- Change payout schedule
- Edit route earnings after completion
- Claim routes with expired insurance
- Access hubs outside operating hours

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Cross-References:**
- [Customer Role Documentation](./01-CUSTOMER-ROLE.md)
- [Courier Role Documentation](./02-COURIER-ROLE.md)
- [Vendor Role Documentation](./04-VENDOR-ROLE.md)
- [Admin Role Documentation](./05-ADMIN-ROLE.md)

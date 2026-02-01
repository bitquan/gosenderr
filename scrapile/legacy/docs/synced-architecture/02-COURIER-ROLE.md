# Courier Role - Synced Architecture Documentation

## Role Identity
- **Icon:** 🚗
- **Display Name:** Courier / Senderr
- **Color:** Green (#16A34A)
- **Tagline:** "Deliver. Earn. Repeat."
- **Purpose:** Accept and complete local delivery jobs (< 50 miles)
- **Role in System:** Service provider, fulfills delivery requests from customers and marketplace vendors

---

## User Document Structure (Firestore: `users/{uid}`)

```typescript
interface CourierUser {
  uid: string
  email: string
  displayName?: string
  role: 'courier'
  
  courierProfile: {
    // Status & Availability
    status: 'pending' | 'approved' | 'suspended'
    isOnline: boolean
    lastOnlineAt: Timestamp
    
    // Vehicle Configuration
    vehicleType: 'bike' | 'scooter' | 'car' | 'van' | 'truck'
    transportMode: 'bike' | 'scooter' | 'car' | 'van' | 'truck'
    vehicleDetails?: {
      make: string
      model: string
      year: string
      licensePlate: string
      vin: string
    }
    
    // Service Area
    serviceRadius: number  // miles
    homeLocation?: {
      address: string
      lat: number
      lng: number
    }
    
    // Rate Cards (Courier sets their own rates)
    packageRateCard?: {
      baseFee: number  // cents, min $3.00
      perMile: number  // cents, min $0.50
      minFee: number   // calculated: base + perMile
    }
    foodRateCard?: {
      baseFee: number
      perMile: number
      minFee: number
      peakHourMultiplier: number  // 1.0 - 2.0
    }
    
    // Work Modes
    workModes: {
      packagesEnabled: boolean
      foodEnabled: boolean
    }
    
    // Equipment (for food delivery)
    equipment?: {
      cooler?: {
        approved: boolean
        photoUrl: string
        approvedAt?: Timestamp
        approvedBy?: string  // Admin UID
      }
      hot_bag?: {
        approved: boolean
        photoUrl: string
        approvedAt?: Timestamp
        approvedBy?: string
      }
      insulated_bag?: { ... }
      drink_carrier?: { ... }
    }
    
    // Statistics (auto-updated by Cloud Functions)
    totalDeliveries: number
    completedDeliveries: number
    totalEarnings: number  // cents
    averageRating: number  // 0-5
    totalRatings: number
    onTimePercentage: number  // 0-100
    
    // Stripe Connect
    stripeConnectAccountId?: string
    stripeAccountVerified: boolean
    payoutsEnabled: boolean
  }
  
  // Real-time Location (updated every 10 seconds when online)
  location?: {
    lat: number
    lng: number
    updatedAt: Timestamp
    heading?: number
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Core Collections & Courier Interactions

### 1. Jobs Collection (`jobs/{jobId}`)
**Courier Role:** Claim and complete delivery jobs

```typescript
// Courier-specific job operations
interface CourierJobOperations {
  // Discovery
  findAvailableJobs: (courierLocation, serviceRadius) => Job[]
  
  // Eligibility Check (before allowing claim)
  isEligible: (job, courier) => {
    approved: boolean &&
    isOnline: boolean &&
    workModeMatch: boolean &&
    withinRange: boolean &&
    equipmentApproved: boolean (if food)
  }
  
  // Claim Job (Firestore Transaction)
  claimJob: async (jobId, courierUid, agreedFee) => {
    // Atomic: Check if still available, assign courier
    transaction.update(jobRef, {
      courierUid,
      agreedFee,
      status: 'assigned',
      assignedAt: serverTimestamp()
    })
    
    // Update courier stats
    transaction.update(courierRef, {
      'courierProfile.currentJobId': jobId
    })
  }
  
  // Status Progression
  updateJobStatus: (jobId, nextStatus) => {
    // Validates status transition
    // Updates job.status
    // Triggers sendNotifications function
  }
}
```

**Status Flow Courier Controls:**
```
open → [COURIER CLAIMS] → assigned
assigned → [START PICKUP] → enroute_pickup
enroute_pickup → [ARRIVE] → arrived_pickup
arrived_pickup → [PICKUP] → picked_up
picked_up → [START DELIVERY] → enroute_dropoff
enroute_dropoff → [ARRIVE] → arrived_dropoff
arrived_dropoff → [COMPLETE] → completed
```

---

### 2. Routes Collection (`routes/{routeId}`)
**Courier Role:** Claim and complete batched delivery routes

```typescript
interface Route {
  routeId: string
  type: 'local'  // < 50 miles
  status: 'available' | 'claimed' | 'in_progress' | 'completed' | 'cancelled'
  
  courierUid?: string  // Assigned courier
  claimedAt?: Timestamp
  
  scheduledDate: Timestamp  // Tomorrow
  
  area: {
    name: string
    centerLat: number
    centerLng: number
    radiusMiles: number
  }
  
  jobIds: string[]  // 3-8 jobs per route
  totalJobs: number
  
  optimizedStops: Array<{
    jobId: string
    sequence: number
    location: { lat: number, lng: number, address: string }
    estimatedArrival: Timestamp
    jobType: 'package' | 'food'
    specialRequirements: string[]
    completed: boolean
  }>
  
  totalDistance: number  // miles
  estimatedDuration: number  // minutes
  
  pricing: {
    courierEarnings: number  // cents
    platformFees: number
    totalCustomerPaid: number
  }
  
  completedJobs: number
  currentStopIndex: number
  
  requiredEquipment: string[]  // ['hot_bag', 'cooler']
  vehicleType_required: 'bike' | 'scooter' | 'car' | 'van' | 'truck'
  
  createdAt: Timestamp
  completedAt?: Timestamp
}
```

**Courier Route Operations:**
- **Discover:** Filter by `status: 'available'`, `scheduledDate`, equipment match
- **Claim:** Transaction to set `courierUid`, `status: 'claimed'`
- **Progress:** Update `currentStopIndex`, mark stops completed
- **Complete:** All jobs delivered → `status: 'completed'` → Earnings added

**Created by Cloud Function:** `buildRoutes` (runs every 30 minutes)

---

### 3. Equipment Approvals (Sub-collection: `users/{uid}/equipmentPhotos`)
**Admin Approval Required:** For food delivery

```typescript
interface EquipmentPhoto {
  type: 'cooler' | 'hot_bag' | 'insulated_bag' | 'drink_carrier'
  photoUrl: string
  uploadedAt: Timestamp
  
  status: 'pending_review' | 'approved' | 'rejected'
  reviewedBy?: string  // Admin UID
  reviewedAt?: Timestamp
  rejectionReason?: string
}
```

**Flow:**
1. Courier uploads photo → `status: 'pending_review'`
2. Admin sees in `/admin/equipment` (future)
3. Admin approves → Updates `users/{uid}.courierProfile.equipment.{type}.approved: true`
4. Courier now eligible for food jobs requiring that equipment

---

### 4. Ratings Collection (`ratings/{ratingId}`)
**Couriers Receive Ratings from Customers**

```typescript
// Auto-updated by Cloud Function: enforceRatings
interface CourierRatingImpact {
  // After each rating created:
  averageRating: calculateAverage(allRatingsForCourier)
  totalRatings: count(allRatingsForCourier)
  
  // Auto-Suspension Rule:
  if (averageRating < 3.5 && totalRatings >= 5) {
    courierProfile.status = 'suspended'
    
    // Create dispute document
    createDispute({
      type: 'low_rating_suspension',
      courierUid,
      reason: `Average rating ${averageRating} below 3.5 threshold`,
      status: 'open'
    })
  }
}
```

**Triggered by:** Customer submitting rating after job completion

---

## Firestore Security Rules

```javascript
// ==========================================
// COURIER ROLE SECURITY RULES
// ==========================================

// Courier can read jobs they can claim or have claimed
match /jobs/{jobId} {
  // Courier can read available jobs within their range
  allow read: if request.auth != null
              && (resource.data.status == 'open' 
                  || request.auth.uid == resource.data.courierUid);
  
  // Courier can claim available jobs (transaction enforced in client)
  allow update: if request.auth.uid == request.resource.data.courierUid
                && resource.data.status == 'open'
                && request.resource.data.status == 'assigned'
                && courierIsEligible(request.auth.uid, resource.data);
  
  // Courier can update their job status
  allow update: if request.auth.uid == resource.data.courierUid
                && isValidJobStatusTransition(resource, request.resource);
}

// Courier can claim routes
match /routes/{routeId} {
  // Read available routes or own routes
  allow read: if resource.data.status == 'available'
              || request.auth.uid == resource.data.courierUid;
  
  // Claim available route
  allow update: if request.auth.uid == request.resource.data.courierUid
                && resource.data.status == 'available'
                && request.resource.data.status == 'claimed'
                && courierMeetsRequirements(request.auth.uid, resource.data);
  
  // Update route progress
  allow update: if request.auth.uid == resource.data.courierUid
                && isValidRouteUpdate(resource, request.resource);
}

// Courier can update their profile and location
match /users/{userId} {
  // Read own profile
  allow read: if request.auth.uid == userId;
  
  // Update location when online
  allow update: if request.auth.uid == userId
                && request.resource.data.location != null
                && request.resource.data.courierProfile.isOnline == true;
  
  // Toggle online/offline status
  allow update: if request.auth.uid == userId
                && hasOnlyChangedField('courierProfile.isOnline')
                && request.resource.data.courierProfile.status == 'approved';
  
  // Update rate cards
  allow update: if request.auth.uid == userId
                && hasOnlyChangedFields(['courierProfile.packageRateCard', 'courierProfile.foodRateCard'])
                && validateRateCard(request.resource.data);
}

// Courier cannot read other couriers' data
match /users/{userId} {
  allow read: if request.auth.uid != userId
              && false;  // Explicitly deny
}

// Helper Functions
function courierIsEligible(courierUid, jobData) {
  let courier = get(/databases/$(database)/documents/users/$(courierUid)).data;
  return courier.courierProfile.status == 'approved'
      && courier.courierProfile.isOnline == true
      && workModeMatches(courier, jobData)
      && equipmentApproved(courier, jobData);
}

function workModeMatches(courier, jobData) {
  return (jobData.jobType == 'package' && courier.courierProfile.workModes.packagesEnabled)
      || (jobData.jobType == 'food' && courier.courierProfile.workModes.foodEnabled);
}

function equipmentApproved(courier, jobData) {
  // If food job requires equipment, check approval
  return true;  // Simplified
}

function validateRateCard(userData) {
  let pkg = userData.courierProfile.packageRateCard;
  let food = userData.courierProfile.foodRateCard;
  
  return (pkg == null || (pkg.baseFee >= 300 && pkg.perMile >= 50))
      && (food == null || (food.baseFee >= 300 && food.perMile >= 50));
}
```

---

## Cloud Functions Integration

### 1. `enforceRatings` (Firestore Trigger)
**Trigger:** `ratings/{ratingId}` onCreate  
**Purpose:** Update courier's average rating, auto-suspend if below threshold

```typescript
exports.enforceRatings = functions.firestore
  .document('ratings/{ratingId}')
  .onCreate(async (snapshot, context) => {
    const rating = snapshot.data()
    const { toUserId, role, stars } = rating
    
    if (role !== 'courier') return null
    
    // Query all ratings for this courier
    const ratingsSnap = await db.collection('ratings')
      .where('toUserId', '==', toUserId)
      .where('role', '==', 'courier')
      .get()
    
    // Calculate average
    const totalRatings = ratingsSnap.size
    const sumRatings = ratingsSnap.docs.reduce((sum, doc) => sum + doc.data().stars, 0)
    const averageRating = sumRatings / totalRatings
    
    // Update courier profile
    await db.collection('users').doc(toUserId).update({
      'courierProfile.averageRating': averageRating,
      'courierProfile.totalRatings': totalRatings
    })
    
    // Check suspension threshold
    if (averageRating < 3.5 && totalRatings >= 5) {
      // Auto-suspend courier
      await db.collection('users').doc(toUserId).update({
        'courierProfile.status': 'suspended',
        'courierProfile.suspendedAt': admin.firestore.Timestamp.now(),
        'courierProfile.suspensionReason': 'low_rating_auto_suspension'
      })
      
      // Create dispute for admin review
      await db.collection('disputes').add({
        type: 'low_rating_suspension',
        courierUid: toUserId,
        averageRating,
        totalRatings,
        status: 'open',
        createdAt: admin.firestore.Timestamp.now()
      })
      
      console.log(`Courier ${toUserId} auto-suspended. Avg rating: ${averageRating}`)
    }
    
    return null
  })
```

**Courier Impact:**
- Average rating auto-calculated after each delivery
- Low ratings (< 3.5 with 5+ reviews) trigger automatic suspension
- Admin reviews dispute and can unsuspend

---

### 2. `buildRoutes` (Scheduled Function)
**Schedule:** Every 30 minutes  
**Purpose:** Batch pending jobs into optimized delivery routes for next day

```typescript
exports.buildRoutes = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    // Calculate tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const tomorrowTimestamp = admin.firestore.Timestamp.fromDate(tomorrow)
    
    // Get pending jobs scheduled for tomorrow
    const jobsSnapshot = await db.collection('deliveryJobs')
      .where('deliveryType', '==', 'standard')
      .where('status', '==', 'pending_route')
      .where('scheduledDate', '==', tomorrowTimestamp)
      .get()
    
    if (jobsSnapshot.empty) {
      console.log('No jobs to batch')
      return null
    }
    
    const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    console.log(`Found ${jobs.length} jobs to batch`)
    
    // Cluster jobs by proximity (3-8 jobs per route)
    const clusters = clusterByLocation(jobs, {
      minJobsPerRoute: 3,
      maxJobsPerRoute: 8,
      maxRadiusMiles: 10
    })
    
    console.log(`Created ${clusters.length} route clusters`)
    
    // Create route documents
    const batch = db.batch()
    const routesCreated = []
    
    for (const cluster of clusters) {
      // Optimize stop order (traveling salesman)
      const optimizedJobs = optimizeRouteOrder(cluster.jobs)
      
      // Calculate total distance
      let totalDistance = 0
      for (let i = 0; i < optimizedJobs.length - 1; i++) {
        totalDistance += calculateDistance(
          optimizedJobs[i].dropoff,
          optimizedJobs[i + 1].dropoff
        )
      }
      
      // Estimate duration (3 min per stop + travel time at 30 mph)
      const estimatedDuration = Math.round(
        optimizedJobs.length * 3 + (totalDistance / 30) * 60
      )
      
      // Calculate courier earnings
      const courierEarnings = calculateCourierPay({
        jobCount: optimizedJobs.length,
        totalDistance,
        totalDuration: estimatedDuration
      })
      
      // Platform fees ($2.50 per job)
      const platformFees = optimizedJobs.length * 250
      const totalCustomerPaid = optimizedJobs.reduce((sum, job) => 
        sum + job.pricing.totalCustomerCharge, 0
      )
      
      // Create route document
      const routeId = db.collection('routes').doc().id
      const routeDoc = {
        routeId,
        type: 'local',
        status: 'available',
        scheduledDate: tomorrowTimestamp,
        createdAt: admin.firestore.Timestamp.now(),
        
        area: {
          name: `Route ${routeId.substring(0, 6)}`,
          centerLat: cluster.center.lat,
          centerLng: cluster.center.lng,
          radiusMiles: cluster.radiusMiles
        },
        
        jobIds: optimizedJobs.map(j => j.id),
        totalJobs: optimizedJobs.length,
        
        optimizedStops: optimizedJobs.map((job, index) => ({
          jobId: job.id,
          sequence: index + 1,
          location: {
            lat: job.dropoff.lat,
            lng: job.dropoff.lng,
            address: job.dropoff.address
          },
          estimatedArrival: admin.firestore.Timestamp.fromDate(
            new Date(tomorrow.getTime() + (index * 10 + 480) * 60000)  // Start 8am, 10 min per stop
          ),
          jobType: job.jobType,
          specialRequirements: getSpecialRequirements(job),
          completed: false
        })),
        
        totalDistance,
        estimatedDuration,
        
        pricing: {
          courierEarnings,
          platformFees,
          totalCustomerPaid
        },
        
        completedJobs: 0,
        currentStopIndex: 0,
        
        requiredEquipment: getRequiredEquipment(optimizedJobs),
        vehicleType_required: getRequiredVehicleType(optimizedJobs)
      }
      
      // Add route to batch
      const routeRef = db.collection('routes').doc(routeId)
      batch.set(routeRef, routeDoc)
      
      // Update jobs with route assignment
      for (let i = 0; i < optimizedJobs.length; i++) {
        const jobRef = db.collection('deliveryJobs').doc(optimizedJobs[i].id)
        batch.update(jobRef, {
          routeId,
          routePosition: i + 1,
          status: 'assigned',
          updatedAt: admin.firestore.Timestamp.now()
        })
      }
      
      routesCreated.push(routeId)
    }
    
    // Commit all changes
    await batch.commit()
    
    console.log(`Successfully created ${routesCreated.length} routes`)
    
    return {
      success: true,
      routesCreated: routesCreated.length,
      routeIds: routesCreated
    }
  })
```

**Courier Impact:**
- Batched routes = higher earnings per hour
- Optimized stop order = less driving
- Routes appear in available routes list next day
- Better than claiming individual jobs

---

### 3. `calculateCourierPay` (Utility Function)
**Used by:** buildRoutes, buildLongRoutes  
**Purpose:** Fair earnings calculation

```typescript
function calculateCourierPay(params: {
  jobCount: number
  totalDistance: number
  totalDuration: number
}): number {
  // Formula: max(jobCount × $12, distance × $1.50 + duration × $0.20)
  const jobBasedPay = params.jobCount * 1200  // $12 per job
  const distanceBasedPay = params.totalDistance * 150 + params.totalDuration * 20
  
  return Math.max(jobBasedPay, distanceBasedPay)  // cents
}
```

**Example:**
- 5 jobs, 20 miles, 60 minutes
- Job-based: 5 × $12 = $60
- Distance-based: (20 × $1.50) + (60 × $0.20) = $30 + $12 = $42
- Courier earns: max($60, $42) = **$60**

---

### 4. `sendNotifications` (Firestore Trigger)
**Trigger:** Job status changes  
**Purpose:** Notify courier of important events

```typescript
exports.sendNotifications = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    // Notify courier when customer cancels
    if (before.status !== 'cancelled' && after.status === 'cancelled') {
      if (after.courierUid) {
        const courier = await db.collection('users').doc(after.courierUid).get()
        await sendPushNotification(courier.data().fcmToken, {
          title: 'Job Cancelled',
          body: 'Customer cancelled the delivery job',
          data: { jobId: context.params.jobId }
        })
      }
    }
    
    // Notify courier when customer confirms arrival
    if (before.status === 'arrived_dropoff' && after.status === 'completed') {
      const courier = await db.collection('users').doc(after.courierUid).get()
      await sendPushNotification(courier.data().fcmToken, {
        title: 'Delivery Confirmed!',
        body: `You earned $${(after.agreedFee / 100).toFixed(2)}`,
        data: { jobId: context.params.jobId }
      })
    }
  })
```

---

## Inter-Role Data Flows

### Flow 1: Courier ← Customer (Job Discovery & Claim)
```
1. Customer creates job
   - jobs/{jobId} created (status: 'open')

2. onCreateJob trigger
   - Finds couriers in range
   - Sends push notifications
   - "New job available: $12.50"

3. Courier sees job in dashboard
   - Checks eligibility (online, work mode, equipment)
   - Estimates earnings from own rate card

4. Courier claims job (Firestore Transaction)
   - Validates still available
   - Sets courierUid
   - status: 'open' → 'assigned'
   - Courier profile: currentJobId set

5. Customer sees courier assigned
   - Real-time update in job detail
   - Courier name, vehicle, rating shown
```

---

### Flow 2: Courier ↔ Customer (Delivery Progress)
```
1. Courier: "Start Heading to Pickup"
   - status: 'assigned' → 'enroute_pickup'
   - sendNotifications trigger → Customer notified

2. useCourierLocationWriter hook (runs every 10 seconds)
   - Updates users/{courierUid}.location
   - Customer sees live map of courier approaching

3. Courier: "Arrived at Pickup"
   - status: 'enroute_pickup' → 'arrived_pickup'

4. Vendor hands over item

5. Courier: "Package Picked Up"
   - status: 'arrived_pickup' → 'picked_up'
   - Customer notified: "Your order is on the way!"

6. Courier: "Start Heading to Delivery"
   - status: 'picked_up' → 'enroute_dropoff'
   - ETA calculated and shown to customer

7. Courier: "Arrived"
   - status: 'enroute_dropoff' → 'arrived_dropoff'

8. Hands item to customer

9. Courier: "Mark Completed"
   - status: 'arrived_dropoff' → 'completed'
   - capturePayment trigger → Charges customer, pays courier

10. Customer rates courier
    - Creates rating document
    - enforceRatings trigger → Updates courier's average
```

---

### Flow 3: Courier ↔ Admin (Equipment Approval)
```
1. Courier uploads equipment photo
   - users/{uid}/equipmentPhotos/{photoId}
   - status: 'pending_review'

2. Admin sees in equipment queue (future feature)
   - /admin/equipment (pending tab)

3. Admin reviews photo
   - Approves: Sets equipment.hot_bag.approved: true
   - Rejects: Sets status: 'rejected', adds reason

4. Courier receives notification
   - "Your hot bag has been approved!"
   - Badge appears on dashboard

5. Courier now eligible for food jobs
   - Jobs requiring hot_bag show in available jobs
```

---

### Flow 4: Courier ↔ Admin (Suspension & Unsuspension)
```
1. Customer rates courier 2 stars
   - Creates rating document

2. enforceRatings trigger runs
   - Calculates new average: 3.2 (with 6 total ratings)
   - Below 3.5 threshold → Auto-suspend

3. Updates courier document
   - courierProfile.status: 'suspended'
   - suspensionReason: 'low_rating_auto_suspension'

4. Creates dispute document
   - type: 'low_rating_suspension'
   - courierUid, averageRating, totalRatings
   - status: 'open'

5. Courier logs in
   - Sees "Account Suspended" banner
   - Cannot go online
   - Cannot claim jobs

6. Admin reviews dispute
   - /admin/disputes
   - Views ratings history
   - Sees customer comments

7. Admin decides to unsuspend
   - Updates courierProfile.status: 'approved'
   - Adds admin note to dispute
   - Closes dispute

8. Courier notified
   - "Your account has been reinstated"
   - Can go online again
```

---

## Location Tracking System

### Real-Time Location Updates (useCourierLocationWriter Hook)

```typescript
// Client-side hook (runs when courier is online)
export function useCourierLocationWriter() {
  useEffect(() => {
    if (!isOnline) return
    
    const interval = setInterval(async () => {
      // Get device location
      const position = await getCurrentPosition()
      
      // Update Firestore
      await updateDoc(doc(db, 'users', uid), {
        'location.lat': position.coords.latitude,
        'location.lng': position.coords.longitude,
        'location.updatedAt': serverTimestamp(),
        'location.heading': position.coords.heading
      })
    }, 10000)  // Every 10 seconds
    
    return () => clearInterval(interval)
  }, [isOnline])
}
```

**Customer sees live courier location:**
- Mapbox map with courier pin
- Updates every 10 seconds
- Shows heading (direction arrow)
- Calculates ETA based on distance

---

## Earnings & Payouts

### Payout Schedule
- **Frequency:** Weekly (every Friday)
- **Method:** Stripe Connect direct deposit
- **Minimum:** $25
- **Processing Time:** 2-5 business days

### Earnings Calculation
```typescript
// Per job
courierEarnings = baseFee + (distance × perMile)

// Route batch
routeEarnings = max(
  jobCount × $12,
  totalDistance × $1.50 + totalDuration × $0.20
)

// Customer pays
customerCharge = courierEarnings + platformFee (15%)
```

### Payout Flow
```
1. Job completed → capturePayment trigger
2. Earnings added to courier's pending balance
3. Every Friday → Stripe payout initiated
4. 2-5 days → Funds arrive in bank account
```

---

## Permissions Summary

### ✅ Courier CAN:
- Go online/offline (if approved)
- View available jobs in service range
- Claim jobs matching work modes + equipment
- Claim batched routes for next day
- Update job status through delivery flow
- Upload equipment photos for approval
- Set own rate cards (subject to minimums)
- View own earnings and payout history
- Update vehicle information
- See customer delivery address (after claim)
- Contact customer via in-app message
- View own ratings and reviews

### ❌ Courier CANNOT:
- See jobs outside service radius
- Claim jobs without required equipment approval
- Go online if status is 'suspended' or 'pending'
- Claim jobs not matching work modes (packages vs food)
- See other couriers' locations or earnings
- Cancel jobs after picking up item
- Modify customer addresses
- Access admin features
- View platform analytics
- Change platform fees
- Edit completed delivery history
- Bypass rate card minimums ($3 base, $0.50/mi)

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Cross-References:**
- [Customer Role Documentation](./01-CUSTOMER-ROLE.md)
- [Vendor Role Documentation](./04-VENDOR-ROLE.md)
- [Runner Role Documentation](./03-RUNNER-ROLE.md)
- [Admin Role Documentation](./05-ADMIN-ROLE.md)

# Courier Role - Complete Documentation

## Role Identity
- **Icon:** 🚗
- **Display Name:** Courier / Senderr
- **Color:** Green (#16A34A)
- **Tagline:** "Deliver. Earn. Repeat."
- **Purpose:** Accept and complete local delivery jobs (< 50 miles)

---

## Architecture & Access

### How to Become a Courier
1. Sign up at `/login` with email/password
2. Select "Courier" role at `/select-role`
3. Complete onboarding at `/courier/onboarding` (5 steps):
   - Step 1: Vehicle type + service radius
   - Step 2: Work modes (packages/food)
   - Step 3: Package rate card
   - Step 4: Food rate card  
   - Step 5: Review & submit
4. Submit for admin approval (optional equipment verification)
5. Once approved → Access `/courier/dashboard`

### User Document Structure
```typescript
{
  uid: string
  email: string
  displayName?: string
  role: 'courier'
  courierProfile: {
    // Status
    status: 'pending' | 'approved' | 'suspended'
    isOnline: boolean
    lastOnlineAt: Timestamp
    
    // Vehicle
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
    serviceRadius: number // miles
    homeLocation?: {
      address: string
      lat: number
      lng: number
    }
    
    // Rate Cards
    packageRateCard?: {
      baseFee: number
      perMile: number
      minFee: number
    }
    foodRateCard?: {
      baseFee: number
      perMile: number
      minFee: number
      peakHourMultiplier: number
    }
    
    // Work Modes
    workModes: {
      packagesEnabled: boolean
      foodEnabled: boolean
    }
    
    // Equipment (for food delivery)
    equipment?: {
      cooler?: { approved: boolean, photoUrl: string }
      hot_bag?: { approved: boolean, photoUrl: string }
      insulated_bag?: { approved: boolean, photoUrl: string }
      drink_carrier?: { approved: boolean, photoUrl: string }
    }
    
    // Stats
    totalDeliveries: number
    completedDeliveries: number
    totalEarnings: number
    averageRating: number
    totalRatings: number
    onTimePercentage: number
  }
  
  // Current Location (real-time)
  location?: {
    lat: number
    lng: number
    updatedAt: Timestamp
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Pages & Features

### 1. Dashboard (`/courier/dashboard`)
**Purpose:** Job discovery and acceptance hub

**Features:**

**A) Header Controls:**
- **Online/Offline Toggle:**
  - Large button (top right)
  - Green when online, gray when offline
  - Updates `courierProfile.isOnline` in real-time
  - Auto-starts GPS tracking when online
  - Online = visible to customers, receives job notifications
  
- **Stats Display:**
  - Available Jobs count (nearby, eligible)
  - Active Jobs count (assigned to me)
  - Vehicle Type badge
  - Today's Earnings

**B) Map View (Main Feature):**
- Full-screen Mapbox map showing:
  - Courier's current location (blue pulsing dot)
  - Available jobs (purple pins)
  - Selected job (green pin with highlight)
  - Pickup/delivery markers for selected job
  - Service radius circle
- Real-time location updates (onSnapshot)
- Click job pin → shows job preview card

**C) Available Jobs Sidebar:**
- List of nearby jobs (within service radius)
- Each job card shows:
  - Distance from courier (calculated live)
  - Pickup address (masked: "123 Main St")
  - Delivery address (masked: "456 Oak Ave")
  - Estimated fee (based on courier's rate card)
  - Vehicle type required
  - Time estimate
  - Equipment badges (if food)
  - **"Accept Job"** button
- Auto-refresh every 5 seconds
- Filter: Hide Ineligible (default: true)

**D) Eligibility Logic:**
Courier sees job ONLY if:
1. `courierProfile.status === 'approved'`
2. `courierProfile.isOnline === true`
3. Job type matches work mode:
   - Package job → `workModes.packagesEnabled === true`
   - Food job → `workModes.foodEnabled === true`
4. Distance from courier to pickup ≤ `serviceRadius`
5. Job distance (pickup → dropoff) within acceptable range
6. Food jobs: Required equipment approved
   - `requiresCooler` → `equipment.cooler.approved === true`
   - `requiresHotBag` → `equipment.hot_bag.approved || insulated_bag.approved`
   - `requiresDrinkCarrier` → `equipment.drink_carrier.approved === true`

**E) Claiming a Job:**
1. Courier clicks "Accept Job" 
2. Calls `claimJob(jobId, courierUid, agreedFee)`
3. Transaction updates:
   - `job.status` → 'assigned'
   - `job.courierUid` → `<courier-uid>`
   - `job.agreedFee` → `<calculated-fee>`
   - `job.courierSnapshot` → courier details
4. Job removed from available list
5. Job appears in "My Active Jobs"
6. Customer notified
7. Courier redirected to job detail page

**F) Offline Warning:**
- If `isOnline === false`:
  - Shows banner: "You're Offline - Turn on to see jobs"
  - Hides available jobs list
  - Shows "Go Online" CTA button

---

### 2. My Active Jobs (`/courier/dashboard` - Active Section)
**Purpose:** Track jobs assigned to courier

**Features:**
- List of jobs with status: 'assigned', 'enroute_pickup', 'picked_up', 'enroute_dropoff'
- Each card shows:
  - Job ID
  - Current status
  - Pickup address (full, no longer masked)
  - Delivery address (full)
  - Customer name
  - Agreed fee
  - Time since accepted
  - "View Details" button
- Real-time status updates
- Sorted by acceptance time (oldest first)

---

### 3. Job Detail (`/courier/jobs/[jobId]`)
**Purpose:** Manage individual delivery from start to finish

**Access Control:**
- Only courier assigned to job can access
- If `job.courierUid !== current.uid` → redirect with error

**Features:**

**A) Job Information:**
- Full pickup address (exact, with unit number)
- Full delivery address (exact)
- Package details:
  - Description
  - Photos (customer uploaded)
  - Weight, dimensions
  - Special instructions
- Customer info:
  - Name
  - Phone (call/text buttons)
  - Profile photo
- Agreed fee amount
- Platform fee (if shown)

**B) Status Timeline:**
- Visual stepper showing:
  1. ✓ Assigned (completed)
  2. → Enroute to Pickup (current)
  3. ○ Arrived at Pickup (pending)
  4. ○ Package Picked Up
  5. ○ Enroute to Delivery
  6. ○ Arrived at Delivery
  7. ○ Completed

**C) Status Actions (Big Buttons):**
Based on current status, shows ONE action button:

| Current Status      | Next Action Button                    | Next Status         |
|---------------------|---------------------------------------|---------------------|
| assigned            | "Start Heading to Pickup"             | enroute_pickup      |
| enroute_pickup      | "Mark Arrived at Pickup"              | arrived_pickup      |
| arrived_pickup      | "Mark Package Picked Up"              | picked_up           |
| picked_up           | "Start Heading to Delivery"           | enroute_dropoff     |
| enroute_dropoff     | "Mark Arrived at Delivery"            | arrived_dropoff     |
| arrived_dropoff     | "Mark Completed"                      | completed           |
| completed           | (No action - job done)                | -                   |

**D) Navigation Actions:**
- "Get Directions to Pickup" → Opens Google Maps
- "Get Directions to Delivery" → Opens Google Maps

**E) Communication:**
- Call customer button
- Text customer button (if phone provided)

**F) Real-time Updates:**
- Customer can see courier's location on map
- Status changes reflect immediately for customer

**G) Proof of Delivery:**
- Optional photo capture (GPS-tagged)
- Signature capture (future)

---

### 4. Rate Cards (`/courier/rate-cards`)
**Purpose:** Set and edit delivery pricing

**Features:**

**A) Package Rate Card:**
- Base Fee: Minimum charge (e.g., $5)
- Per Mile Rate: Additional per mile (e.g., $1.50/mi)
- Min Fee: Platform minimum (enforced, e.g., $3)
- Formula displayed: `Fee = baseFee + (distance × perMile)`
- Example calculation shown live

**B) Food Rate Card:**
- Base Fee
- Per Mile Rate
- Peak Hour Multiplier (1.2x - 2x for lunch/dinner rush)
- Equipment requirements checkboxes

**C) Work Mode Toggles:**
- "Accept Package Deliveries" (on/off)
- "Accept Food Deliveries" (on/off)
- Warning if disabling both

**D) Validation:**
- Rates must meet platform minimums
- Can't set baseFee < $3
- Can't set perMile < $0.50

---

### 5. Equipment (`/courier/equipment`)
**Purpose:** Upload equipment photos for food delivery approval

**Features:**
- **Required for Food Delivery:**
  - Cooler/Insulated Bag
  - Hot Bag
  - Drink Carrier (optional but recommended)

**Upload Process:**
1. Select equipment type
2. Capture photo (must show equipment clearly)
3. Submit for admin review
4. Status: Pending → Approved/Rejected
5. If approved → Green badge on dashboard
6. If rejected → Can re-upload

**Benefits:**
- Approved equipment = eligible for food jobs
- Higher earning potential (food jobs pay more)
- Equipment badges shown to customers (trust)

---

### 6. Routes (`/courier/routes`)
**Purpose:** Accept batched delivery routes (Phase 2)

**Features:**
- View available routes (multiple stops)
- Route details:
  - Total stops count
  - Total distance
  - Estimated time
  - Total earnings
  - Stop addresses (ordered)
- Accept full route
- Navigate stop-by-stop
- Mark each stop complete

---

### 7. Active Route (`/courier/active-route`)
**Purpose:** Navigate multi-stop route

**Features:**
- Map with all stops marked
- Current stop highlighted
- Progress bar (X of Y stops complete)
- Capture photo at each stop (GPS-tagged)
- Optimized route order
- Next 3 stops preview
- ETA to next stop

---

### 8. Earnings (`/courier/earnings`)
**Purpose:** Track income and payouts

**Features:**
- **Summary Cards:**
  - Total Earnings (all time)
  - This Month
  - This Week
  - Today
- **Filter by Date Range:**
  - Last 7 days
  - Last 30 days
  - Last 3 months
  - Custom range
- **Earnings List:**
  - Each job with:
    - Date/time
    - Job ID
    - Pickup → Delivery
    - Distance
    - Earnings
    - Status (paid/pending)
- **Payout Schedule:**
  - Weekly payouts (every Friday)
  - Via Stripe Connect
- **Analytics Charts:**
  - Earnings over time (line chart)
  - Earnings by day of week
  - Earnings by hour of day

---

### 9. Profile (`/courier/profile`)
**Purpose:** Manage courier account

**Features:**
- Edit vehicle type
- Update service radius
- Change home location
- Upload profile photo
- Update phone number
- View stats:
  - Total deliveries
  - Average rating
  - On-time percentage
  - Total earnings
- View badges/achievements
- Sign out

---

### 10. Settings (`/courier/settings`)
**Purpose:** Preferences and notifications

**Features:**
- Notification settings
- Auto-accept jobs (future)
- Preferred job types
- Break mode (pause new jobs)
- Dark mode toggle
- Language preference

---

## Navigation

### Bottom Navigation (Mobile)
```typescript
[
  { icon: "🏠", label: "Dashboard", href: "/courier/dashboard" },
  { icon: "📦", label: "My Jobs", href: "/courier/jobs" },  // List of active
  { icon: "💵", label: "Earnings", href: "/courier/earnings" },
  { icon: "👤", label: "Profile", href: "/courier/profile" }
]
```

**OR** (for courier app):
```typescript
[
  { icon: "🏠", label: "Dashboard", href: "/dashboard" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "👤", label: "Profile", href: "/profile" },
  { icon: "⚙️", label: "Settings", href: "/settings" }
]
```

---

## Interactions with Other Roles

### 🔁 Courier ↔ Customer
**Direct Interactions:**
1. **Job Discovery:** Customer creates job → Courier sees in available jobs
2. **Job Claim:** Courier accepts → Customer sees courier assigned
3. **Status Updates:** Courier updates status → Customer sees real-time changes
4. **Communication:** Phone call, text message during delivery
5. **Delivery Confirmation:** Courier marks complete → Customer confirms receipt
6. **Rating:** Customer rates courier → Updates courier's average rating

**Data Flow:**
- Courier location → Real-time to customer's job detail map
- Courier status updates → Trigger notifications to customer
- Customer confirmation → Triggers payment capture
- Customer rating → Updates `courier.averageRating` and `totalRatings`

---

### 🔁 Courier ↔ Seller
**Indirect Interaction:**
1. **Pickup:** Courier picks up item from seller's location
2. **Seller Ready Status:** Seller marks order ready → Courier notified
3. **Seller Rating:** Seller can rate courier (future)

**Data Flow:**
- Courier picks up → `job.status: 'picked_up'` → Seller notified
- Courier completes → Seller receives payout via Stripe

---

### 🔁 Courier ↔ Runner
**No Direct Interaction:**
- Different service types (local vs long-haul)
- Runners handle packages 50+ miles
- Couriers handle local deliveries < 50 miles

---

### 🔁 Courier ↔ Admin
**Admin Oversight:**
1. **Approval:** Admin approves courier application
2. **Equipment:** Admin approves/rejects equipment photos
3. **Suspension:** Admin can suspend low-rated couriers (<3.5 stars with 5+ ratings)
4. **Disputes:** Admin resolves customer complaints
5. **Earnings:** Admin can view courier earnings
6. **Job Reassignment:** Admin can reassign jobs to different courier

**Data Flow:**
- Courier onboarding → Admin reviews → Approves/Rejects
- Low rating triggers → Auto-creates dispute for admin review
- Admin suspends → `courierProfile.status: 'suspended'` → Courier loses access
- Admin unsuspends → Courier regains access

---

## Permissions

### ✅ Courier CAN:
- Toggle online/offline status
- View available jobs within service radius
- Accept jobs matching their vehicle type
- Update job status through delivery workflow
- Set own rate cards (within platform minimums)
- Upload equipment for approval
- View earnings and payout history
- Communicate with customers
- Capture GPS-tagged proof of delivery photos
- Edit vehicle type and service radius
- Accept batched routes (Phase 2)
- **Also:** Has all customer permissions (can order from marketplace)

### ❌ Courier CANNOT:
- Accept jobs outside service radius
- Accept food jobs without approved equipment
- Set rates below platform minimums ($3 base, $0.50/mile)
- Accept jobs when offline
- View other couriers' data or earnings
- Access admin features
- Cancel jobs after picked up
- Modify customer's delivery address
- See other couriers' locations
- Edit job agreed fee after acceptance

---

## Firestore Security Rules

```javascript
// Courier can read their assigned jobs
match /jobs/{jobId} {
  allow read: if request.auth.uid == resource.data.courierUid
              || request.auth.uid == resource.data.createdByUid;
  
  // Courier can claim open jobs
  allow update: if request.auth.uid == request.resource.data.courierUid
                && resource.data.status == 'open'
                && request.resource.data.status == 'assigned';
  
  // Courier can update status of their jobs
  allow update: if request.auth.uid == resource.data.courierUid
                && isValidStatusTransition(resource.data.status, request.resource.data.status);
}

// Courier can update their location
match /users/{userId} {
  allow update: if request.auth.uid == userId
                && request.resource.data.location != null;
  
  // Courier can toggle online status
  allow update: if request.auth.uid == userId
                && request.resource.data.courierProfile.isOnline != null;
}
```

---

## Key Workflows

### Workflow 1: Accept and Complete Job
1. Courier logs in → Goes to dashboard
2. Toggles online → Location tracking starts
3. Browses available jobs on map
4. Finds suitable job → Clicks job pin
5. Reviews job details (distance, fee, pickup/delivery)
6. Clicks "Accept Job"
7. Job claimed → Status: 'assigned'
8. Redirects to job detail page
9. Clicks "Start Heading to Pickup" → Status: 'enroute_pickup'
10. Arrives at pickup → Clicks "Arrived at Pickup"
11. Seller hands over item → Clicks "Package Picked Up"
12. Starts driving to delivery → Clicks "Start Heading to Delivery"
13. Arrives at delivery → Clicks "Arrived at Delivery"
14. Hands item to customer → Clicks "Mark Completed"
15. Customer confirms receipt → Payment captured
16. Earnings added to courier's balance
17. Customer rates courier

### Workflow 2: Set Up Rate Cards (First Time)
1. Courier completes onboarding
2. Redirected to `/courier/rate-cards`
3. Sets package rate card:
   - Base Fee: $5
   - Per Mile: $1.50
4. Enables package deliveries
5. Sets food rate card:
   - Base Fee: $7
   - Per Mile: $2
   - Peak Multiplier: 1.5x
6. Enables food deliveries
7. Saves → Dashboard unlocked

### Workflow 3: Upload Equipment for Food Delivery
1. Courier goes to `/courier/equipment`
2. Selects "Cooler/Insulated Bag"
3. Captures photo of cooler
4. Uploads → Status: 'pending_review'
5. Admin reviews → Approves
6. Courier receives notification
7. Equipment badge appears on dashboard
8. Courier now eligible for food jobs requiring cooler

### Workflow 4: Handle Low Rating Suspension
1. Customer rates courier 2 stars
2. Courier's average drops to 3.2 (with 5+ ratings)
3. Cloud function triggers:
   - Sets `courierProfile.status: 'suspended'`
   - Creates dispute document
   - Sends notification to courier and admin
4. Courier logs in → Sees "Account Suspended" message
5. Can't go online or accept jobs
6. Admin reviews dispute
7. Admin decides: Unsuspend or keep suspended
8. If unsuspended → Courier regains access

---

## Earnings & Payouts

### Fee Calculation
**Formula:**
```
Courier Earnings = Base Fee + (Distance × Per Mile Rate)
Platform Fee = 15% of Courier Earnings
Customer Pays = Courier Earnings + Platform Fee
```

**Example:**
- Distance: 5 miles
- Courier Rate Card: $5 base + $1.50/mi
- Courier Earnings: $5 + (5 × $1.50) = $12.50
- Platform Fee: $12.50 × 0.15 = $1.88
- Customer Pays: $12.50 + $1.88 = $14.38

### Payment Flow:
1. Customer pays → Pre-authorization hold (Stripe)
2. Courier completes delivery
3. Customer confirms receipt
4. Payment captured from hold
5. Courier earnings added to pending balance
6. Weekly payout (every Friday) via Stripe Connect
7. Direct deposit to courier's bank account

### Payout Schedule:
- **Weekly:** Every Friday
- **Minimum Payout:** $25
- **If under $25:** Rolls over to next week
- **Payout Method:** Direct deposit (Stripe Connect)
- **Processing Time:** 2-3 business days

---

## Rating System

### How Ratings Work:
- Customer rates courier after delivery (1-5 stars)
- Optional review text
- Categories: Professionalism, Timeliness, Communication, Care
- Ratings averaged into `courierProfile.averageRating`
- Total count in `courierProfile.totalRatings`

### Rating Thresholds:
- **5.0 - 4.5:** Excellent (badge: "Top Courier")
- **4.5 - 4.0:** Good
- **4.0 - 3.5:** Fair (warning shown)
- **< 3.5:** Suspended (if 5+ ratings)

### Auto-Suspension:
- Triggered if: `averageRating < 3.5` AND `totalRatings >= 5`
- Cloud function: `enforceRatings` runs on rating creation
- Creates dispute for admin review
- Courier can appeal via support

---

## Status Codes

### Courier Status:
- `pending` - Awaiting admin approval
- `approved` - Active, can accept jobs
- `suspended` - Temporarily blocked (low rating, violation)

### Job Status (Courier Workflow):
1. `open` - Available for claim (customer created)
2. `assigned` - Courier claimed, hasn't started
3. `enroute_pickup` - Heading to pickup location
4. `arrived_pickup` - At pickup, waiting for item
5. `picked_up` - Item in possession, heading to delivery
6. `enroute_dropoff` - On the way to delivery
7. `arrived_dropoff` - At delivery location
8. `completed` - Customer confirmed receipt
9. `cancelled` - Job cancelled
10. `disputed` - Issue reported

---

## Real-time Features

### Location Tracking:
- Uses `useCourierLocationWriter()` hook
- Updates every 10 seconds when online
- Writes to `users/{uid}/location` field
- Customer sees courier location on map (live)
- Auto-stops when courier goes offline

### Job Updates:
- All status changes use Firestore transactions
- Customer's job detail listens via `onSnapshot`
- Real-time badge count updates on dashboard
- Notifications sent to customer on status change

---

## Future Enhancements

### Phase 2:
- **Batched Routes:** Multi-stop deliveries (higher earnings)
- **Auto-Accept:** Auto-claim jobs matching criteria
- **Preferred Customers:** Priority accept for repeat customers
- **Scheduled Shifts:** Set availability in advance
- **Heat Maps:** See high-demand areas in real-time
- **In-App Navigation:** Built-in GPS (no Google Maps)
- **Voice Commands:** Hands-free status updates
- **Smart Suggestions:** AI recommends best jobs to accept

### Phase 3:
- **Courier Teams:** Partner with other couriers
- **Vehicle Expenses:** Track gas, maintenance
- **Tax Documents:** Auto-generate 1099s
- **Insurance Integration:** On-demand delivery insurance
- **Leaderboards:** Top earners weekly/monthly
- **Achievements:** Gamification (100 deliveries badge, etc.)

---

**Last Updated:** January 23, 2026
**Version:** 1.0

# Runner Role (Package Runner/Shifter) - Complete Documentation

## Role Identity
- **Icon:** 🚚
- **Display Name:** Runner / Shifter / Package Runner
- **Color:** Orange (#F59E0B)
- **Tagline:** "Shift Packages. Shift Income."
- **Purpose:** Long-haul interstate package transport (50-200+ miles)

---

## Architecture & Access

### How to Become a Runner
1. Sign up at `/login` with email/password
2. Navigate to `/runner/onboarding`
3. Complete 5-step application:
   - **Step 1:** Vehicle information (cargo van, sprinter, box truck)
   - **Step 2:** Driver's license + DOT/MC numbers
   - **Step 3:** Commercial insurance (required)
   - **Step 4:** Home hub selection + preferred routes
   - **Step 5:** Review and submit application
4. Status set to `pending_review`
5. Admin reviews at `/admin/runners`
6. Admin approves → Status: `approved`
7. Custom claim `packageRunner: true` set via Cloud Function
8. Runner can now access `/runner/dashboard` and claim routes

### User Document Structure
```typescript
{
  uid: string
  email: string
  displayName?: string
  role?: string // Optional, can be empty
  packageRunnerProfile: {
    // Status
    status: 'pending_review' | 'approved' | 'rejected' | 'suspended'
    approvedAt?: Timestamp
    approvedBy?: string  // Admin UID
    rejectedAt?: Timestamp
    rejectedBy?: string
    rejectionReason?: string
    
    // Contact
    phone: string
    
    // Vehicle
    vehicleType: 'cargo_van' | 'sprinter' | 'box_truck'
    vehicleDetails: {
      make: string
      model: string
      year: string
      licensePlate: string
      vin: string
    }
    
    // Licensing
    driverLicenseInfo: {
      number: string
      state: string
      expiryDate: string
    }
    dotNumber?: string  // Optional for larger operations
    mcNumber?: string   // Optional for interstate commerce
    
    // Insurance
    commercialInsurance: {
      provider: string
      policyNumber: string
      approved: boolean
      expiresAt: Date
    }
    
    // Service Area
    homeHub: {
      hubId: string
      name: string  // e.g., "San Francisco Hub"
      location: { lat: number; lng: number }
    }
    preferredRoutes: Array<{
      fromHub: string  // Hub ID
      toHub: string    // Hub ID
      routeName: string  // "SF → LA"
    }>
    
    // Stats
    totalRuns: number
    totalPackages: number
    totalMiles: number
    totalEarnings: number
    averageRating: number
    onTimePercentage: number
    availableForRuns: boolean
    
    // Stripe
    stripeConnectAccountId: string  // For payouts
  }
}
```

---

## Pages & Features

### 1. Dashboard (`/runner/dashboard`)
**Purpose:** Overview of runner activity and stats

**Features:**

**A) Status Banner:**
- If `status === 'approved'`:
  - Green banner: "✅ Active Shifter - Ready to accept shifts!"
- If `status === 'pending_review'`:
  - Yellow banner: "⏳ Application Under Review - Check back soon"
- If `status === 'rejected'`:
  - Red banner: "❌ Application Rejected - Contact support"

**B) Stats Cards:**
- **Completion Rate:** (completedRoutes / totalRoutes) × 100%
- **Total Miles:** Cumulative distance driven
- **Earnings This Month:** Current month revenue
- **Available Shifts:** Count of claimable routes

**C) Recent Shifts:**
- Last 5 routes with:
  - Route name (SF → LA)
  - Status (completed/in_progress/available)
  - Earnings
  - Completion date
  - Package count
- Link to "View All Shifts"

**D) Quick Actions:**
- Browse Available Shifts button → `/runner/available-routes`
- View Earnings button → `/runner/earnings`
- Edit Profile button → `/runner/profile`

---

### 2. Onboarding (`/runner/onboarding`)
**Purpose:** Application submission for package runner role

**Workflow:**

**Step 1: Vehicle Information**
- Vehicle type dropdown:
  - Cargo Van (payload: 1,500-3,000 lbs)
  - Sprinter Van (payload: 3,000-5,000 lbs)
  - Box Truck (payload: 5,000-10,000 lbs)
- Vehicle details:
  - Make
  - Model
  - Year
  - License plate
  - VIN number
- Photo upload: Vehicle exterior (required)

**Step 2: Driver Credentials**
- Driver's license info:
  - License number
  - State
  - Expiry date
  - Photo upload (front + back)
- DOT number (optional, for fleet operators)
- MC number (optional, for interstate commerce)

**Step 3: Commercial Insurance**
- Insurance provider name
- Policy number
- Coverage amount (minimum $100k required)
- Expiry date
- Certificate of insurance upload (PDF or photo)
- Platform validates: Must not be expired

**Step 4: Home Hub & Preferred Routes**
- Select home hub from dropdown (loads from `hubs` collection)
- Each hub shows:
  - Name (e.g., "San Francisco Distribution Center")
  - Address
  - Distance from current location
- Select up to 3 preferred routes:
  - SF → LA
  - LA → Phoenix
  - Phoenix → Las Vegas
- Preference used by route matching algorithm

**Step 5: Review & Submit**
- Summary of all entered data
- Terms & conditions checkbox
- Submit button
- On submit:
  - Creates `packageRunnerProfile` on user document
  - Sets `status: 'pending_review'`
  - Sends notification to admin
  - Redirects to pending status page

**After Submission:**
- Shows "Application Submitted" page
- "Your application is under review by our team"
- "You'll receive an email when approved"
- "Typical review time: 1-2 business days"

---

### 3. Available Routes (`/runner/available-routes`)
**Purpose:** Browse and claim long-haul routes

**Access Control:**
- Only approved runners (`status === 'approved'`)
- Unapproved redirected to onboarding

**Features:**

**A) Filters:**
- **Home Hub Filter:** Toggle "Show only routes from my home hub"
- **Date Filter:** Today, This Week, Next Week
- **Distance Filter:** < 100 mi, 100-150 mi, 150+ mi
- **Sort:** By earnings (high to low), by date, by distance

**B) Route Cards:**
Each route shows:
- **Route Name:** "San Francisco → Los Angeles"
- **Distance:** 380 miles
- **Package Count:** 24 packages
- **Estimated Time:** 6-7 hours
- **Total Earnings:** $450
- **Per Mile Rate:** $1.18/mi
- **Pickup Window:** Jan 24, 8:00 AM - 10:00 AM
- **Delivery Deadline:** Jan 24, 6:00 PM
- **Stop Count:** 3 stops (SF Hub → Fresno Hub → LA Hub)
- **Vehicle Required:** Sprinter or Box Truck
- **Status Badge:** Available
- **"Accept Shift" Button**

**C) Route Detail Modal:**
Click card → Opens modal with:
- Full route map (Mapbox)
- All stops listed in order
- Each stop shows:
  - Address
  - Package count
  - Type (pickup/delivery)
  - Time window
- Package manifests (if available)
- Special instructions
- Weather forecast for route
- **"Accept This Shift" Button**

**D) Claiming a Route:**
1. Runner clicks "Accept Shift"
2. Confirmation dialog: "Accept route SF → LA for $450?"
3. Runner confirms
4. Updates route document:
   - `status: 'claimed'`
   - `runnerId: <runner-uid>`
   - `runnerName: <runner-name>`
   - `claimedAt: serverTimestamp()`
5. Route removed from available list
6. Appears in "My Active Shifts"
7. Runner receives confirmation + route details email

---

### 4. My Shifts (`/runner/shifts`)
**Purpose:** View all claimed/completed routes

**Features:**

**A) Filter Tabs:**
- Active (in_progress)
- Completed
- Cancelled
- All

**B) Shift Cards:**
- Route name
- Status badge
- Pickup date/time
- Completion date/time (if done)
- Earnings
- Package count
- Miles driven
- "View Details" button

**C) Shift Detail Page:**
- Full route info
- Stop-by-stop progress
- Package tracking numbers
- Proof of delivery photos
- Earnings breakdown
- Time breakdown (drive time, stop time)

---

### 5. Active Shift (`/runner/active-shift`)
**Purpose:** Navigate and complete current route

**Features:**

**A) Map View:**
- Full-screen map
- All stops marked
- Current stop highlighted (green)
- Completed stops (gray checkmark)
- Upcoming stops (orange)
- Runner's current location (blue dot)
- Route polyline (optimized path)

**B) Progress Header:**
- "Stop 2 of 5"
- Progress bar: 40% complete
- Total packages: "18 delivered, 24 total"
- Estimated time remaining: "3 hrs 15 min"

**C) Current Stop Card:**
- Stop address
- Package count for this stop
- Special instructions
- Contact info (if available)
- **"Capture Proof of Delivery" Button**
  - Opens camera
  - Captures GPS-tagged photo
  - Requires photo to mark stop complete
- **"Mark Stop Complete" Button**
  - Validates photo captured
  - Updates route progress
  - Advances to next stop

**D) Upcoming Stops Preview:**
- Next 3 stops listed
- Distance to each
- ETA to each
- Package count

**E) Actions:**
- Call dispatch
- Report issue
- Skip stop (requires reason + admin approval)
- Navigate to stop (opens Google Maps)

---

### 6. Earnings (`/runner/earnings`)
**Purpose:** Track income and payouts

**Features:**

**A) Summary Cards:**
- **Total Earnings:** All-time
- **This Month:** Current month
- **Last Month:** Previous month
- **Pending Payout:** Awaiting transfer

**B) Filters:**
- Date range: Last 7 days, 30 days, 3 months, Custom
- Route status: Completed, Cancelled, All

**C) Earnings List:**
Each route shows:
- Date completed
- Route name
- Packages delivered
- Miles driven
- Base earnings
- Bonuses (on-time, high volume)
- Total earned
- Payout status (paid/pending)

**D) Charts:**
- Earnings over time (line chart)
- Earnings by route (bar chart)
- Miles by month (area chart)

**E) Payout Schedule:**
- Weekly payouts (every Wednesday)
- Minimum: $100
- Method: Direct deposit via Stripe Connect
- Processing time: 2-5 business days

---

### 7. Profile (`/runner/profile`)
**Purpose:** View and edit runner information

**Features:**

**A) Status Card:**
- Application status badge
- Approval date (if approved)
- Admin who approved

**B) Vehicle Info:**
- Vehicle type, make, model, year
- License plate
- Photo
- "Edit Vehicle" button

**C) Credentials:**
- Driver's license info
- DOT/MC numbers
- Expiry dates
- "Update Credentials" button

**D) Insurance:**
- Provider, policy number
- Coverage amount
- Expiry date
- Renewal reminder (30 days before expiry)
- "Upload New Certificate" button

**E) Home Hub & Routes:**
- Current home hub
- Preferred routes list
- "Change Home Hub" button
- "Update Preferences" button

**F) Stats:**
- Total runs completed
- Total miles driven
- On-time percentage
- Average rating
- Total earnings

---

### 8. Settings (`/runner/settings`)
**Purpose:** Preferences and notifications

**Features:**
- Notification settings:
  - New route alerts
  - Route reminders
  - Payout notifications
- Availability toggle:
  - "Available for shifts" (on/off)
  - When off: No routes shown
- Dark mode
- Language preference
- Sign out

---

## Navigation

### Bottom Navigation
```typescript
[
  { icon: "🏠", label: "Dashboard", href: "/runner/dashboard" },
  { icon: "🗺️", label: "Shifts", href: "/runner/available-routes" },
  { icon: "💵", label: "Earnings", href: "/runner/earnings" },
  { icon: "👤", label: "Profile", href: "/runner/profile" }
]
```

---

## Interactions with Other Roles

### 👉 Runner → Customer
**Indirect Interaction:**
- Customer ships package → Runner transports
- Customer tracks package via tracking number
- Runner delivers package to destination hub
- Last-mile courier delivers to customer
- Customer sees runner's name in package timeline (optional)

**Data Flow:**
- Package assigned to route → Route assigned to runner
- Runner completes route → Package status updated
- Customer tracking shows: "In transit with [Runner Name]"

---

### 👉 Runner → Courier
**Handoff Interaction:**
- Runner delivers packages to destination hub
- Couriers pick up packages from hub for local delivery
- No direct communication (hub manages handoff)

---

### 👉 Runner → Admin
**Admin Oversight:**
1. **Application:** Admin reviews and approves/rejects
2. **Insurance:** Admin verifies insurance validity
3. **Performance:** Admin monitors on-time rate, ratings
4. **Disputes:** Admin handles customer complaints
5. **Suspension:** Admin can suspend runner for violations

**Data Flow:**
- Runner applies → Admin sees in `/admin/runners` (pending tab)
- Admin approves → Sets `status: 'approved'`, sets custom claim
- Admin rejects → Sets `status: 'rejected'`, adds reason
- Low performance → Admin reviews, can suspend

---

### 👉 Runner → Vendor
**No Direct Interaction:**
- Packages picked up from hubs, not vendor locations
- Hubs aggregate packages from multiple vendors

---

## Permissions

### ✅ Runner CAN:
- Apply for package runner role
- View available long-haul routes
- Claim routes matching vehicle type
- Navigate and complete multi-stop routes
- Capture GPS-tagged proof of delivery
- View earnings and payout history
- Update vehicle/insurance info
- Set preferred routes
- Toggle availability on/off
- **Also:** Has all customer permissions (can order from marketplace)

### ❌ Runner CANNOT:
- Claim routes without approval
- Claim routes requiring larger vehicle than owned
- Skip stops without admin approval
- Modify route order
- Accept local delivery jobs (that's courier role)
- Access admin features
- View other runners' data
- Change payout schedule
- Edit route earnings after completion

---

## Firestore Security Rules

```javascript
// Runner can read routes assigned to them or available
match /longHaulRoutes/{routeId} {
  allow read: if request.auth.uid == resource.data.runnerId
              || resource.data.status == 'available';
  
  // Runner can claim available routes
  allow update: if resource.data.status == 'available'
                && request.resource.data.status == 'claimed'
                && request.resource.data.runnerId == request.auth.uid;
  
  // Runner can update their route progress
  allow update: if request.auth.uid == resource.data.runnerId
                && isValidRouteStatusTransition(resource, request.resource);
}

// Runner can update their profile
match /users/{userId} {
  allow update: if request.auth.uid == userId
                && request.resource.data.packageRunnerProfile != null;
}
```

---

## Key Workflows

### Workflow 1: Apply and Get Approved
1. User navigates to `/runner/onboarding`
2. Completes 5-step form with vehicle, license, insurance
3. Uploads required documents (license, insurance certificate)
4. Submits application
5. Status set to `pending_review`
6. Admin receives notification
7. Admin reviews at `/admin/runners`
8. Admin clicks "Approve"
9. Status → `approved`, Cloud Function sets custom claim
10. Runner receives email notification
11. Runner can now claim routes

### Workflow 2: Claim and Complete Route
1. Runner logs in → Dashboard
2. Clicks "Browse Available Shifts"
3. Filters: "From my home hub" ON
4. Finds route: SF → LA, $450, 24 packages
5. Clicks route card → Reviews details
6. Clicks "Accept Shift"
7. Confirms → Route claimed
8. Route appears in "My Shifts"
9. On pickup day, runner starts route
10. Navigates to first stop (SF Hub)
11. Loads packages at hub
12. Marks stop complete
13. Drives to Stop 2 (Fresno Hub)
14. Unloads 8 packages
15. Captures proof of delivery photo
16. Marks stop complete
17. Drives to Stop 3 (LA Hub)
18. Unloads remaining 16 packages
19. Captures final proof photo
20. Marks route complete
21. Earnings added to pending balance
22. Weekly payout on Wednesday

### Workflow 3: Handle Rejection
1. Runner submits application
2. Admin reviews → Finds expired insurance
3. Admin clicks "Reject"
4. Enters reason: "Insurance certificate expired"
5. Status → `rejected`
6. Runner receives email with reason
7. Runner updates insurance
8. Runner re-submits application
9. Admin approves on second review

---

## Earnings & Payouts

### Fee Structure:
- **Base Rate:** $1.00 - $1.50 per mile (varies by route)
- **Fuel Surcharge:** $0.20 per mile (covers gas)
- **Stop Fee:** $15 per stop (for hub unload/load)
- **On-Time Bonus:** +10% if all stops on time
- **High Volume Bonus:** +$50 for 30+ packages
- **Weekend Rate:** +20% for Saturday/Sunday runs

### Example Calculation:
**Route:** SF → LA (380 miles, 3 stops, 24 packages)
- Base: 380 mi × $1.20/mi = $456
- Stops: 3 × $15 = $45
- Total: $501
- On-Time Bonus (if met): $501 × 0.10 = $50.10
- **Final Earnings:** $551.10

### Payment Schedule:
- **Payout Day:** Every Wednesday
- **Includes:** All routes completed in previous 7 days
- **Minimum:** $100 (rolls over if under)
- **Method:** Direct deposit (Stripe Connect)
- **Time:** 2-5 business days to bank account

---

## Hub System

### What are Hubs?
- Distribution centers for package aggregation
- Collection: `hubs` in Firestore
- Examples:
  - San Francisco Hub (lat: 37.7749, lng: -122.4194)
  - Los Angeles Hub (lat: 34.0522, lng: -118.2437)
  - Phoenix Hub (lat: 33.4484, lng: -112.0740)

### Hub Operations:
- **Inbound:** Packages arrive from local couriers
- **Sort:** Packages sorted by destination
- **Outbound:** Loaded onto runner's vehicle
- **Tracking:** Each package scanned at each hub

### Runner-Hub Interaction:
- Runner picks up consolidated packages from origin hub
- Runner delivers to destination hub(s)
- Last-mile couriers handle final delivery from hub

---

## Route Optimization

### How Routes are Built:
- Cloud Function: `buildLongHaulRoutes` (runs nightly)
- Groups packages by:
  - Origin hub
  - Destination hub
  - Delivery deadline
- Creates routes with 2-5 stops
- Optimizes for:
  - Distance efficiency
  - Time windows
  - Vehicle capacity
  - Stop order

### Route Types:
- **Point-to-Point:** Single origin → single destination
- **Multi-Stop:** Origin → Hub 1 → Hub 2 → Destination
- **Loop Route:** Origin → Hub 1 → Hub 2 → Back to Origin

---

## Future Enhancements

### Phase 2:
- **Team Runs:** Partner with another runner, split earnings
- **Overnight Routes:** Sleep at hub, continue next day
- **Return Loads:** Pick up packages on return trip
- **Dedicated Lanes:** Reserve specific routes weekly
- **Fuel Card Integration:** Platform-provided fuel card
- **Toll Reimbursement:** Auto-reimbursed tolls

### Phase 3:
- **Dynamic Pricing:** Surge pricing for high-demand routes
- **Route Auctions:** Runners bid on premium routes
- **Subscription Model:** Pay monthly for guaranteed routes
- **Fleet Management:** Runners with multiple vehicles
- **Leaderboards:** Top earners, on-time champions

---

**Last Updated:** January 23, 2026
**Version:** 1.0

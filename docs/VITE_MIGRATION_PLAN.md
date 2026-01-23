# Vite Migration - Complete Role-Based Portal Plan

## 🎯 Overview
Migrating from Next.js to Vite for all three role-based portals, replicating the exact design system and functionality from the existing Next.js app.

**Branch:** `feature/issue-33-vite-migration`
**Strategy:** No freestyling - match Next.js design exactly

---

## 🎨 Design System (Replicate from Next.js)

### Color Palette
- Primary: `#6B4EFF` (Purple)
- Secondary: `#9D7FFF` (Light Purple)
- Background: `#F8F9FF` (Light Purple Background)
- Accent gradients: Purple to Light Purple

### Component Library (Port from Next.js `/components/ui/`)
- ✅ **Card** - Multiple variants (default, elevated, gradient)
- ✅ **StatCard** - Stats with icons, values, trends
- ✅ **Badge** - Status badges for job/package states
- ⏳ **Avatar** - User profile images
- ⏳ **Skeleton** - Loading placeholders
- ⏳ **DonutChart** - Spending breakdown charts
- ⏳ **Button** - Primary, secondary, outline variants
- ⏳ **Input** - Form inputs with consistent styling
- ⏳ **MapboxMap** - Interactive delivery maps
- ⏳ **JobPreview** - Job card preview components

### Layout Structure
- Sidebar navigation (left)
- Top bar with user profile + notifications
- Main content area with padding
- Consistent card-based layouts
- Rounded corners (20px)
- Purple shadow effects

---

## 👤 CUSTOMER PORTAL - Implementation Plan

### Pages Structure
```
/customer-app/src/pages/
├── Login.tsx                    ✅ DONE
├── Dashboard.tsx                ✅ DONE (needs design polish)
├── Jobs.tsx                     ✅ DONE (needs design polish)
├── RequestDelivery.tsx          ✅ DONE (address autocomplete added)
├── JobDetail.tsx                ⏳ TODO
├── Orders.tsx                   ⏳ TODO
├── Packages.tsx                 ⏳ TODO
├── PackageDetail.tsx            ⏳ TODO
├── Checkout.tsx                 ⏳ TODO
├── Profile.tsx                  ⏳ TODO
├── Settings.tsx                 ⏳ TODO
├── Notifications.tsx            ⏳ TODO
└── Payment.tsx                  ⏳ TODO
```

### Customer Dashboard Design Spec
**Source:** `/apps/web/src/app/customer/dashboard/page.tsx`

#### Top Stats Row
- **Total Spent** - Dollar amount, purple gradient card
- **Active Deliveries** - Count with truck icon
- **Completed Jobs** - Count with checkmark icon
- **Saved Addresses** - Count with location pin icon

#### Spending Breakdown
- Donut chart showing:
  - Delivery fees
  - Package costs
  - Tips
- Legend with color coding
- Total amount in center

#### Recent Activity Section
- Tabs: All, Packages, Deliveries, Orders
- Activity cards with:
  - Icon (package/delivery/order)
  - Title and description
  - Status badge
  - Timestamp (relative time)
  - Link to detail page

#### Quick Actions
- "Request Delivery" button (primary purple)
- "Ship Package" button (secondary)
- "Browse Marketplace" button (outline)

#### Saved Addresses
- List of favorite addresses
- Quick select for delivery
- Add new address option

### Customer Jobs Page Design Spec
**Source:** `/apps/web/src/app/customer/jobs/page.tsx`

#### Header
- Page title: "My Deliveries"
- "New Delivery Request" button (top right, purple)

#### Filters & Tabs
- Status tabs: All, Active, Completed, Cancelled
- Search bar (filter by address/description)

#### Job Cards (Grid Layout)
Each card shows:
- **Header:** Job ID + Status badge
- **Pickup:** Address with 📍 icon
- **Delivery:** Address with 🎯 icon
- **Courier:** Avatar + name (if assigned)
- **Fee:** Dollar amount
- **Created:** Timestamp
- **Actions:** View Details button

Empty State:
- Icon illustration
- "No deliveries yet"
- "Request your first delivery" CTA button

### Customer Request Delivery Design Spec
**Source:** `/apps/web/src/app/customer/request-delivery/page.tsx`

#### Form Structure (Cards)

**1. Pickup Details Card** 📍
- Address autocomplete (Mapbox) ✅ DONE
- Pickup phone (optional)
- Special instructions textarea

**2. Delivery Details Card** 🎯
- Address autocomplete (Mapbox) ✅ DONE
- Delivery phone (optional)
- Special instructions textarea

**3. Item Details Card** 📦
- Item description (required)
- Item weight/size dropdown
- Fragile checkbox
- Photo upload (optional)

**4. Vehicle Type Card** 🚗
- Visual selector buttons:
  - 🚲 Bike ($10 base)
  - 🚗 Car ($15 base)
  - 🚐 Van ($25 base)
- Selected state: purple border + background

**5. Pricing Estimate Card** 💰
- Distance calculation
- Base fee breakdown
- Estimated total (large, bold)

**Submit Button:**
- Full width, purple gradient
- "Request Delivery - $XX.XX"
- Loading state with spinner

### Customer Job Detail Design Spec
**Source:** `/apps/web/src/app/customer/jobs/[jobId]/page.tsx`

#### Header Section
- Back button
- Job ID
- Large status badge
- Actions menu (cancel, contact support)

#### Map Section
- Mapbox map showing:
  - Pickup marker (green pin)
  - Delivery marker (red pin)
  - Courier current location (blue dot) if active
  - Route polyline

#### Timeline Section
- Vertical timeline showing:
  - ✅ Created (timestamp)
  - ⏳ Courier assigned (timestamp or pending)
  - ⏳ Picked up (timestamp or pending)
  - ⏳ In transit (timestamp or pending)
  - ⏳ Delivered (timestamp or pending)

#### Details Cards
**Pickup Details:**
- Full address
- Contact phone
- Special instructions

**Delivery Details:**
- Full address
- Contact phone
- Special instructions

**Item Details:**
- Description
- Weight/size
- Photos (if uploaded)

**Courier Details** (if assigned):
- Avatar + name
- Rating stars
- Vehicle type + license plate
- Contact button (call/message)

**Payment Details:**
- Agreed fee
- Payment method
- Payment status

#### Action Buttons
- Contact Courier (if assigned)
- Cancel Delivery (if not picked up)
- Report Issue
- Rate & Tip (if completed)

---

## 🚚 COURIER PORTAL - Implementation Plan

### Pages Structure
```
/courier-app/src/pages/
├── Login.tsx                    ⏳ TODO
├── Dashboard.tsx                ⏳ TODO
├── Jobs.tsx                     ⏳ TODO
├── JobDetail.tsx                ⏳ TODO
├── ActiveRoute.tsx              ⏳ TODO
├── RateCards.tsx                ⏳ TODO
├── Routes.tsx                   ⏳ TODO
├── Equipment.tsx                ⏳ TODO
├── Onboarding.tsx               ⏳ TODO
├── Settings.tsx                 ⏳ TODO
└── Setup.tsx                    ⏳ TODO
```

### Courier Dashboard Design Spec
**Source:** `/apps/web/src/app/courier/dashboard/page.tsx`

#### Online Status Toggle
- Large toggle switch (top left)
- "Online" / "Offline" status
- Green/gray color states
- Auto-starts GPS tracking when online

#### Map Section (Main Feature)
- Full-width Mapbox map
- Shows:
  - Courier's current location (blue pulsing dot)
  - Available jobs (purple pins)
  - Selected job (green pin with highlight)
  - Pickup/delivery markers for selected job
  - Radius circle (delivery range)

#### Available Jobs Sidebar
- List of nearby jobs
- Each job shows:
  - Distance from courier (miles)
  - Pickup → Delivery addresses
  - Estimated fee
  - Vehicle type required
  - Time estimate
  - "Accept" button

#### Eligibility Filtering
- Toggle: "Show Ineligible Jobs"
- Red badges for ineligible jobs with reason:
  - "Too far from pickup"
  - "Job distance exceeds limit"
  - "Wrong vehicle type"

#### Active Job Banner
- Sticky top banner when job is active
- Shows current delivery status
- Quick nav to active route page

#### Stats Cards (Bottom Row)
- Today's Earnings
- Jobs Completed Today
- Average Rating
- Hours Online

### Courier Active Route Design Spec
**Source:** `/apps/web/src/app/courier/active-route/page.tsx`

#### Full-Screen Map
- Courier location (live tracking)
- Pickup location (if not picked up)
- Delivery location
- Route polyline with turn-by-turn
- ETA to next stop

#### Job Status Card (Overlay Bottom)
- Current status (going to pickup / going to delivery)
- Next action button:
  - "Arrived at Pickup" → "Mark Picked Up"
  - "Arrived at Delivery" → "Mark Delivered"
- Customer contact buttons
- Navigation app link (Google Maps / Waze)

#### Customer Info Card
- Pickup contact
- Delivery contact
- Item description
- Special instructions

### Courier Rate Cards Design Spec
**Source:** `/apps/web/src/app/courier/rate-cards/page.tsx`

#### Package Rate Card
- Min/Max pickup distance (miles)
- Min/Max job distance (miles)
- Fee per mile
- Minimum fee
- Preview pricing table

#### Food Rate Card (separate card)
- Same structure as package
- Different rates for food delivery

**Form:**
- Input fields for all parameters
- Validation (max > min, etc.)
- Save button
- Preview updates in real-time

---

## 🛡️ ADMIN PORTAL - Implementation Plan

### Pages Structure
```
/admin-app/src/pages/
├── Login.tsx                    ⏳ TODO
├── Dashboard.tsx                ⏳ TODO
├── Users.tsx                    ⏳ TODO
├── Packages.tsx                 ⏳ TODO
├── Routes.tsx                   ⏳ TODO
├── Runners.tsx                  ⏳ TODO
├── EquipmentReview.tsx          ⏳ TODO
├── Analytics.tsx                ⏳ TODO
├── FeatureFlags.tsx             ⏳ TODO
├── SyncEmails.tsx               ⏳ TODO
├── EnablePhase2.tsx             ⏳ TODO
└── Settings.tsx                 ⏳ TODO
```

### Admin Dashboard Design Spec
**Source:** `/apps/web/src/app/admin/dashboard/page.tsx`

#### Overview Stats (Top Row, 4 Cards)
- Total Users (with breakdown)
- Total Packages
- Active Routes
- Revenue (if tracking)

#### Management Grid
Cards with icons for quick access:

1. **User Management** 👥
   - View all users
   - Count badge
   - Purple background

2. **Runner Approvals** 🚚
   - Pending applications
   - Red notification badge
   - Orange background

3. **Equipment Review** 🔧
   - Pending equipment submissions
   - Count badge
   - Yellow background

4. **Package Management** 📦
   - Active packages
   - Count badge
   - Blue background

5. **Route Management** 🗺️
   - Active routes
   - Count badge
   - Green background

6. **Analytics** 📊
   - View reports
   - Purple background

7. **Feature Flags** 🚩
   - Toggle features
   - Count badge
   - Red background

8. **Settings** ⚙️
   - System config
   - Gray background

#### Recent Activity Feed
- Real-time updates
- User registrations
- Job completions
- Runner applications
- System events

#### System Health
- Firebase status
- API status
- Stripe status
- Mapbox status

### Admin Users Page Design Spec
**Source:** `/apps/web/src/app/admin/users/page.tsx`

#### Filters & Search
- Search by email/name
- Role filter dropdown (all, customer, courier, admin)
- Status filter (active, pending, suspended)

#### Users Table
Columns:
- Avatar
- Name
- Email
- Role (badge)
- Status (badge)
- Joined Date
- Last Active
- Actions (view, edit, delete)

Pagination:
- 20 per page
- Page numbers
- Total count

#### User Detail Modal
- Full profile info
- Role management
- Status management
- Activity history
- Delete user action

### Admin Runners Page Design Spec
**Source:** `/apps/web/src/app/admin/runners/page.tsx`

#### Pending Approvals Section
- Card for each pending runner
- Shows:
  - Name + email
  - Vehicle type
  - License plate
  - Documents (view links)
  - Approve/Reject buttons

#### Approved Runners List
- Table view
- Filter by status
- View profile button

---

## 🏗️ Shared Infrastructure

### Components to Port
1. **Layout Components**
   - CustomerLayout ✅ DONE
   - CourierLayout ⏳ TODO
   - AdminLayout ⏳ TODO

2. **UI Components**
   - Card, CardHeader, CardTitle, CardContent ✅ DONE
   - StatCard ✅ DONE
   - StatusBadge ✅ DONE
   - Avatar ⏳ TODO
   - Button ⏳ TODO
   - Input ⏳ TODO
   - Skeleton ⏳ TODO
   - DonutChart ⏳ TODO
   - Tabs ⏳ TODO
   - Modal ⏳ TODO
   - Dropdown ⏳ TODO

3. **Feature Components**
   - AddressAutocomplete ✅ DONE
   - MapboxMap ⏳ TODO
   - JobPreview ⏳ TODO
   - CourierJobPreview ⏳ TODO
   - PackageCard ⏳ TODO

### Utilities to Port
- formatCurrency ✅ DONE
- formatDate ✅ DONE
- cn (classnames) ✅ DONE
- calcMiles ⏳ TODO
- getEligibilityReason ⏳ TODO
- claimJob ⏳ TODO

### Firebase Hooks to Port
- useAuthUser ⏳ TODO
- useUserDoc ⏳ TODO
- useCustomerJobs ⏳ TODO
- useOpenJobs ⏳ TODO
- useCourierLocationWriter ⏳ TODO

---

## 📋 Implementation Checklist

### Phase 1: Customer Portal Core (Current) 🔄
- [x] Login page
- [x] Basic Dashboard
- [x] Jobs list
- [x] Request Delivery form
- [x] Address autocomplete
- [ ] **Polish Dashboard to match Next.js design exactly**
- [ ] **Polish Jobs page to match Next.js design exactly**
- [ ] **Job Detail page**
- [ ] **Test full customer flow end-to-end**

### Phase 2: Complete Customer Portal
- [ ] Orders page
- [ ] Packages page
- [ ] Package Detail page
- [ ] Checkout page
- [ ] Profile page
- [ ] Settings page
- [ ] Notifications page
- [ ] Payment page

### Phase 3: Courier Portal
- [ ] Setup courier-app workspace
- [ ] Port design system
- [ ] Login page
- [ ] Dashboard with map
- [ ] Available jobs list
- [ ] Active route page
- [ ] Rate cards page
- [ ] Equipment submission
- [ ] Onboarding flow

### Phase 4: Admin Portal
- [ ] Setup admin-app workspace
- [ ] Port design system
- [ ] Login page
- [ ] Dashboard
- [ ] Users management
- [ ] Runner approvals
- [ ] Equipment review
- [ ] Analytics page
- [ ] Feature flags
- [ ] Settings

### Phase 5: Deployment & Testing
- [ ] Build all three apps
- [ ] Deploy to Firebase Hosting
- [ ] End-to-end testing per role
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Create Pull Request

---

## 🎯 Current Status

### Completed ✅
- Vite customer-app setup
- Firebase integration
- Login functionality
- Basic Dashboard (needs design polish)
- Jobs list (needs design polish)
- Request Delivery form
- Address autocomplete with Mapbox
- Core UI components (Card, StatCard, Badge)

### In Progress 🔄
- Request Delivery form polish

### Next Steps (In Order)
1. **Polish Customer Dashboard** - Match exact Next.js design
2. **Polish Customer Jobs Page** - Match exact Next.js design
3. **Build Job Detail Page** - Complete design from Next.js
4. **Test Full Customer Flow** - Before moving to next role
5. **Start Courier Portal** - After customer is 100% done

---

## 🎨 Design Consistency Rules

1. **Always use the Next.js app as reference** - Don't freestyle designs
2. **Match colors exactly** - Use the purple theme (#6B4EFF)
3. **Keep rounded corners at 20px** - Consistent with Next.js
4. **Use shadow styles from Card component** - Purple-tinted shadows
5. **Match spacing** - Use Tailwind's spacing scale
6. **Icon consistency** - Use emoji or lucide-react icons
7. **Typography** - Match font sizes and weights
8. **Status badges** - Same color coding for statuses
9. **Button styles** - Match primary/secondary/outline variants
10. **Form inputs** - Consistent border, focus states

---

## 📦 Package Dependencies

### Already Installed (customer-app)
- `firebase` - Auth, Firestore, Storage
- `react-router-dom` - Client routing
- `tailwindcss` - Styling

### Need to Add (customer-app)
- `mapbox-gl` - Maps
- `@types/mapbox-gl` - TypeScript types
- `recharts` - Charts for dashboard
- `date-fns` - Better date formatting
- `react-hot-toast` - Notifications
- `lucide-react` - Icon library

### Courier App (when started)
- Same as customer-app

### Admin App (when started)
- Same as customer-app
- Additional data table libraries if needed

---

## 🔑 Environment Variables

### All Apps Share Same `.env.local`
```env
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ29zZW5kZXJyIiwiYSI6ImNtZjFlc2pkMTJheHIya29ub251YjZjMzQifQ.Oav2gJB_Z1sSPjOzjTPCzA

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=...
```

---

## 📝 Notes

- **Testing First:** Per user request, test each workflow before moving on
- **No Ghost Features:** Build complete features, not half-implemented ones
- **Design Accuracy:** Match Next.js design exactly, no improvisation
- **Code Quality:** TypeScript strict mode, proper error handling
- **Performance:** Keep builds fast (~1-2s), bundles small (~200KB gzip)
- **Systematic Approach:** Complete customer portal 100% before starting courier or admin

---

**Last Updated:** January 23, 2026  
**Branch:** `feature/issue-33-vite-migration`  
**Current Phase:** Phase 1 - Customer Portal Core  
**Status:** Address autocomplete added, polish dashboard & jobs page next

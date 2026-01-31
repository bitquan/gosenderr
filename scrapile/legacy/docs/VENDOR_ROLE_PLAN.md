# Vendor Role (Marketplace Seller) - Complete Documentation

## Role Identity
- **Icon:** 🏪
- **Display Name:** Vendor / Market Senderr / Seller
- **Color:** Blue (#3B82F6)
- **Tagline:** "List. Sell. Earn."
- **Purpose:** Sell items on the marketplace with integrated delivery

---

## Architecture & Access

### How to Become a Vendor
1. Sign up at `/login` with email/password
2. Browse marketplace → Click "Sell on GoSenderr"
3. OR navigate to `/marketplace/create`
4. See vendor upgrade prompt if not vendor
5. Click "Become a Market Senderr"
6. Platform automatically:
   - Sets `role: 'vendor'` in user document
   - Redirects to Stripe Connect onboarding
7. Complete Stripe Connect setup:
   - Business information
   - Bank account details
   - Tax information (W-9 or W-8)
8. Stripe account verified
9. Can now create listings

### User Document Structure
```typescript
{
  uid: string
  email: string
  displayName?: string
  role: 'vendor'
  vendorProfile?: {
    // Stripe
    stripeConnectAccountId: string
    stripeAccountVerified: boolean
    payoutsEnabled: boolean
    
    // Business Info
    businessName?: string
    businessType?: 'individual' | 'company'
    businessAddress?: {
      street: string
      city: string
      state: string
      zip: string
      country: string
    }
    
    // Stats
    totalListings: number
    activeListings: number
    soldListings: number
    totalRevenue: number
    averageRating: number
    totalRatings: number
    
    // Settings
    autoAcceptOrders: boolean
    prepTimeMinutes: number  // Avg time to mark order ready
    notificationsEnabled: boolean
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Pages & Features

### 1. Dashboard (`/vendor/dashboard`)
**Purpose:** Central hub for vendor activity

**Features:**

**A) Stats Cards:**
- **Total Sales:** All-time revenue
- **This Month:** Current month earnings
- **Active Listings:** Items available for sale
- **Pending Orders:** Orders awaiting fulfillment
- **Rating:** Average customer rating

**B) Recent Orders:**
- Last 10 orders with:
  - Order ID
  - Item name
  - Buyer name (masked: "John D.")
  - Status (pending/ready/delivered)
  - Amount
  - Order date
- "View All Orders" link

**C) Top Selling Items:**
- 5 best-selling items
- Shows: Name, units sold, revenue
- Helps vendor understand what sells

**D) Quick Actions:**
- **Create New Listing** → `/marketplace/create`
- **View All Listings** → `/vendor/items`
- **Manage Orders** → `/vendor/orders`
- **View Analytics** → `/vendor/analytics`

**E) Low Stock Alerts:**
- If listing has `quantity < 5` (future feature)
- "Running low on: [Item Name]"

---

### 2. Create Listing (`/marketplace/create`)
**Purpose:** Add new item to marketplace

**Access Control:**
- If `role !== 'vendor'`:
  - Shows upgrade prompt
  - "Become a Market Senderr" button
  - Explains benefits:
    - ✅ List unlimited items
    - 💰 Integrated Stripe payments
    - 📦 Automatic delivery coordination
    - 📊 Sales analytics

**Form Fields:**

**Basic Info:**
- **Title** (required): Max 100 characters
- **Description** (required): Max 500 characters
- **Price** (required): Decimal, min $0.01
- **Category** (required):
  - Electronics
  - Furniture
  - Clothing
  - Food
  - Other

**Item Details:**
- **Condition** (required):
  - New
  - Like New
  - Good
  - Fair
  - Poor
- **Delivery Methods** (checkboxes):
  - ☑ Delivery (integrated courier)
  - ☐ Pickup (buyer picks up from location)
  - Can select both
  - Pickup = 0% fees (no Stripe, no platform)

**Photos:**
- Upload up to 5 photos
- Drag to reorder
- First photo = main listing image
- Max 5MB per photo
- Formats: JPG, PNG, WEBP
- Auto-resized and optimized

**Pickup Location:**
- Mapbox address autocomplete
- Saves as GeoPoint with lat/lng
- Label: "123 Main St, San Francisco, CA"
- Used for distance calculations

**Food-Specific Fields** (if category = 'food'):
- **Temperature:**
  - Hot
  - Cold
  - Frozen
  - Room Temperature
- **Equipment Required:**
  - ☐ Requires Cooler
  - ☐ Requires Hot Bag
  - ☐ Requires Drink Carrier
- **Pickup Instructions:** Text field
  - "Wait at front counter"
  - "Ring doorbell"
- **Pickup Reference Photo:** Upload photo of packaged item
  - Helps courier identify correct order
- **Dietary Info** (future):
  - Allergens
  - Vegan/vegetarian
  - Gluten-free

**Validation:**
- All required fields must be filled
- At least 1 photo required
- Price must be > 0
- Pickup location must be selected
- Food items: Pickup instructions required

**On Submit:**
1. Validates form
2. Uploads photos to Firebase Storage (`items/{uid}/photo-{itemId}-{index}.jpg`)
3. Creates item document in `items` collection:
   ```typescript
   {
     sellerId: uid
     title: "Item Title"
     description: "..."
     price: 25.00
     category: 'electronics'
     condition: 'like_new'
     deliveryMethods: ['delivery', 'pickup']
     photos: ['url1', 'url2', ...]
     pickupLocation: { address, lat, lng }
     isFoodItem: false
     status: 'available'
     createdAt: serverTimestamp()
   }
   ```
4. Redirects to `/marketplace/[itemId]` (item detail page)
5. Item appears in marketplace immediately

---

### 3. My Listings (`/vendor/items`)
**Purpose:** Manage all vendor's items

**Features:**

**A) Filter Tabs:**
- All
- Available (status: 'available')
- Sold (status: 'sold')
- Unavailable (status: 'unavailable')

**B) Search & Sort:**
- Search by title, description
- Sort by:
  - Date listed (newest first)
  - Price (high to low, low to high)
  - Views (most viewed first)

**C) Item Cards:**
Each listing shows:
- Photo (first image)
- Title
- Price
- Status badge
- Views count (future)
- Date listed
- **Actions:**
  - Edit button → `/vendor/items/[itemId]/edit`
  - Mark as Sold button (if available)
  - Mark as Unavailable (temporarily hide)
  - Delete button (confirmation required)

**D) Bulk Actions:**
- Select multiple items
- Bulk delete
- Bulk mark unavailable
- Bulk price update (future)

**E) Empty State:**
- "No listings yet"
- "Create your first listing to start selling"
- CTA button → `/marketplace/create`

---

### 4. Edit Listing (`/vendor/items/[itemId]/edit`)
**Purpose:** Update existing item

**Features:**
- Pre-filled form with current item data
- Can update:
  - Title, description, price
  - Category, condition
  - Photos (add/remove/reorder)
  - Pickup location
  - Delivery methods
- Can't change: Item ID, seller, creation date
- Save button → Updates Firestore document
- Cancel button → Returns without saving

---

### 5. Orders (`/vendor/orders`)
**Purpose:** Manage incoming orders

**Features:**

**A) Filter Tabs:**
- Pending (payment_pending, paid, preparing)
- Ready for Pickup (ready_for_pickup)
- In Delivery (in_transit)
- Completed (delivered)
- Cancelled (cancelled, refunded)

**B) Order Cards:**
Each order shows:
- **Order ID:** `ORD-123456`
- **Item:** Name + photo
- **Buyer:** Name (masked: "Sarah M.")
- **Amount:** $25.00
- **Status Badge:**
  - Yellow: Pending
  - Blue: Ready
  - Green: Delivered
  - Red: Cancelled
- **Order Date:** Jan 23, 2026
- **Delivery Method:** Delivery or Pickup
- **Actions:**
  - View Details
  - Mark Ready (if status = 'paid')
  - Contact Buyer
  - Cancel Order (if not delivered)

**C) Actions Required Section:**
- Highlights orders needing attention
- "2 orders waiting to be marked ready"
- Click → Filters to show only those orders

---

### 6. Order Detail (`/vendor/orders/[orderId]`)
**Purpose:** View single order details

**Features:**

**A) Order Information:**
- Order ID
- Status timeline:
  1. ✓ Order Placed
  2. ✓ Payment Received
  3. → Preparing Order (current)
  4. ○ Ready for Pickup
  5. ○ Out for Delivery
  6. ○ Delivered
- Order date/time
- Total amount
- Payment method (last 4 digits)

**B) Item Details:**
- Item name, photo
- Quantity (always 1 for MVP)
- Price
- Delivery fee (if applicable)

**C) Buyer Information:**
- Name (full name visible to vendor)
- Email (for contact)
- Phone (if provided)
- Delivery address (if delivery selected)
- Pickup time preference (if pickup selected)

**D) Delivery Information:**
- If delivery method = 'delivery':
  - Shows courier assigned (once claimed)
  - Courier name, vehicle type
  - Estimated delivery time
  - Tracking link
- If delivery method = 'pickup':
  - Shows pickup location
  - Pickup window
  - "Notify when buyer arrives" (future)

**E) Actions:**
- **Mark as Ready:**
  - Available if status = 'paid'
  - Button: "Mark Order Ready for Pickup"
  - Updates `order.status: 'ready_for_pickup'`
  - Notifies buyer (if delivery) or courier
  - If pickup: Notifies buyer "Your order is ready"
- **Contact Buyer:**
  - Opens email client or in-app message
- **Cancel Order:**
  - Available before delivery
  - Requires reason
  - Triggers refund
  - Updates status to 'cancelled'
- **Print Packing Slip:** (future)

**F) Timeline:**
- Shows all status changes with timestamps
- Example:
  - Jan 23, 10:15 AM - Order placed
  - Jan 23, 10:16 AM - Payment confirmed
  - Jan 23, 10:30 AM - Vendor marked ready
  - Jan 23, 10:45 AM - Courier claimed
  - Jan 23, 11:00 AM - Courier picked up
  - Jan 23, 11:30 AM - Delivered

---

### 7. Analytics (`/vendor/analytics`)
**Purpose:** Sales insights and trends

**Features:**

**A) Overview Cards:**
- Total Revenue (all-time)
- This Month Revenue
- Last Month Revenue
- Growth % (month over month)

**B) Charts:**
- **Sales Over Time:** Line chart
  - Daily sales for last 30 days
  - Monthly sales for last 12 months
- **Top Categories:** Pie chart
  - Revenue by category
  - Shows which categories sell best
- **Revenue by Day of Week:** Bar chart
  - Which days are most profitable
- **Hourly Sales:** Heat map (future)
  - Best times to list items

**C) Top Products:**
- Table of best-selling items
- Shows: Name, Units Sold, Revenue, Avg Price
- "List more like this" suggestion

**D) Customer Insights:**
- Repeat customer rate
- Average order value
- Most active buyers (anonymized)

**E) Export:**
- Download CSV of sales data
- Date range selector
- For accounting/taxes

---

### 8. Stripe Connect Onboarding (`/vendor/onboarding/stripe`)
**Purpose:** Set up payouts

**Flow:**
1. Vendor clicks "Set Up Payouts" on dashboard
2. Redirects to Stripe Connect hosted onboarding
3. Stripe collects:
   - Business type (individual/company)
   - Legal name
   - Address
   - DOB / EIN
   - Bank account (routing + account number)
   - Tax information (W-9)
4. Stripe verifies identity
5. Redirects back to GoSenderr with `?status=success`
6. Platform saves `stripeConnectAccountId` to user doc
7. Vendor can now receive payouts

**Verification:**
- Takes 1-2 business days
- Vendor receives email when approved
- If rejected: Reason provided, can re-submit

---

### 9. Settings (`/vendor/settings`)
**Purpose:** Vendor preferences

**Features:**

**A) Business Information:**
- Business name
- Display name (public)
- Profile photo
- Bio (shown on listings)

**B) Notifications:**
- ☑ New order email
- ☑ Payment received email
- ☐ Daily sales summary
- ☑ Low stock alerts

**C) Order Settings:**
- **Auto-Accept Orders:** (on/off)
  - If on: Orders marked "preparing" automatically
  - If off: Vendor must manually accept each order
- **Preparation Time:** 15 minutes (default)
  - Avg time to mark order ready
  - Used for ETA calculations

**D) Payout Settings:**
- View Stripe Connect dashboard
- Update bank account
- Payout schedule: Rolling daily (Stripe default)

**E) Privacy:**
- Show full name on listings (on/off)
- Allow buyer messages (on/off)

---

## Navigation

### Bottom Navigation
```typescript
[
  { icon: "🏠", label: "Dashboard", href: "/vendor/dashboard" },
  { icon: "📦", label: "Listings", href: "/vendor/items" },
  { icon: "🛒", label: "Orders", href: "/vendor/orders" },
  { icon: "📊", label: "Analytics", href: "/vendor/analytics" }
]
```

**OR** Vendor can also use Customer nav (has customer permissions):
```typescript
[
  { icon: "🏠", label: "Home", href: "/customer/dashboard" },
  { icon: "🛒", label: "Market", href: "/marketplace" },
  { icon: "🏪", label: "My Store", href: "/vendor/items" },
  { icon: "👤", label: "Profile", href: "/customer/profile" }
]
```

### Floating Action Button (FAB)
- Icon: ➕
- Label: "List Item"
- Href: `/marketplace/create`

---

## Interactions with Other Roles

### 🔁 Vendor ↔ Customer
**Direct Interactions:**
1. **Listing:** Vendor creates item → Customer browses marketplace
2. **Purchase:** Customer buys item → Vendor receives order notification
3. **Preparation:** Vendor marks order ready → Customer (or courier) notified
4. **Delivery:** Courier picks up from vendor → Delivers to customer
5. **Rating:** Customer rates vendor after delivery (future)

**Data Flow:**
- Vendor creates item → `items` collection (status: 'available')
- Customer orders → Creates `marketplaceOrders` document
- Order includes: itemId, sellerId, buyerId, amount, status
- Vendor marks ready → `order.status: 'ready_for_pickup'`
- Courier picks up → `order.status: 'in_transit'`
- Delivery complete → `order.status: 'delivered'`
- Stripe transfers funds to vendor (minus fees)

**Communication:**
- Customer can message vendor via order detail page
- Vendor can contact customer via email/phone

---

### 🔁 Vendor ↔ Courier
**Indirect Interaction:**
1. **Pickup:** Courier arrives at vendor's location
2. **Handoff:** Vendor gives packaged item to courier
3. **Confirmation:** Courier marks "picked up" in app
4. **Food Orders:** Courier verifies equipment (cooler, hot bag)

**Data Flow:**
- Vendor marks ready → Job appears in courier's available jobs
- Courier claims job → Vendor sees "Courier assigned: John D."
- Courier picks up → Job status updates → Vendor notified
- No direct rating between vendor/courier

---

### 🔁 Vendor ↔ Admin
**Admin Oversight:**
1. **Monitoring:** Admin can view all vendor listings
2. **Moderation:** Admin can flag/remove inappropriate items
3. **Disputes:** Admin resolves customer complaints
4. **Payouts:** Admin can view vendor earnings (no access to bank info)
5. **Suspension:** Admin can suspend vendor for policy violations

**Data Flow:**
- Vendor creates item → Admin can see in `/admin/marketplace` (future)
- Customer dispute → Admin reviews vendor's history
- Admin removes item → Sets `item.status: 'removed'`, vendor notified

---

### 🔁 Vendor ↔ Runner
**No Direct Interaction:**
- Runners handle long-haul packages, not marketplace items
- Marketplace items = local delivery only (couriers)

---

## Permissions

### ✅ Vendor CAN:
- Create unlimited marketplace listings
- Set own item prices
- Upload up to 5 photos per item
- Edit/delete own listings
- Mark orders as ready for pickup
- View all orders for their items
- Receive Stripe Connect payouts (minus fees)
- Offer pickup option (0% fees)
- Offer delivery option (platform coordinates)
- View sales analytics
- Export sales data
- Rate couriers who delivered their items (future)
- **Also:** Has all customer permissions (can buy from other vendors)

### ❌ Vendor CANNOT:
- Edit other vendors' listings
- View other vendors' sales data
- Access admin features
- Accept delivery jobs (unless also courier)
- Modify delivery fees (set by courier)
- Cancel orders after courier picked up
- Change payout schedule (Stripe controls)
- Bypass Stripe fees for delivered orders

---

## Firestore Security Rules

```javascript
// Vendor can read/write their own items
match /items/{itemId} {
  // Anyone can read available items
  allow read: if true;
  
  // Vendor can create items
  allow create: if request.auth.uid == request.resource.data.sellerId
                && request.resource.data.status == 'available';
  
  // Vendor can update/delete own items
  allow update, delete: if request.auth.uid == resource.data.sellerId;
  
  // Admin can moderate any item
  allow update, delete: if isAdmin();
}

// Vendor can read orders for their items
match /marketplaceOrders/{orderId} {
  allow read: if request.auth.uid == resource.data.sellerId
              || request.auth.uid == resource.data.buyerId;
  
  // Vendor can update order status
  allow update: if request.auth.uid == resource.data.sellerId
                && isValidOrderStatusTransition(resource, request.resource);
}
```

---

## Key Workflows

### Workflow 1: First-Time Vendor Setup
1. User browses marketplace → Clicks "Sell on GoSenderr"
2. Sees vendor benefits page
3. Clicks "Become a Market Senderr"
4. Platform sets `role: 'vendor'`
5. Redirects to Stripe Connect onboarding
6. User enters:
   - Business name: "John's Electronics"
   - Type: Individual
   - Bank account: Routing + Account
   - Tax info: SSN or EIN
7. Submits to Stripe
8. Stripe verifies (1-2 days)
9. User receives email: "Your store is ready!"
10. User creates first listing

### Workflow 2: List Item and Receive Order
1. Vendor logs in → Dashboard
2. Clicks "Create New Listing"
3. Fills form:
   - Title: "iPhone 13 Pro Max"
   - Price: $800
   - Category: Electronics
   - Condition: Like New
   - Uploads 5 photos
   - Sets pickup location: "123 Main St, SF"
   - Delivery methods: Both (Delivery + Pickup)
4. Submits → Item created
5. Customer finds item → Orders → Pays
6. Vendor receives notification: "New Order!"
7. Vendor views order detail
8. Vendor prepares item (cleans, packages)
9. Vendor clicks "Mark as Ready"
10. Order status → 'ready_for_pickup'
11. If delivery: Courier claims job, picks up item
12. If pickup: Customer arrives, vendor hands over
13. Order completes → Vendor receives payout

### Workflow 3: Handle Cancellation
1. Customer orders item
2. Customer changes mind
3. Customer cancels order (before pickup)
4. Vendor receives cancellation notification
5. Platform triggers Stripe refund
6. Item automatically marked available again
7. Vendor sees "Order Cancelled" in orders list

### Workflow 4: Food Delivery Special Case
1. Vendor (restaurant) lists "Burger Combo"
2. Sets:
   - Category: Food
   - Temperature: Hot
   - Requires Hot Bag: Yes
   - Pickup instructions: "Ask for online orders"
   - Uploads photo of packaged meal
3. Customer orders burger
4. Vendor receives order
5. Vendor prepares meal (15 min)
6. Vendor marks "Ready for Pickup"
7. Courier with approved hot bag accepts job
8. Courier arrives at restaurant
9. Courier: "GoSenderr order for Sarah"
10. Vendor: Hands over bag
11. Courier verifies item matches photo
12. Courier marks "Picked Up"
13. Delivers hot to customer

---

## Fees & Payouts

### Fee Structure:

**For Delivery Orders:**
- **Stripe Fee:** 2.9% + $0.30 (credit card processing)
- **Platform Fee:** 15% of item price
- **Example:**
  - Item Price: $100
  - Stripe Fee: $3.20
  - Platform Fee: $15.00
  - Vendor Receives: $81.80
  - Customer Pays: $100 (item) + $12 (delivery) = $112 total

**For Pickup Orders:**
- **No fees!** 0% platform fee, 0% Stripe fee
- Vendor receives 100% of item price
- Customer only pays item price
- **Example:**
  - Item Price: $100
  - Vendor Receives: $100
  - Customer Pays: $100

### Payout Schedule:
- **Method:** Stripe Connect rolling daily payouts
- **Frequency:** Daily (for most vendors)
- **Processing:** 2 business days from order completion
- **Minimum:** $1 (no minimum for most vendors)
- **Destination:** Bank account on file with Stripe

### Payment Flow:
1. Customer pays → Stripe holds funds
2. Vendor marks ready → Courier picks up
3. Delivery completes → Customer confirms
4. Stripe captures payment
5. Stripe deducts fees
6. Remaining balance sent to vendor
7. Funds arrive in 2 days

---

## Listing Optimization Tips

### Best Practices (Shown in Dashboard):
1. **Photos:**
   - Use all 5 photo slots
   - First photo = most important
   - Show item from multiple angles
   - Good lighting, clear focus
   - Include scale reference

2. **Title:**
   - Include brand name
   - Mention condition
   - Add key features
   - Example: "Apple iPhone 13 Pro Max 256GB - Like New"

3. **Description:**
   - Be specific about condition
   - Mention any flaws honestly
   - Include dimensions/specs
   - Answer common questions preemptively

4. **Pricing:**
   - Research similar items
   - Price competitively
   - Consider pickup discount (no fees!)

5. **Delivery Options:**
   - Offer both delivery + pickup
   - Pickup attracts local buyers
   - Delivery expands reach

6. **Category:**
   - Choose most specific category
   - Helps buyers find your item

7. **Response Time:**
   - Mark orders ready quickly
   - Respond to buyer messages fast
   - Faster = better ratings

---

## Future Enhancements

### Phase 2:
- **Vendor Stores:** Dedicated store pages `/vendor/[vendorId]`
- **Inventory Management:** Track quantity, auto-mark sold out
- **Subscription Listings:** Recurring items (weekly meal kits)
- **Bulk Upload:** CSV import for many items at once
- **Promotional Tools:** Discounts, coupons, flash sales
- **Vendor Ratings:** Customers rate vendors separately
- **Verified Vendors:** Badge for trusted sellers
- **Premium Placement:** Pay for featured listings

### Phase 3:
- **Multi-Location:** Vendors with multiple pickup spots
- **Employee Accounts:** Sub-accounts for staff
- **Advanced Analytics:** Conversion rates, view-to-purchase
- **A/B Testing:** Test different photos/descriptions
- **Automated Messaging:** Auto-reply to common questions
- **Loyalty Programs:** Repeat buyer discounts
- **Wholesale Mode:** B2B bulk orders

---

**Last Updated:** January 23, 2026
**Version:** 1.0

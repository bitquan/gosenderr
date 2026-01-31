# Admin Role - Synced Architecture Documentation

## Role Identity
- **Icon:** ⚙️
- **Display Name:** Admin / Platform Manager
- **Color:** Red (#EF4444)
- **Tagline:** "Oversee. Manage. Optimize."
- **Purpose:** Platform oversight, moderation, support, and system management
- **Role in System:** Central authority, manages all roles, resolves disputes, configures platform

---

## User Document Structure (Firestore: `users/{uid}`)

```typescript
interface AdminUser {
  uid: string
  email: string
  displayName?: string
  role: 'admin'  // Checked by security rules + custom claim
  
  adminProfile?: {
    // Permissions Level
    permissions: Array<'users' | 'jobs' | 'packages' | 'routes' | 'flags' | 'runners' | 'disputes' | 'payments' | 'analytics'>
    isSuperAdmin: boolean  // Full access to everything
    
    // Activity Tracking
    lastLoginAt: Timestamp
    totalActions: number
    actionsThisMonth: number
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Custom Claim:** `admin: true` (required for security rules)

---

## Admin Access Patterns

### All Collections (Read-Only or Full Access)

```typescript
// Admin can access ALL data across platform
interface AdminDataAccess {
  // Users
  users: ReadWrite  // View all users, edit roles, ban/unban
  
  // Jobs
  jobs: ReadWrite  // View all jobs, cancel, reassign couriers
  
  // Routes
  routes: ReadWrite  // View all routes, cancel, reassign runners
  longHaulRoutes: ReadWrite
  
  // Packages
  packages: ReadWrite  // View all packages, override status, resolve issues
  
  // Marketplace
  items: ReadWrite  // Moderate listings, remove inappropriate content
  marketplaceOrders: ReadWrite  // View all orders, process refunds
  
  // Ratings & Disputes
  ratings: Read  // View all ratings, moderate reviews
  disputes: ReadWrite  // Resolve disputes, unsuspend users
  
  // Hubs
  hubs: ReadWrite  // Manage hub network
  
  // Feature Flags
  featureFlags: ReadWrite  // Toggle platform features
  
  // Analytics
  platformStats: Read  // Revenue, growth, performance metrics
}
```

---

## Firestore Security Rules

```javascript
// ==========================================
// ADMIN ROLE SECURITY RULES
// ==========================================

// Helper function: Check if user is admin
function isAdmin() {
  return request.auth != null 
      && request.auth.token.role == 'admin';
}

// Users: Admin can read/write all users
match /users/{userId} {
  allow read: if request.auth.uid == userId  // Own profile
              || isAdmin();  // Admin can see all
  
  // Admin can update any user's role
  allow update: if isAdmin()
                && hasOnlyChangedField('role');
  
  // Admin can ban/unban users
  allow update: if isAdmin()
                && hasOnlyChangedFields(['banned', 'bannedReason', 'bannedAt']);
}

// Jobs: Admin can read/write all jobs
match /jobs/{jobId} {
  allow read, write: if isAdmin();
  
  // Admin can cancel any job
  allow update: if isAdmin()
                && request.resource.data.status == 'cancelled'
                && request.resource.data.cancelledBy == request.auth.uid;
  
  // Admin can reassign courier
  allow update: if isAdmin()
                && hasOnlyChangedField('courierUid');
}

// Routes: Admin can read/write all routes
match /routes/{routeId} {
  allow read, write: if isAdmin();
}

match /longHaulRoutes/{routeId} {
  allow read, write: if isAdmin();
}

// Packages: Admin can read/write all packages
match /packages/{packageId} {
  allow read, write: if isAdmin();
  
  // Admin can override package status
  allow update: if isAdmin()
                && request.resource.data.adminOverride == true;
}

// Items: Admin can moderate listings
match /items/{itemId} {
  allow read, write: if isAdmin();
  
  // Admin can remove listings
  allow update: if isAdmin()
                && request.resource.data.status == 'removed'
                && request.resource.data.removedBy == request.auth.uid;
}

// Marketplace Orders: Admin can view and process refunds
match /marketplaceOrders/{orderId} {
  allow read, write: if isAdmin();
}

// Disputes: Admin can read/write all disputes
match /disputes/{disputeId} {
  allow read, write: if isAdmin();
  
  // Admin can resolve disputes
  allow update: if isAdmin()
                && request.resource.data.resolvedBy == request.auth.uid;
}

// Hubs: Admin can manage hub network
match /hubs/{hubId} {
  allow read, write: if isAdmin();
}

// Feature Flags: Admin can toggle features
match /featureFlags/config {
  allow read: if true;  // Anyone can read flags
  allow write: if isAdmin();  // Only admin can modify
}

// Ratings: Admin can read all ratings
match /ratings/{ratingId} {
  allow read: if isAdmin();
  
  // Admin can moderate ratings
  allow update: if isAdmin()
                && request.resource.data.moderated == true;
}
```

---

## Admin Pages & Features

### 1. Dashboard (`/admin/dashboard`)
**Purpose:** Overview of platform health and quick actions

**Stats Grid:**
- **Total Users:** Count of all users
- **Total Jobs:** All-time jobs
- **Active Jobs:** Jobs in progress
- **Completed Jobs:** Delivered jobs
- **Total Revenue:** Platform earnings
- **Today's Jobs:** Jobs created today

**Revenue Analytics:**
- Total Revenue chart (last 30 days)
- Average Revenue per Job
- Completion Rate (%)
- Job Status Breakdown (open/assigned/completed/cancelled)

**Management Cards:** Quick links to:
- 👥 Manage Users
- 📦 Manage Jobs
- 🏁 Feature Flags
- 🚚 Package Runners
- 📦 Packages
- 🗺️ Routes

---

### 2. Users Page (`/admin/users`)
**Purpose:** Manage all platform users

**Features:**
- **Filter Tabs:** All, Customers, Couriers, Runners, Vendors, Admins
- **Search:** By email, name, UID
- **User Cards:**
  - Email, Primary role badge + additional profile badges (e.g., Admin + Courier if user has both)
  - User ID, Active/Banned status
  - Runner profile status if applicable
  - Actions: Change Role dropdown, Ban/Unban button

**Role Badge Display:**
- Shows primary `role` field as main badge
- Shows additional badges if user has `courierProfile`, `packageRunnerProfile`, or `vendorProfile`
- Allows users to have multiple capabilities (e.g., Admin who is also a Courier)

**Role Dropdown Options:**
- Customer (default role)
- Courier (local delivery driver)
- Runner (long-haul package transporter)
- Vendor (marketplace seller)
- Admin (platform manager)

**Actions:**
- **Change Role:** Select new role from dropdown - calls `setAdminClaim` if changing to/from admin
- **Ban User:** Calls `banUser` Cloud Function with reason prompt (disables Firebase Auth + Firestore)
- **Unban User:** Calls `banUser` with `shouldBan: false` to restore access

---

### 3. Jobs Page (`/admin/jobs`)
**Purpose:** Oversee all delivery jobs

**Features:**
- **Filter Tabs:** All, Pending, Active, Completed, Cancelled
- **Search:** By job ID, customer email, address
- **Job Cards:**
  - Job ID, Status badge
  - Pickup → Dropoff addresses
  - Fee amount
  - Customer email
  - Courier ID (if assigned)
  - Created date
  - Actions: View Details, Cancel, Reassign

**Job Detail Actions:**
- **Cancel Job:** Cancel any job with reason (triggers refund)
- **Reassign Courier:** Change courier assignment
- **View Timeline:** All status changes with timestamps
- **Contact Customer:** Email or message
- **Contact Courier:** Email or message
- **Override Status:** Manual status change with admin note

---

### 4. Feature Flags Page (`/admin/feature-flags`)
**Purpose:** Toggle platform features without deployment

**Firestore Document:** `featureFlags/config`

**Categories:**
1. **Marketplace Features:**
   - Marketplace enabled
   - Vendor onboarding
   - Food delivery

2. **Delivery Features:**
   - Routes batching
   - Long routes (50-200 mi)
   - Express delivery

3. **Courier Features:**
   - Equipment requirements
   - Rate card customization
   - Auto-suspension

4. **Package Runner Features:**
   - Package shipping
   - Long haul routes
   - Hub network

5. **Customer Features:**
   - Save addresses
   - Schedule deliveries
   - Tip couriers

6. **Admin Features:**
   - Analytics dashboard
   - Export data
   - Bulk operations

**Toggle UI:**
- Switch toggles for each feature
- Last modified timestamp
- Modified by admin email
- Save button with confirmation

---

### 5. Package Runners Page (`/admin/runners`)
**Purpose:** Approve/reject runner applications

**Features:**
- **Filter Tabs:** Pending Review, Approved, Rejected, Suspended, All
- **Runner Cards:**
  - Name, Email, Phone
  - Vehicle type (cargo van, sprinter, box truck)
  - Home hub
  - Application date
  - Status badge
  - Actions: View Details, Approve, Reject

**Runner Detail View:**
- **Application Info:**
  - Vehicle details (year, make, model, photo)
  - Driver license (photo, number, expiration)
  - DOT/MC numbers
  - Commercial insurance (certificate, $100k+ coverage, expiration)
  - Home hub selection
  - Preferred routes

**Admin Actions:**
- **Approve:**
  - Calls Cloud Function: `setPackageRunnerClaim(uid, true)`
  - Sets custom claim `packageRunner: true`
  - Updates status: 'approved'
  - Sends email: "Application approved!"
  
- **Reject:**
  - Requires reason (dropdown + text)
  - Updates status: 'rejected'
  - Sends email: "Application rejected: [reason]"
  - Runner can reapply after fixing issues

---

### 6. Packages Page (`/admin/packages`)
**Purpose:** Monitor all package shipments

**Features:**
- **Filter Tabs:** All, Payment Pending, Pickup Pending, In Transit, Delivered, Failed
- **Search:** By tracking number, sender email, recipient
- **Package Cards:**
  - Tracking number
  - Sender → Recipient
  - Current status
  - Current location (hub or in transit)
  - Service level (standard/express/overnight)
  - Weight, dimensions
  - Actions: View Details, Track

**Package Detail View:**
- **Journey Timeline:**
  - Pickup (courier, timestamp)
  - Hub Transfer (origin hub, timestamp)
  - Long Haul (runner, route, timestamp)
  - Hub Transfer (destination hub, timestamp)
  - Last Mile (courier, timestamp)
  - Delivered (timestamp)

**Admin Actions:**
- **Override Status:** Manually change status with reason
- **Reassign Route:** Move package to different runner
- **Mark Lost/Damaged:** Create incident report
- **Process Refund:** Issue refund for failed delivery
- **Contact Sender/Recipient:** Support communication

---

### 7. Routes Page (`/admin/routes`)
**Purpose:** Manage delivery routes (local and long-haul)

**Features:**
- **Filter Tabs:** Available, Claimed, In Progress, Completed, Cancelled
- **Route Type Toggle:** Local Routes | Long Haul Routes
- **Route Cards:**
  - Route ID
  - Type (local/long_haul)
  - Status
  - Runner/Courier (if claimed)
  - Scheduled date
  - Stop count / Package count
  - Distance, duration
  - Earnings
  - Actions: View Details, Cancel, Reassign

**Route Detail View:**
- **Map:** All stops with route line
- **Stops/Packages List:**
  - Sequence, address, status
  - Estimated arrival
  - Completed timestamp
- **Progress:** X of Y stops/packages completed

**Admin Actions:**
- **Cancel Route:** Cancel incomplete route with notification
- **Reassign:** Move route to different runner/courier
- **Modify Stops:** Add/remove stops (local only)
- **Override Completion:** Force complete or restart

---

### 8. Disputes Page (`/admin/disputes`)
**Purpose:** Resolve user disputes and suspensions

**Dispute Types:**
1. **low_rating_suspension:** Auto-created when courier suspended
2. **customer_complaint:** Customer files complaint
3. **payment_dispute:** Payment/refund issue

**Features:**
- **Filter Tabs:** Open, Resolved, All
- **Dispute Cards:**
  - Type badge
  - User involved (courier/customer/vendor)
  - Reason/description
  - Status
  - Created date
  - Actions: View Details, Resolve

**Dispute Detail View:**
- **Context:**
  - Full dispute description
  - Related job/rating/payment
  - User history (ratings, deliveries, etc.)
  - Timeline of events

**Admin Actions:**
- **Add Note:** Internal admin notes
- **Resolve:** Close dispute with resolution reason
- **Unsuspend User:** If suspended, restore access
- **Refund Customer:** Process refund if applicable
- **Ban User:** Permanent ban if severe violation
- **Escalate:** Mark for senior admin review

---

### 9. Payments Page (`/admin/payments`)
**Purpose:** Monitor and resolve payment issues

**Features:**
- **Filter By Status:** Authorized, Captured, Refunded, Refund Failed
- **Payment Cards:**
  - Job/Order ID
  - Amount
  - Payment status
  - Customer
  - Courier/Vendor
  - Created date
  - Actions: View Details, Retry Refund

**Failed Refunds:**
- **Highlight:** Red badge for refund_failed
- **Actions:**
  - View error message
  - Retry refund
  - Manual resolution (mark as resolved + contact customer)
  - Issue platform credit

**Payment Detail View:**
- Stripe Payment Intent ID
- Payment method (last 4 digits)
- Timeline (authorized → captured/refunded)
- Error logs (if failed)

---

### 10. Analytics Page (`/admin/analytics`)
**Purpose:** Platform insights and trends

**Revenue Metrics:**
- Total platform revenue (all-time)
- Revenue by month (line chart)
- Revenue by service type (pie chart: deliveries, packages, marketplace)
- Average revenue per job
- Revenue forecasting (trend line)

**User Growth:**
- Total users over time (line chart)
- New sign-ups per week
- Users by role (bar chart: customers/couriers/runners/vendors)
- Active vs inactive users
- User retention rate

**Job Analytics:**
- Jobs created per day (line chart)
- Completion rate over time
- Average delivery time
- Popular pickup/dropoff locations (heatmap)
- Peak hours (heat map: hour vs day of week)
- Cancellation rate and reasons (pie chart)

**Runner Performance:**
- Top performers leaderboard (by earnings, rating, on-time %)
- Average ratings per courier
- Deliveries per courier (histogram)
- Route completion times (box plot)

**Package Delivery:**
- Average transit time by distance
- Package loss/damage rate
- Service level usage (standard/express/overnight)

**Export:**
- Download reports as CSV/PDF
- Date range selector
- Scheduled reports (email weekly summary)

---

## Cloud Functions for Admin

### 1. `onAdminActionLog` (Firestore Trigger)
**Purpose:** Log all admin actions for audit trail

```typescript
exports.onAdminActionLog = functions.firestore
  .document('{collection}/{docId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    
    // Check if change was made by admin
    if (after.lastModifiedBy && await isUserAdmin(after.lastModifiedBy)) {
      await db.collection('adminActionLogs').add({
        adminUid: after.lastModifiedBy,
        action: 'update',
        collection: context.params.collection,
        documentId: context.params.docId,
        changesBefore: before,
        changesAfter: after,
        timestamp: admin.firestore.Timestamp.now()
      })
    }
  })
```

---

### 2. `setAdminClaim` (HTTP Callable)
**Purpose:** Promote user to admin role

```typescript
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Only existing admin can create new admins
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can promote users')
  }
  
  const { uid, makeAdmin } = data
  
  try {
    // Set custom claim
    await admin.auth().setCustomUserClaims(uid, {
      role: makeAdmin ? 'admin' : null,
      admin: makeAdmin
    })
    
    // Update user document
    await db.collection('users').doc(uid).update({
      role: makeAdmin ? 'admin' : 'customer',
      promotedBy: context.auth.uid,
      promotedAt: admin.firestore.Timestamp.now()
    })
    
    return { success: true }
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message)
  }
})
```

---

## Inter-Role Admin Interactions

### Admin → Customer
```
1. Customer support request
2. Admin views customer profile
3. Admin sees order history, jobs
4. Admin can:
   - Cancel jobs
   - Process refunds
   - Issue platform credit
   - Ban user (if fraud)
```

---

### Admin → Courier
```
1. Courier receives low ratings
2. Auto-suspension triggers
3. Dispute created (low_rating_suspension)
4. Admin reviews:
   - Rating history
   - Customer feedback
   - Delivery stats
5. Admin decides:
   - Unsuspend (temporary issue)
   - Keep suspended (pattern of poor service)
   - Ban permanently (severe violations)
```

---

### Admin → Runner
```
1. Runner applies
2. Admin reviews application:
   - Vehicle photo
   - Driver license
   - Insurance certificate ($100k+ coverage)
   - DOT/MC numbers
3. Admin approves or rejects
4. If approved: Custom claim set
5. Runner can claim routes
```

---

### Admin → Vendor
```
1. Vendor creates listing
2. Admin monitors for inappropriate content
3. Admin can:
   - Remove listing
   - Contact vendor
   - Ban vendor (if repeated violations)
4. Vendor payment disputes:
   - Admin reviews Stripe logs
   - Retry failed payouts
   - Manual resolution
```

---

## Admin Tools & Utilities

### Bulk Operations
- **Approve Multiple Runners:** Select multiple, approve all at once
- **Cancel Multiple Jobs:** Bulk cancel with reason
- **Export Users:** CSV export with filters
- **Import Data:** Bulk user creation (future)

### Notification Center
- **Send Manual Notifications:**
  - Target: All users, specific role, or individual
  - Push notification + email
  - Templates: Maintenance, feature launch, promotion
- **Notification History:** View sent notifications
- **Delivery Stats:** Open rate, click rate

### Platform Health Monitoring
- **System Status Dashboard:**
  - Firebase quota usage
  - Cloud Function execution times
  - Firestore read/write counts
  - Error rates
- **Alerts:**
  - High error rate
  - Cloud Function failures
  - Payment failures spike
  - Unusual traffic patterns

### Automated Rules
- **Auto-Cancel Rules:**
  - Jobs not claimed in X minutes → cancel + refund
  - Packages not picked up in X days → cancel + refund
- **Auto-Suspension Rules:**
  - Courier rating < 3.5 with 5+ ratings
  - Vendor excessive cancellations
- **Auto-Archive Rules:**
  - Completed jobs older than 90 days → archive
  - Delivered packages older than 180 days → archive

---

## Permissions Summary

### ✅ Admin CAN:
- View all users, jobs, packages, routes, orders
- Edit any user's role
- Cancel any job with reason
- Reassign couriers/runners
- Approve/reject package runner applications
- Moderate marketplace listings (remove inappropriate)
- Resolve disputes and unsuspend users
- Process refunds and retry failed payments
- Toggle platform features via feature flags
- View platform analytics and revenue
- Export data for reports
- Send manual notifications
- Create other admin accounts
- Ban/unban users
- Override package status
- Modify routes
- Access audit logs

### ❌ Admin CANNOT:
- Accept delivery jobs (not a service provider role)
- Create marketplace listings (unless also vendor)
- Set courier rate cards (couriers control their own)
- Bypass security rules for personal benefit
- Delete audit logs
- Access Stripe Connect dashboard directly (admin panel shows summary only)
- Modify completed delivery history (immutable for compliance)
- Change platform fees without code deployment

---

## Admin Best Practices

### User Support
1. **Always check user history** before taking action
2. **Communicate reasons** for bans, rejections, removals
3. **Document decisions** in dispute notes
4. **Escalate complex issues** to senior admin

### Dispute Resolution
1. **Review all evidence:** Ratings, messages, delivery photos
2. **Be impartial:** Listen to both sides
3. **Fair outcomes:** Balance user experience with platform integrity
4. **Follow up:** Ensure resolution was effective

### Platform Configuration
1. **Test feature flags** in staging before enabling
2. **Monitor impact** of new features (analytics)
3. **Gradual rollouts:** Enable for subset of users first
4. **Document changes:** Keep log of flag changes

### Security
1. **Protect admin credentials:** Use strong passwords, 2FA
2. **Limit admin accounts:** Only trusted team members
3. **Regular audits:** Review admin action logs
4. **Revoke access:** When admin leaves team

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Cross-References:**
- [Customer Role Documentation](./01-CUSTOMER-ROLE.md)
- [Courier Role Documentation](./02-COURIER-ROLE.md)
- [Runner Role Documentation](./03-RUNNER-ROLE.md)
- [Vendor Role Documentation](./04-VENDOR-ROLE.md)
- [Platform Data Flow Diagrams](./00-INDEX.md)

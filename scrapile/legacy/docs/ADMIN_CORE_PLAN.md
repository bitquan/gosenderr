# Admin Core Features Plan - Courier App

## Architecture
- **Courier App** serves both Couriers AND Admins (role-based UI)
- Check `role === 'admin'` in user document to determine admin access

## Pages & Access

### 1. Dashboard (`/dashboard`)
**Couriers See:**
- Online/Offline toggle
- Stats: Available Jobs, Active Jobs, Vehicle Type
- My Active Deliveries section
- Available Jobs section
- Offline warning if not online

**Admins See:**
- "Admin Dashboard" title
- Admin Panel card with quick actions:
  - Manage Users
  - Manage All Jobs
- NO online toggle
- NO courier stats
- NO job listings

### 2. Jobs Page (`/jobs`)
**Couriers See:**
- Filter: All, Active, Completed
- Only THEIR accepted jobs
- Earnings: Total, This Month, Completed count

**Admins See:**
- Should redirect to `/admin/jobs` OR show "Admin: Use Admin Panel"

### 3. Profile Page (`/profile`)
**Couriers See:**
- Email & account info
- Earnings stats (Total, This Month, Completed)
- Vehicle settings (bike, scooter, car, van, truck)
- Account status (Online/Offline, Vehicle Type)
- Sign out

**Admins See:**
- Email & account info
- Admin badge/role display
- NO earnings stats
- NO vehicle settings
- NO online status
- Sign out

### 4. Admin Users Page (`/admin/users`) - NEW
**Only Admins:**
- List all users with filters:
  - All, Customers, Couriers, Admins
- User cards showing:
  - Email
  - Role badges (Customer, Courier, Admin)
  - Courier: Online status, Vehicle type
  - User ID
- Future: Edit user roles, view details

### 5. Admin Jobs Page (`/admin/jobs`) - NEW
**Only Admins:**
- List ALL jobs (not just their own)
- Filters: All, Pending, Active, Completed
- Job cards showing:
  - Job ID, Status badge
  - Pickup/Delivery addresses
  - Fee amount
  - Customer email
  - Courier ID (if assigned)
  - Created date
- Click to view job details
- Future: Cancel jobs, reassign couriers

### 6. Bottom Navigation
**Couriers See:**
- 🏠 Dashboard
- 📦 My Jobs
- 👤 Profile

**Admins See:**
- 🏠 Dashboard (shows admin panel)
- 👥 Users
- 📦 Jobs
- ⚙️ Settings (or keep Profile)

## Implementation Steps

1. ✅ Create `useAdmin()` hook to check admin role
2. ✅ Update Dashboard - hide courier features for admins
3. ✅ Create AdminUsers page
4. ✅ Create AdminJobs page
5. ✅ Update Profile page - hide courier features for admins
6. ✅ Update Jobs page - redirect admins to admin jobs
7. ✅ Update BottomNav - different tabs for admins
8. ✅ Add route guards - admins can't access `/jobs/:id` (courier job detail)
9. ✅ Create admin-specific job detail view (read-only oversight)

## Future Enhancements

### Phase 1 - Missing Core Admin Features
**From Old Admin App - Need to Implement:**

1. **Feature Flags Management** (`/admin/feature-flags`)
   - UI to view/edit feature flags from Firestore (`featureFlags/config`)
   - Toggle features: marketplace, delivery modes, courier settings, seller features, customer features
   - Categories: marketplace, delivery, courier, seller, customer, packageRunner, admin, advanced, ui
   - Real-time sync with Firestore
   - Save confirmation + validation

2. **Package Runners Management** (`/admin/runners`)
   - List all users with `packageRunnerProfile` (aka "Shifters")
   - Filter: Pending Review, Approved, Rejected, All
   - View runner applications: phone, home hub, vehicle info
   - Actions: Approve, Reject (with reason)
   - Status tracking: pending_review, approved, rejected
   - Approval fields: approvedAt, approvedBy, rejectedAt, rejectedBy, rejectionReason

3. **Packages Management** (`/admin/packages`)
   - List all packages from `packages` collection
   - Filter by status: payment_pending, pickup_pending, in_transit, delivered
   - Show: sender, recipient, current status, tracking
   - View package timeline/history
   - Package details: weight, dimensions, service level

4. **Routes Management** (`/admin/routes`)
   - List all routes from `routes` collection
   - Filter: Available, Claimed, In Progress, Completed
   - Show: route stops, assigned runner, status
   - View route details and progress
   - Route optimization data

### Phase 2 - Enhanced Admin Actions

#### Job Management Enhancements
- ✅ **Cancel Jobs** (COMPLETE): Admin can cancel any job from job detail page
- ✅ **Reassign Couriers** (COMPLETE): Change courier assignment with reason
- **Job History Log**: View all status changes and admin actions on a job
- **Bulk Job Actions**: Cancel multiple jobs, bulk reassign
- **Failed Jobs Recovery**: Tools to manually fix stuck jobs

#### User Management Enhancements  
- ✅ **Edit User Roles** (COMPLETE): Change customer → courier → admin
- **Ban/Unban Users**: Temporarily or permanently ban users with reason
- **View User Activity**: Login history, last active, device info
- **User Impersonation**: View platform as specific user (for support)
- **Merge Duplicate Accounts**: Combine duplicate user profiles
- **Reset User Data**: Clear user's job history, ratings, etc.

#### Package Management Actions
- **Reassign Packages**: Move package to different runner
- **Mark Lost/Damaged**: Update package status with incident report
- **Override Status**: Manually change package status with admin note
- **Refund Package Fee**: Process refund for failed delivery

#### Route Management Actions
- **Cancel Routes**: Cancel incomplete routes with notification
- **Modify Route Stops**: Add/remove stops from active route
- **Reassign Routes**: Move route to different runner
- **Route Override**: Force complete or restart route

### Phase 3 - Analytics & Reporting

#### Revenue & Financial Analytics
- ✅ **Basic Revenue Metrics** (COMPLETE on dashboard):
  - Total platform revenue
  - Average revenue per job
  - Completion rate percentage
  - Active vs completed job breakdown
  
- **Advanced Revenue Charts** (Future):
  - Revenue over time (daily/weekly/monthly graphs)
  - Revenue by service type (delivery, packages, marketplace)
  - Courier earnings distribution
  - Platform fee breakdown
  - Payment method analytics
  - Revenue forecasting

#### User Growth Metrics
- Total users over time (line chart)
- New sign-ups per day/week/month
- User retention rates
- Active vs inactive users
- Users by role breakdown (customers/couriers/runners)
- Geographic distribution (if location data available)

#### Job & Delivery Analytics
- ✅ **Basic Job Stats** (COMPLETE on dashboard)
- Job completion rates over time
- Average delivery time
- Jobs by status distribution
- Popular pickup/dropoff locations (heatmap)
- Peak hours analysis
- Cancellation rate and reasons

#### Runner Performance Metrics
- Top performers leaderboard
- Average ratings per courier
- Deliveries completed per courier
- On-time delivery percentage
- Response time to job claims
- Equipment utilization (bike vs car vs van usage)

#### Package Delivery Analytics
- Average delivery times by distance
- Package loss/damage rate
- Most common package sizes/weights
- Service level usage (standard/express/overnight)
- Tracking engagement metrics

#### Route Efficiency Stats
- Average route completion time
- Stops per route
- Route optimization effectiveness
- Multi-stop delivery efficiency
- Runner route preferences

### Phase 4 - Advanced Features

#### Dispute Management System
- **View Disputes** (`/admin/disputes`):
  - List all disputes from `disputes` collection
  - Filter: Open, Resolved, All
  - Types: low_rating_suspension (auto-created), customer_complaint, payment_dispute
  - Show: dispute type, user involved, reason, status, created date
  - Actions: View details, resolve, escalate
  
- **Dispute Details**:
  - Full dispute context and history
  - Related job/rating/payment information
  - Admin notes and resolution history
  - Actions: Add note, change status, take action (unsuspend courier, issue refund, etc.)

#### Courier Suspension Management
- **View Suspended Couriers**:
  - List couriers with `courierProfile.status = 'suspended'`
  - Show: suspension reason, rating stats, dispute reference
  - Actions: Review ratings, unsuspend, ban permanently
  
- **Manual Suspend/Unsuspend**:
  - Admin can manually suspend any courier
  - Require reason field
  - Creates admin action log

#### Payment & Refund Management
- **Payment Overview** (`/admin/payments`):
  - List all payments from jobs with `paymentStatus` field
  - Filter: authorized, captured, refunded, refund_failed
  - Show: job ID, amount, status, customer, courier, dates
  - Flag failed refunds for manual review
  
- **Refund Actions**:
  - View refund_failed payments
  - Retry refund
  - Mark as manually resolved
  - Contact customer

#### Notification Management
- **Push Notification Center**:
  - Send manual notifications to users/groups
  - View notification history
  - Test notification delivery
  - Notification templates

#### Bulk Operations
- Approve multiple runners at once
- Batch status updates
- Export data (users, jobs, packages) to CSV
- Import/update data

#### Auto-Cancel Rules
- Configure timeout settings
- Auto-cancel rules for abandoned jobs
- Automated refund triggers
- Stale job cleanup settings

---

**Current Status:**
✅ **ALL ADMIN FEATURES COMPLETE!**

All 9 implementation steps PLUS Phase 1 & enhancements:
- ✅ Dashboard with stats grid (Total Users, Jobs, Active, Completed, Revenue, Today's Jobs)
- ✅ Dashboard admin panel with 6 management cards (Users, Jobs, Flags, Runners, Packages, Routes)
- ✅ Dashboard revenue analytics chart (Total Revenue, Avg/Job, Completion Rate, Status Breakdown)
- ✅ AdminUsers page with role editing (change customer → courier → admin)
- ✅ AdminJobs page with job management (cancel, reassign courier)
- ✅ AdminJobDetail with admin actions (reassign/cancel buttons)
- ✅ AdminFeatureFlags page - Toggle all platform features
- ✅ AdminRunners page - Approve/reject package runner applications
- ✅ AdminPackages page - View all package shipments
- ✅ AdminRoutes page - Manage delivery routes
- ✅ Profile updated (no earnings/vehicle for admins)
- ✅ Jobs page redirect added (admins → /admin/jobs)
- ✅ BottomNav updated (admins see Dashboard/Users/Jobs/Settings)
- ✅ JobDetail route protection (admins blocked from courier details)
- ✅ Settings page added (sign out + platform info)

**Admin Experience:**
- Navigation: Dashboard 🏠 | Users 👥 | Jobs 📦 | Settings ⚙️
- Dashboard: 6 stat cards + 6 management cards + revenue analytics
- Complete platform oversight across all collections
- **Job Management:** Cancel jobs, reassign couriers from job detail page
- **User Management:** Edit user roles (promote to admin, change to courier, etc.)
- **Revenue Analytics:** Total revenue, avg per job, completion rate, status breakdown with visual progress bars
- Feature flag toggles for platform configuration
- Runner approval workflow
- Package shipment tracking
- Route management and monitoring
- Settings page for account management
- Blocked from courier-only pages with proper redirects

**Next Steps:**
1. ✅ **Feature Flags UI** - COMPLETE
2. ✅ **Package Runners** - COMPLETE
3. ✅ **Packages** - COMPLETE
4. ✅ **Routes** - COMPLETE
5. ✅ **Job Management Actions** - COMPLETE (cancel, reassign)
6. ✅ **User Role Editing** - COMPLETE
7. ✅ **Revenue Analytics** - COMPLETE (dashboard charts)
8. **Deploy courier app** (when user requests)

---

## Additional Features Identified from Docs

### From RATING_SYSTEM_USAGE.md
- **Disputes Collection**: Auto-created when courier suspended for low ratings
  - Type: low_rating_suspension, customer_complaint, payment_dispute
  - Status: open, resolved
  - Needs admin review UI to manage disputes
  
- **Suspended Couriers**: When `courierProfile.status = 'suspended'`
  - Currently auto-suspended by cloud function if avg rating < 3.5 with >= 5 ratings
  - Admin needs UI to review, unsuspend, or ban permanently

### From STRIPE_PAYMENT_INTEGRATION.md
- **Payment Status Management**: Jobs have `paymentStatus` field
  - States: authorized, captured, refunded, refund_failed
  - **refund_failed** needs admin intervention - retry or manual resolution
  
- **Payment Admin Page** (Future):
  - List all payments with status filters
  - View failed refunds
  - Retry refund processing
  - Manual refund actions

### From WEB_APP_FEATURES.md
- **Notifications System**: `notifications` collection exists
  - Push notification center for manual admin broadcasts
  - Notification templates
  - Delivery status tracking

### Platform Health Monitoring (Future)
- **Activity Audit Logs**: Track all admin actions
  - Who made what change, when
  - User role changes, job cancellations, etc.
  - Compliance and accountability trail
  
- **Export/Import Tools**:
  - CSV exports for reporting (users, jobs, payments, packages)
  - Bulk data updates via CSV import
  
- **Stripe Dashboard Integration**:
  - Quick link to Stripe dashboard for payment disputes
  - Embedded Stripe analytics (if API available)

### Rating System Admin (Future)
- View all ratings with filters
- Moderate inappropriate reviews
- Override auto-suspensions
- Rating analytics (average by courier, trends)

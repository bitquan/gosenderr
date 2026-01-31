# Admin User Guide

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**For:** GoSenderr Admin Portal

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [User Management](#user-management)
4. [Courier & Runner Approval](#courier--runner-approval)
5. [Job Management](#job-management)
6. [Dispute Resolution](#dispute-resolution)
7. [Revenue & Analytics](#revenue--analytics)
8. [System Settings](#system-settings)
9. [Audit Logs](#audit-logs)
10. [Feature Flags](#feature-flags)
11. [Common Workflows](#common-workflows)

---

## Getting Started

### Accessing the Admin Portal

1. Navigate to the admin app (port 3000)
2. Sign in with an admin account
3. You'll land on the Dashboard with quick access to all features

### Navigation

The admin portal uses a **sidebar navigation** with grouped menu items:

- **Overview:** Dashboard
- **User Management:** Users, Courier Approval
- **Operations:** Jobs, Disputes
- **Finance:** Revenue
- **System:** Audit Logs, Feature Flags, Settings

The sidebar is:
- Always visible on desktop (left side)
- Collapsible on mobile (hamburger menu)
- Shows active page with purple highlight

---

## Dashboard

**Route:** `/dashboard`  
**Purpose:** Analytics overview and quick access

### What You See

**Key Metrics Cards:**
- Total Users count
- Total Jobs count
- Active Jobs count
- Completed Jobs count
- Total Revenue
- Today's Jobs count

**Charts:**
1. **Users by Role** (Pie Chart) - Distribution of users across roles
2. **Jobs by Status** (Bar Chart) - Job status breakdown
3. **Performance Trend** (Line Chart) - Last 7 days jobs & revenue

**Quick Actions:**
- Direct links to all admin pages
- Color-coded cards for easy navigation

### How to Use
- Click any metric card to view details
- Hover over charts for specific numbers
- Use quick action cards to jump to any page

---

## User Management

**Route:** `/users`  
**Purpose:** Manage all platform users

### Features

**Filter by Role:**
- All Users
- Customers (📦)
- Couriers (⚡)
- Package Runners (🚛)
- Sellers (🏪)
- Admins (👑)

**Search:**
- Search by name, email, or phone

**User Actions:**
1. **Edit Role** (Purple button)
2. **Ban/Unban User** (Red/Green button)

### Edit User Roles

**How to:**
1. Click "Edit Role" on any user card
2. Select new role from 5 options:
   - Customer - Can create delivery jobs
   - Courier - Can accept and deliver jobs
   - Package Runner - Long-distance package delivery
   - Seller - Can sell items in marketplace
   - Admin - Full platform access
3. Click "Save Changes"

**Important:**
- Promoting to Admin calls `setAdminClaim` Cloud Function
- Other role changes update Firestore directly
- Changes are immediate
- Action is logged in Audit Logs

### Ban/Unban Users

**How to Ban:**
1. Click "Ban User" (red button)
2. Select a reason:
   - Terms of service violation
   - Fraudulent activity
   - Abusive behavior
   - Multiple customer complaints
   - Payment issues
   - Spam or advertising
   - Custom reason (type your own)
3. Click "Ban User"

**How to Unban:**
1. Click "Unban User" (green button)
2. Confirm action

**Effects:**
- Banned users cannot access the platform
- Banned badge appears on user card
- Ban reason is stored and visible
- Action is logged in Audit Logs

---

## Courier & Runner Approval

### Courier Approval

**Route:** `/courier-approval`  
**Purpose:** Review and approve courier applications

**Features:**
- Search by name, email, phone
- Filter: Pending, Approved, Rejected, All
- Bulk selection and approval
- Individual approve/reject

**How to Approve:**
1. Review courier profile (vehicle type, equipment, availability)
2. Click "✅ Approve" button
3. Courier status updates immediately

**How to Reject:**
1. Click "❌ Reject" button
2. Enter rejection reason
3. Courier is notified (if notifications enabled)

### Runner Approval

**Route:** `/admin/runners` (in courier-app)  
**Purpose:** Review package runner applications

**Features:**
- Same as Courier Approval
- Shows home hub, vehicle details, driver's license
- Calls `setPackageRunnerClaim` Cloud Function

**Bulk Actions:**
1. Check boxes next to multiple pending runners
2. Click "Approve Selected"
3. All selected runners are approved at once

---

## Job Management

**Route:** `/jobs`  
**Purpose:** View and manage all delivery jobs

### Filters

**Search:**
- By job ID, address, customer email, courier email

**Date Filters:**
- All time
- Today only
- Last 7 days
- Last 30 days

**Status Filters:**
- All
- Pending (no courier assigned)
- Active (assigned or in progress)
- Completed
- Cancelled

### Admin Actions

**Force Cancel Job:**
1. Click "🚫 Force Cancel" on job card
2. Enter cancellation reason (required)
3. Job is immediately cancelled

**Use Cases:**
- Customer dispute
- Courier unavailable
- Safety concerns
- Technical issues

**Export Jobs:**
- Click "📊 Export CSV" button
- Downloads CSV with all filtered jobs
- Includes ID, status, addresses, fees, dates

---

## Dispute Resolution

**Route:** `/disputes`  
**Purpose:** Handle customer and courier disputes

### Dispute Lifecycle

1. **Open** - Just filed, needs attention
2. **Reviewing** - Admin is investigating
3. **Resolved** - Issue closed with resolution

### How to Handle a Dispute

**Step 1: Review**
- Read dispute reason and description
- Check related job details (click job ID link)
- Note who filed it (customer or courier)

**Step 2: Mark as Reviewing** (optional)
- Click "👀 Mark as Reviewing"
- Shows other admins you're handling it

**Step 3: Resolve**
1. Click "✅ Resolve Dispute"
2. Select resolution action:
   - 💰 Full Refund to Customer
   - 💵 Partial Refund
   - 🚫 No Action Required
   - 📝 Other Action
3. Enter resolution notes (required)
4. Click "Resolve Dispute"

**Resolution is stored and visible to all parties**

---

## Revenue & Analytics

**Route:** `/revenue`  
**Purpose:** View financial performance

### Key Metrics

- **Total Revenue** - All completed jobs
- **Platform Fee (15%)** - Commission earned
- **Courier Payouts (85%)** - Paid to couriers
- **Growth %** - This month vs last month

### Charts

**30-Day Revenue Trend:**
- Line chart showing daily revenue and commission
- Hover for exact amounts

**Revenue by Job Type:**
- Pie chart breakdown (Standard, Express, Package Runner)

**Top 5 Earning Couriers:**
- Leaderboard with courier names and earnings
- Gold/silver/bronze medals for top 3

### Export Revenue Report

- Click "📥 Export CSV"
- Downloads 30-day revenue data
- Columns: Date, Revenue, Commission, Courier Payout

---

## System Settings

**Route:** `/settings`  
**Purpose:** Configure platform-wide settings

### Settings Sections

**1. General Information**
- Site name (default: GoSenderr)
- Support email
- Support phone

**2. Pricing & Fees**
- Platform commission rate (%)
- Base delivery fee ($)
- Per-kilometer rate ($)
- Express delivery multiplier (x)

**3. Job Configuration**
- Auto-cancel timeout (minutes)
- Jobs auto-cancel if no courier accepts within this time

**4. Notifications**
- Email notifications (on/off)
- SMS notifications (on/off)
- Push notifications (on/off)

**5. Feature Toggles**
- Marketplace enabled
- Package Runner enabled
- Express Delivery enabled

### How to Update Settings

1. Change any values
2. Yellow warning banner appears: "You have unsaved changes"
3. Click "Save Changes" button
4. Settings saved to Firestore `platformSettings/main`
5. Changes apply immediately

**Important:** Settings persist across sessions

---

## Audit Logs

**Route:** `/audit-logs`  
**Purpose:** Track all admin actions

### What's Logged

- Admin promotions/demotions
- Runner approvals/rejections
- Courier approvals/rejections
- User bans/unbans
- Feature flag changes
- Setting updates

### Viewing Logs

**Filter by Action Type:**
- All actions
- Promote to admin
- Approve runner
- Reject runner
- Ban user
- Unban user

**Date Filters:**
- Today
- Last 7 days
- Last 30 days
- All time

### Log Details

Each log entry shows:
- Action taken
- Who performed it (admin email)
- When it happened (relative time)
- Metadata (expandable details)

---

## Feature Flags

**Route:** `/feature-flags`  
**Purpose:** Toggle platform features on/off

### Categories

1. **Marketplace** - Seller features
2. **Delivery** - Core delivery features
3. **Courier** - Courier-specific features
4. **Seller** - Seller portal features
5. **Customer** - Customer app features
6. **Package Runner** - Long-distance delivery
7. **Admin** - Admin portal features
8. **Advanced** - Beta/experimental features
9. **UI** - Interface elements

### How to Use

1. Find the feature you want to toggle
2. Click the switch (purple = on, gray = off)
3. Changes save automatically to Firestore
4. Yellow banner shows unsaved changes
5. Click "Save All Changes" to apply

**Warning:** Disabling core features may break functionality!

---

## Common Workflows

### Approving a New Courier

1. Navigate to `/courier-approval`
2. Filter by "Pending"
3. Review profile (vehicle, equipment, availability)
4. Click "✅ Approve" or "❌ Reject"
5. If rejecting, provide reason

### Handling a Disputed Job

1. Navigate to `/disputes`
2. Click on dispute to expand details
3. Click job ID link to see full job details
4. Mark as "Reviewing" if needed
5. Gather information
6. Click "✅ Resolve Dispute"
7. Select resolution action (refund, no action, etc.)
8. Enter notes explaining decision
9. Submit resolution

### Banning a Problem User

1. Navigate to `/users`
2. Search for user by email or name
3. Click "Ban User" (red button)
4. Select reason (or enter custom)
5. Confirm ban
6. User is immediately locked out
7. Check Audit Logs to confirm action logged

### Force Cancelling a Job

1. Navigate to `/jobs`
2. Search for job by ID or address
3. Click job card to see details
4. Click "🚫 Force Cancel"
5. Enter cancellation reason
6. Confirm - job is cancelled immediately
7. Customer/courier notified (if notifications enabled)

### Promoting a User to Admin

1. Navigate to `/users`
2. Search for user
3. Click "Edit Role" (purple button)
4. Select "👑 Admin"
5. Click "Save Changes"
6. Cloud Function `setAdminClaim` is called
7. User gains admin access immediately
8. Action logged in Audit Logs

### Checking Platform Revenue

1. Navigate to `/revenue`
2. View key metrics at top
3. Check month-over-month growth
4. Review 30-day trend chart
5. See top earning couriers
6. Export CSV for detailed analysis

---

## Tips & Best Practices

### Security
- ✅ Only promote trusted users to admin
- ✅ Review audit logs regularly
- ✅ Use specific ban reasons for documentation
- ✅ Always provide dispute resolution notes

### Performance
- ✅ Use search and filters to find items quickly
- ✅ Bulk approve multiple applications at once
- ✅ Export data for analysis outside the portal

### User Experience
- ✅ Respond to disputes within 24 hours
- ✅ Provide clear rejection reasons to applicants
- ✅ Review settings quarterly for optimization
- ✅ Monitor revenue trends for business insights

---

## Support

### Need Help?
- Check this guide first
- Review the [Admin System Checklist](ADMIN_SYSTEM_CHECKLIST.md)
- Check [Cloud Functions documentation](CLOUD_FUNCTIONS.md)

### Reporting Bugs
- Note exact steps to reproduce
- Include error messages
- Check browser console for errors
- Document expected vs actual behavior

---

**End of Admin User Guide** 📚

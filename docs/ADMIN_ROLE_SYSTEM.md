# Admin Role System

**Implemented:** January 23, 2026

## Overview

GoSenderr uses Firebase Authentication custom claims for role-based access control. Admins have elevated permissions to manage users, approve runners, and perform administrative tasks.

## Custom Claims

### Admin Claim
```typescript
{ admin: true }
```
- Set via `setAdminClaim` Cloud Function
- Grants access to admin dashboards and management features
- Validated in Firestore security rules via `isAdmin()` helper

### Package Runner Claim
```typescript
{ packageRunner: true }
```
- Set via `setPackageRunnerClaim` Cloud Function
- Approves package runner applications
- Grants access to runner features and hub network

## Cloud Functions

### 1. setAdminClaim
**URL:** `https://us-central1-gosenderr-6773f.cloudfunctions.net/setAdminClaim`

**Purpose:** Promote or demote users to admin role

**Parameters:**
```typescript
{
  userId: string;      // User to modify
  isAdmin: boolean;    // true = promote, false = demote
}
```

**Security:** 
- Caller must have `admin: true` custom claim
- Cannot modify own admin status
- Creates `adminProfile` document on promotion
- Logs action to `adminActionLogs` collection

### 2. setPackageRunnerClaim
**URL:** `https://us-central1-gosenderr-6773f.cloudfunctions.net/setPackageRunnerClaim`

**Purpose:** Approve or reject package runner applications

**Parameters:**
```typescript
{
  userId: string;      // Runner to approve/reject
  approved: boolean;   // true = approve, false = reject
}
```

**Security:**
- Caller must be admin
- Validates runner has `pending_review` status
- Checks for vehicle and insurance documentation
- Updates `packageRunnerProfile` status
- Logs action to `adminActionLogs`

### 3. banUser
**URL:** `https://us-central1-gosenderr-6773f.cloudfunctions.net/banUser`

**Purpose:** Ban or unban users from the platform

**Parameters:**
```typescript
{
  userId: string;      // User to ban/unban
  banned: boolean;     // true = ban, false = unban
  reason?: string;     // Optional ban reason
}
```

**Security:**
- Caller must be admin
- Cannot ban self
- Disables Firebase Auth account
- Updates `banned` and `bannedAt` fields in user profile
- Logs action to `adminActionLogs`

### 4. onAdminActionLog (Trigger)
**Trigger:** Firestore onCreate on `adminActionLogs/{logId}`

**Purpose:** Audit trail for admin actions

**Logged Data:**
- Admin ID and email
- Action type (setAdmin, approveRunner, banUser)
- Target user ID
- Timestamp
- Additional metadata

## User Management UI

### Filter Tabs (6 Total)
1. **All** - Shows all users with count badge
2. **Customers** - Users with `role: 'customer'` or no role
3. **Couriers** - Users with `role: 'courier'` or `courierProfile`
4. **Runners** - Users with `role: 'package_runner'`
5. **Vendors** - Users with `role: 'vendor'`
6. **Admins** - Users with `role: 'admin'`

### Role Badges
- **Admin**: Red badge (`bg-red-100 text-red-700`)
- **Package Runner**: Orange badge with 🚛 icon (`bg-orange-100 text-orange-700`)
- **Vendor**: Indigo badge with 🏪 icon (`bg-indigo-100 text-indigo-700`)
- **Courier**: Purple badge (`bg-purple-100 text-purple-700`)
- **Customer**: Gray badge (`bg-gray-100 text-gray-700`)

### Available In
- **Admin App** (Port 3000): `/users`
- **Courier App** (Port 3001): `/admin-users`

## Firestore Security Rules

```javascript
function isAdmin() {
  return request.auth != null && 
         request.auth.token.admin == true;
}

function isPackageRunner() {
  return request.auth != null && 
         request.auth.token.packageRunner == true;
}

// Example usage
match /adminProfiles/{userId} {
  allow read: if isAdmin();
  allow write: if false; // Only Cloud Functions can write
}

match /users/{userId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin() || isOwner(userId);
}
```

## Setting First Admin

Use Firebase Admin SDK with service account:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setFirstAdmin(uid) {
  // Set custom claim
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  
  // Create admin profile
  await admin.firestore().collection('adminProfiles').doc(uid).set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    role: 'admin'
  });
  
  console.log(`✅ Admin claim set for user: ${uid}`);
}

// Replace with your user ID
setFirstAdmin('YOUR_USER_ID_HERE');
```

## Testing

1. Get your user ID from Firebase Auth console
2. Set admin claim using script above
3. Sign out and sign back in to refresh token
4. Navigate to admin dashboard
5. Verify access to user management features

## Next Steps

- [ ] Implement runner approval workflow UI
- [ ] Add dispute management features
- [ ] Create admin analytics dashboard
- [ ] Add audit log viewer
- [ ] Implement refund management

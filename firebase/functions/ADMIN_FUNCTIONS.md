# Cloud Functions - Custom Claims & Admin Operations

## Overview

This directory contains Cloud Functions for managing user roles, custom claims, and admin operations in the GoSenderr platform.

## 🔐 Custom Claims

Custom claims are set in Firebase Auth tokens and enforced by Firestore security rules.

### Available Claims

| Claim | Type | Purpose | Set By |
|-------|------|---------|--------|
| `admin` | boolean | Admin privileges | `setAdminClaim` |
| `packageRunner` | boolean | Package runner approval | `setPackageRunnerClaim` |
| `role` | string | User role (customer/courier/vendor/admin) | Various |

---

## 🚀 HTTP Callable Functions

### 1. `setAdminClaim`

**Location:** `src/http/setAdminClaim.ts`

Promotes a user to admin or revokes admin privileges.

**Parameters:**
```typescript
{
  targetUserId: string;  // UID of user to promote/demote
  isAdmin: boolean;      // true to grant admin, false to revoke
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
  targetUserId: string;
  newRole: string;
}
```

**Security:**
- Caller must be authenticated admin
- Sets custom claim: `admin: true`
- Updates Firestore `role: 'admin'`
- Creates `adminProfile` object
- Logs action to `adminActionLog`

**Example Usage (Client SDK):**
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const setAdminClaim = httpsCallable(functions, 'setAdminClaim');

try {
  const result = await setAdminClaim({
    targetUserId: 'abc123',
    isAdmin: true,
  });
  console.log(result.data.message); // "User abc123 promoted to admin"
} catch (error) {
  console.error(error.message);
}
```

---

### 2. `setPackageRunnerClaim`

**Location:** `src/http/setPackageRunnerClaim.ts`

Approves or rejects package runner applications.

**Parameters:**
```typescript
{
  runnerId: string;          // UID of runner to approve/reject
  approved: boolean;         // true to approve, false to reject
  rejectionReason?: string;  // Optional reason if rejected
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
  runnerId: string;
  approved: boolean;
}
```

**Security:**
- Caller must be authenticated admin
- Runner must have `packageRunnerProfile` with status `pending_review`
- Sets custom claim: `packageRunner: true`
- Updates profile status to `approved` or `rejected`
- Logs action to `adminActionLog`

**Example Usage:**
```typescript
const setPackageRunnerClaim = httpsCallable(functions, 'setPackageRunnerClaim');

const result = await setPackageRunnerClaim({
  runnerId: 'runner123',
  approved: true,
});

// Or reject:
const result = await setPackageRunnerClaim({
  runnerId: 'runner456',
  approved: false,
  rejectionReason: 'Insurance expired',
});
```

---

### 3. `banUser`

**Location:** `src/http/banUser.ts`

Bans or unbans a user account.

**Parameters:**
```typescript
{
  targetUserId: string;  // UID of user to ban/unban
  banned: boolean;       // true to ban, false to unban
  reason?: string;       // Optional reason for ban
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
  targetUserId: string;
  banned: boolean;
}
```

**Security:**
- Caller must be authenticated admin
- Cannot ban yourself
- Disables Firebase Auth account
- Marks Firestore document as banned
- Logs action to `adminActionLog`

**Example Usage:**
```typescript
const banUser = httpsCallable(functions, 'banUser');

// Ban user
await banUser({
  targetUserId: 'badactor123',
  banned: true,
  reason: 'Fraudulent activity',
});

// Unban user
await banUser({
  targetUserId: 'badactor123',
  banned: false,
});
```

---

## 📡 Firestore Triggers

### `onAdminActionLog`

**Location:** `src/triggers/onAdminActionLog.ts`

**Trigger:** New document in `adminActionLog` collection

**Purpose:** Tracks admin actions for audit compliance

**Actions:**
- Increments admin's `totalActions` counter
- Updates `lastActionAt` timestamp
- Non-blocking (logging failure doesn't stop operation)

**Logged Actions:**
- `promote_to_admin` / `revoke_admin`
- `approve_package_runner` / `reject_package_runner`
- `ban_user` / `unban_user`
- `cancel_job`
- `reassign_courier`
- `resolve_dispute`
- `process_refund`
- `moderate_item`
- `toggle_feature_flag`

**Schema:**
```typescript
interface AdminActionLog {
  adminId: string;           // UID of admin who performed action
  action: string;            // Action type (see above)
  targetUserId?: string;     // UID of affected user (if applicable)
  targetEmail?: string;      // Email of affected user
  timestamp: Timestamp;      // When action occurred
  metadata?: {               // Action-specific data
    [key: string]: any;
  };
}
```

---

## 🛠️ Utility Functions

### Location: `src/utils/adminUtils.ts`

Reusable helper functions for admin operations:

#### `verifyAdmin(uid: string): Promise<boolean>`
Check if user is an admin (checks both Firestore role and custom claims)

#### `logAdminAction(params): Promise<void>`
Create audit log entry

#### `hasCustomClaim(uid: string, claimName: string): Promise<boolean>`
Check if user has a specific custom claim

#### `setCustomClaims(uid: string, claims: Record<string, any>): Promise<void>`
Set multiple custom claims at once

#### `getUserRole(uid: string): Promise<string | null>`
Get user's current role from Firestore

#### `updateUserRole(uid: string, newRole: string, adminId?: string): Promise<void>`
Update user role and sync with custom claims

#### `setBanStatus(uid: string, banned: boolean, adminId: string, reason?: string): Promise<void>`
Ban or unban a user

---

## 📊 Testing

### Test Script: `test-admin-functions.js`

Interactive CLI tool for testing admin functions locally.

**Usage:**
```bash
cd firebase/functions
node test-admin-functions.js
```

**Features:**
1. Promote user to admin
2. Approve package runner
3. List all admins
4. List pending runners
5. View admin action log

**Requirements:**
- `service-account-key.json` in functions directory
- Node.js installed

---

## 🚢 Deployment

### Build Functions
```bash
cd firebase/functions
npm run build
```

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:setAdminClaim
firebase deploy --only functions:setPackageRunnerClaim
firebase deploy --only functions:banUser
firebase deploy --only functions:onAdminActionLog
```

### Deploy with Environment Variables
```bash
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase deploy --only functions
```

---

## 🔒 Security Considerations

### Custom Claims
- Custom claims are JWT tokens - they persist until token refresh
- Client must sign out and back in to see new claims immediately
- Or call `auth.currentUser.getIdToken(true)` to force refresh

### Admin Verification
- Always verify admin status in Cloud Functions
- Don't trust client-side role checks alone
- Use both custom claims AND Firestore role checks

### Audit Logging
- All admin actions are logged to `adminActionLog` collection
- Logs are immutable (no updates/deletes)
- Include metadata for forensic analysis

### Ban Prevention
- Admins cannot ban themselves
- Consider implementing "super admin" protection
- Monitor admin action logs for abuse

---

## 📝 Next Steps

### Recommended Additional Functions

1. **`setCustomRole`** - Generic role assignment
2. **`bulkApproveRunners`** - Batch approve multiple runners
3. **`suspendCourier`** - Temporary courier suspension
4. **`resolveDispute`** - Admin dispute resolution
5. **`refundOrder`** - Manual refund processing
6. **`moderateItem`** - Remove marketplace listings

### Integration Tasks

1. Build admin dashboard UI in Next.js
2. Add real-time admin notifications
3. Implement role-based route guards
4. Create admin analytics page
5. Set up monitoring alerts for admin actions

---

## 🐛 Troubleshooting

### "Permission denied" errors
- Verify caller is authenticated admin
- Check Firestore security rules
- Verify custom claims are set correctly

### Custom claims not appearing
- Client must refresh auth token
- Sign out and back in
- Call `getIdToken(true)` to force refresh

### Function timeout
- Check function memory allocation
- Increase timeout in function config
- Optimize Firestore queries

---

## 📚 Resources

- [Firebase Custom Claims Docs](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [GoSenderr Architecture Docs](../../docs/synced-architecture/)

---

**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Maintained By:** GoSenderr Engineering Team

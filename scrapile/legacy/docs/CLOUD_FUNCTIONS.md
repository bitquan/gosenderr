# Cloud Functions Documentation

**Project:** GoSenderr  
**Last Updated:** January 23, 2026  
**Status:** All functions deployed and operational

---

## Overview

GoSenderr uses Firebase Cloud Functions for secure server-side operations that require elevated permissions. All admin-related functions are in `firebase/functions/src/admin.ts`.

---

## Admin Functions

### 1. setAdminClaim

**Purpose:** Promote or demote admin users by setting custom claims

**Trigger:** HTTPS Callable  
**Deployed:** ✅ Yes  
**Location:** `firebase/functions/src/admin.ts`

#### Function Signature
```typescript
setAdminClaim(data: { userId: string, isAdmin: boolean })
```

#### Parameters
- `userId` (string, required) - The user's UID
- `isAdmin` (boolean, required) - `true` to promote, `false` to demote

#### Returns
```typescript
{
  success: boolean,
  message: string
}
```

#### Security
- ⚠️ **Requires:** Caller must be authenticated admin
- ⚠️ **Checks:** Verifies caller has admin custom claim
- ⚠️ **Logs:** Creates audit log entry in `adminActionLogs` collection

#### Usage Example
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const setAdminClaim = httpsCallable(functions, 'setAdminClaim')

// Promote user to admin
const result = await setAdminClaim({
  userId: 'user123',
  isAdmin: true
})

// Demote admin to regular user
const result = await setAdminClaim({
  userId: 'user123',
  isAdmin: false
})
```

#### Called From
- `apps/admin-app/src/components/EditRoleModal.tsx`
- `apps/courier-app/src/components/EditRoleModal.tsx`

#### Audit Log Entry
```typescript
{
  action: 'promote_admin' | 'demote_admin',
  performedBy: 'admin-email@example.com',
  timestamp: Timestamp,
  metadata: {
    userId: 'user123',
    userEmail: 'user@example.com'
  }
}
```

#### Error Handling
- Throws error if caller is not admin
- Throws error if userId is invalid
- Throws error if user not found
- Returns descriptive error messages

---

### 2. setPackageRunnerClaim

**Purpose:** Approve or reject package runner applications

**Trigger:** HTTPS Callable  
**Deployed:** ✅ Yes  
**Location:** `firebase/functions/src/admin.ts`

#### Function Signature
```typescript
setPackageRunnerClaim(data: {
  userId: string,
  approved: boolean,
  reason?: string
})
```

#### Parameters
- `userId` (string, required) - The runner's UID
- `approved` (boolean, required) - `true` to approve, `false` to reject
- `reason` (string, optional) - Rejection reason if `approved: false`

#### Returns
```typescript
{
  success: boolean,
  message: string
}
```

#### Security
- ⚠️ **Requires:** Caller must be authenticated admin
- ⚠️ **Checks:** Verifies caller has admin custom claim
- ⚠️ **Logs:** Creates audit log entry

#### Usage Example
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const setPackageRunnerClaim = httpsCallable(functions, 'setPackageRunnerClaim')

// Approve runner
const result = await setPackageRunnerClaim({
  userId: 'runner123',
  approved: true
})

// Reject runner with reason
const result = await setPackageRunnerClaim({
  userId: 'runner123',
  approved: false,
  reason: 'Incomplete documentation'
})
```

#### Called From
- `apps/courier-app/src/pages/AdminRunners.tsx`

#### What It Does

**On Approval (`approved: true`):**
1. Sets `packageRunner: true` custom claim
2. Updates user document:
   ```typescript
   {
     'packageRunnerProfile.status': 'approved',
     'packageRunnerProfile.approvedAt': Timestamp,
     'packageRunnerProfile.approvedBy': 'admin-uid'
   }
   ```
3. Creates audit log

**On Rejection (`approved: false`):**
1. Sets `packageRunner: false` custom claim
2. Updates user document:
   ```typescript
   {
     'packageRunnerProfile.status': 'rejected',
     'packageRunnerProfile.rejectedAt': Timestamp,
     'packageRunnerProfile.rejectedBy': 'admin-uid',
     'packageRunnerProfile.rejectionReason': reason
   }
   ```
3. Creates audit log

#### Audit Log Entry
```typescript
{
  action: 'approve_runner' | 'reject_runner',
  performedBy: 'admin-email@example.com',
  timestamp: Timestamp,
  metadata: {
    userId: 'runner123',
    userEmail: 'runner@example.com',
    reason: 'Rejection reason' // only if rejected
  }
}
```

---

### 3. banUser

**Purpose:** Ban or unban users from the platform

**Trigger:** HTTPS Callable  
**Deployed:** ✅ Yes  
**Location:** `firebase/functions/src/admin.ts`

#### Function Signature
```typescript
banUser(data: {
  userId: string,
  banned: boolean,
  reason?: string
})
```

#### Parameters
- `userId` (string, required) - The user's UID
- `banned` (boolean, required) - `true` to ban, `false` to unban
- `reason` (string, optional) - Ban reason if `banned: true`

#### Returns
```typescript
{
  success: boolean,
  message: string
}
```

#### Security
- ⚠️ **Requires:** Caller must be authenticated admin
- ⚠️ **Checks:** Verifies caller has admin custom claim
- ⚠️ **Logs:** Creates audit log entry

#### Usage Example
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const banUser = httpsCallable(functions, 'banUser')

// Ban user
const result = await banUser({
  userId: 'user123',
  banned: true,
  reason: 'Terms of service violation'
})

// Unban user
const result = await banUser({
  userId: 'user123',
  banned: false
})
```

#### Called From
- `apps/admin-app/src/components/BanUserModal.tsx`
- `apps/courier-app/src/components/BanUserModal.tsx`

#### What It Does

**On Ban (`banned: true`):**
1. Disables user account via `admin.auth().updateUser()`
2. Updates user document:
   ```typescript
   {
     banned: true,
     bannedAt: Timestamp,
     bannedBy: 'admin-uid',
     banReason: reason
   }
   ```
3. Creates audit log

**On Unban (`banned: false`):**
1. Enables user account via `admin.auth().updateUser()`
2. Updates user document:
   ```typescript
   {
     banned: false,
     unbannedAt: Timestamp,
     unbannedBy: 'admin-uid'
   }
   ```
3. Creates audit log

#### Audit Log Entry
```typescript
{
  action: 'ban_user' | 'unban_user',
  performedBy: 'admin-email@example.com',
  timestamp: Timestamp,
  metadata: {
    userId: 'user123',
    userEmail: 'user@example.com',
    reason: 'Ban reason' // only if banned
  }
}
```

#### Effects
- Banned users cannot sign in
- Existing sessions are invalidated
- User sees error message on login attempt
- Unban restores full access immediately

---

### 4. onAdminActionLog

**Purpose:** Trigger that runs when admin actions are logged

**Trigger:** Firestore onCreate  
**Deployed:** ✅ Yes  
**Location:** `firebase/functions/src/admin.ts`  
**Collection:** `adminActionLogs/{logId}`

#### Function Signature
```typescript
onAdminActionLog(snapshot, context)
```

#### What It Does
- Listens for new documents in `adminActionLogs` collection
- Can send notifications (email, Slack, etc.)
- Can trigger additional workflows
- Can archive old logs
- Currently: Logs to console (can extend for notifications)

#### Triggered By
- `setAdminClaim`
- `setPackageRunnerClaim`
- `banUser`
- Manual audit log creation

#### Document Structure
```typescript
{
  action: string,              // e.g., 'ban_user', 'approve_runner'
  performedBy: string,         // Admin email
  performedByUid: string,      // Admin UID
  timestamp: Timestamp,        // When action occurred
  metadata: {                  // Action-specific data
    userId: string,
    userEmail: string,
    reason?: string,
    // ... other relevant fields
  }
}
```

#### Usage Example
```typescript
// Manual log creation (rarely needed, functions create logs automatically)
import { addDoc, collection } from 'firebase/firestore'

await addDoc(collection(db, 'adminActionLogs'), {
  action: 'custom_action',
  performedBy: 'admin@example.com',
  performedByUid: 'admin-uid',
  timestamp: new Date(),
  metadata: {
    details: 'Some custom admin action'
  }
})
// onAdminActionLog trigger will fire automatically
```

---

## Deployment

### Deploy All Functions
```bash
cd firebase/functions
npm run build
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:setAdminClaim
firebase deploy --only functions:setPackageRunnerClaim
firebase deploy --only functions:banUser
firebase deploy --only functions:onAdminActionLog
```

### View Logs
```bash
firebase functions:log
```

### View Specific Function Logs
```bash
firebase functions:log --only setAdminClaim
```

---

## Security Rules

### Firestore Rules for Audit Logs

```javascript
// In firebase/firestore.rules

match /adminActionLogs/{logId} {
  // Only admins can read audit logs
  allow read: if isAdmin();
  
  // Only system (Cloud Functions) can write
  allow write: if false;
}

function isAdmin() {
  return request.auth != null && 
         request.auth.token.admin == true;
}
```

**Important:** Audit logs can only be created by Cloud Functions, not directly by clients.

---

## Testing

### Test setAdminClaim
```typescript
// In browser console (must be admin)
const functions = getFunctions()
const setAdminClaim = httpsCallable(functions, 'setAdminClaim')

// Promote test user
const result = await setAdminClaim({
  userId: 'test-user-id',
  isAdmin: true
})
console.log(result.data) // { success: true, message: '...' }
```

### Test setPackageRunnerClaim
```typescript
const setPackageRunnerClaim = httpsCallable(functions, 'setPackageRunnerClaim')

const result = await setPackageRunnerClaim({
  userId: 'test-runner-id',
  approved: true
})
console.log(result.data)
```

### Test banUser
```typescript
const banUser = httpsCallable(functions, 'banUser')

const result = await banUser({
  userId: 'test-user-id',
  banned: true,
  reason: 'Testing ban functionality'
})
console.log(result.data)
```

---

## Error Codes

### Common Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `permission-denied` | Not authorized | Caller is not admin | Sign in as admin |
| `invalid-argument` | Missing required field | Missing userId or other param | Check parameters |
| `not-found` | User not found | Invalid userId | Verify user exists |
| `internal` | Internal server error | Function crashed | Check logs |

---

## Performance

### Execution Times (Avg)
- `setAdminClaim`: ~200ms
- `setPackageRunnerClaim`: ~250ms
- `banUser`: ~300ms (includes Firebase Auth call)
- `onAdminActionLog`: ~50ms

### Rate Limits
- Default: 1000 calls/minute per function
- Can be increased in Firebase Console
- Implement client-side debouncing for bulk operations

---

## Future Enhancements

### Planned Functions
- [ ] `sendNotificationEmail` - Send emails to users
- [ ] `generateRevenueReport` - Scheduled revenue reports
- [ ] `autoArchiveOldLogs` - Clean up old audit logs
- [ ] `syncStripePayouts` - Stripe Connect integration
- [ ] `processRefund` - Automated refund handling
- [ ] `exportDataToCSV` - Server-side CSV generation

---

## Troubleshooting

### Function Not Found
- **Cause:** Function not deployed
- **Solution:** Run `firebase deploy --only functions`

### Permission Denied
- **Cause:** User doesn't have admin claim
- **Solution:** Verify user has `admin: true` in custom claims

### Timeout Error
- **Cause:** Function taking too long (>60s)
- **Solution:** Optimize function code or increase timeout in `functions.config()`

### CORS Error
- **Cause:** Calling from unauthorized domain
- **Solution:** Add domain to Firebase Console → Functions → CORS

---

**End of Cloud Functions Documentation** ⚙️

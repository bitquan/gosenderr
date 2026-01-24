# Custom Claims Setup - Deployment Checklist

## ✅ Completed

### 1. Cloud Functions Created
- [x] `setAdminClaim` - Promote/demote admins
- [x] `setPackageRunnerClaim` - Approve/reject runners (enhanced)
- [x] `banUser` - Ban/unban users
- [x] `onAdminActionLog` - Audit logging trigger
- [x] Admin utility helpers (`adminUtils.ts`)

### 2. Security Rules Updated
- [x] Enhanced `isAdmin()` helper with custom claim support
- [x] Added `isCourier()`, `isPackageRunner()`, `isVendor()` helpers
- [x] Food delivery equipment validation
- [x] Marketplace order status transitions
- [x] Long haul route requirements (vehicle/insurance)
- [x] Admin action log collection rules

### 3. Documentation
- [x] Comprehensive function documentation (ADMIN_FUNCTIONS.md)
- [x] Test script for local testing
- [x] Usage examples and security considerations

---

## 🚀 Next Steps (Deploy)

### Step 1: Deploy Firestore Rules
```bash
cd /Users/papadev/dev/apps/gosenderr
firebase deploy --only firestore:rules
```

**Verify:** Check Firebase Console → Firestore → Rules

---

### Step 2: Deploy Cloud Functions
```bash
cd /Users/papadev/dev/apps/gosenderr
firebase deploy --only functions
```

**Expected Output:**
```
✔  functions: Finished running predeploy script.
...
✔  functions[setAdminClaim(us-central1)] Successful create operation.
✔  functions[setPackageRunnerClaim(us-central1)] Successful update operation.
✔  functions[banUser(us-central1)] Successful create operation.
✔  functions[onAdminActionLog(us-central1)] Successful create operation.
```

---

### Step 3: Create First Admin User

**Option A: Using Firebase Console**
1. Go to Firebase Console → Authentication
2. Find your user account
3. Copy UID
4. Go to Firestore → `users` collection
5. Find your user document
6. Edit: Set `role: 'admin'`
7. Add `adminProfile` object:
```json
{
  "permissions": ["all"],
  "isSuperAdmin": true,
  "promotedAt": "2026-01-23T00:00:00Z",
  "promotedBy": "SYSTEM",
  "lastLoginAt": null,
  "totalActions": 0
}
```
8. Go to Authentication → User → Custom Claims
9. Set claims:
```json
{
  "admin": true,
  "role": "admin"
}
```

**Option B: Using Test Script**
```bash
cd firebase/functions
node test-admin-functions.js
# Select option 1: Promote user to admin
# Enter your email
```

**Option C: Using Firebase CLI**
```bash
cd firebase/functions
node -e "
const admin = require('firebase-admin');
admin.initializeApp();

const email = 'YOUR_EMAIL@example.com';

admin.auth().getUserByEmail(email).then(user => {
  return admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
    role: 'admin'
  });
}).then(() => {
  console.log('✅ Admin claim set');
}).catch(error => {
  console.error('❌ Error:', error);
});
"
```

---

### Step 4: Test Custom Claims

**Test in Browser Console:**
```javascript
// Get current user token
const user = auth.currentUser;
const token = await user.getIdTokenResult(true); // Force refresh

console.log('Custom claims:', token.claims);
// Should show: { admin: true, role: 'admin', ... }

// Test calling admin function
const functions = getFunctions();
const setAdminClaim = httpsCallable(functions, 'setAdminClaim');

try {
  const result = await setAdminClaim({
    targetUserId: 'TEST_USER_ID',
    isAdmin: true
  });
  console.log('✅ Success:', result.data);
} catch (error) {
  console.error('❌ Error:', error.message);
}
```

---

### Step 5: Verify Security Rules

**Test Firestore Rules:**
```bash
firebase emulators:start --only firestore
```

Then in another terminal:
```bash
cd firebase/functions
npm test  # If you have tests set up
```

**Manual Tests:**
1. ✅ Admin can read all users
2. ✅ Admin can update any user role
3. ✅ Admin can create admin action logs
4. ✅ Non-admin CANNOT update roles
5. ✅ Package runner can claim routes (with custom claim)
6. ✅ Package runner CANNOT claim without custom claim
7. ✅ Courier can claim food jobs (with equipment)
8. ✅ Courier CANNOT claim food jobs (without equipment)

---

## 🔍 Monitoring

### Check Function Logs
```bash
firebase functions:log --only setAdminClaim
firebase functions:log --only setPackageRunnerClaim
firebase functions:log --only banUser
firebase functions:log --only onAdminActionLog
```

### View Admin Action Log (Firestore)
```javascript
const logs = await db.collection('adminActionLog')
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get();

logs.forEach(doc => {
  const data = doc.data();
  console.log(`[${data.timestamp.toDate()}] ${data.action} by ${data.adminId}`);
});
```

### Firebase Console Monitoring
1. Go to Firebase Console → Functions
2. Check execution count, errors, latency
3. Set up alerts for failures
4. Monitor quota usage

---

## ⚠️ Important Notes

### Custom Claim Refresh
- Custom claims are stored in JWT tokens
- Tokens expire after 1 hour
- Client must refresh to see new claims:
  ```javascript
  await auth.currentUser.getIdToken(true); // Force refresh
  // Or sign out and back in
  ```

### Security Rules Caching
- Rules are cached client-side for 1 hour
- Server-side rules apply immediately
- Test with incognito or clear cache

### Admin Permissions
- First admin must be created manually
- Subsequent admins can be promoted via `setAdminClaim`
- Implement role hierarchy (super admin > admin) if needed

### Audit Logging
- All admin actions are logged automatically
- Logs are immutable (cannot be deleted)
- Consider log retention policy for compliance

---

## 🐛 Common Issues

### Issue: "Permission denied" when calling function
**Solution:**
- Verify user is authenticated: `auth.currentUser`
- Check user has admin role in Firestore
- Check custom claims: `await user.getIdTokenResult()`
- Verify security rules deployed

### Issue: Custom claims not appearing
**Solution:**
- Force token refresh: `getIdToken(true)`
- Sign out and back in
- Wait for token to expire (1 hour)
- Check Firebase Auth console for claims

### Issue: Function timeout
**Solution:**
- Increase function timeout in config
- Check Firestore indexes
- Optimize batch operations
- Add pagination for large queries

### Issue: "Admin claim set but rules still fail"
**Solution:**
- Verify both custom claim AND Firestore role set
- Check security rules use correct helper function
- Clear browser cache
- Test in incognito mode

---

## 📋 Rollback Plan

If issues arise after deployment:

### Rollback Functions
```bash
# List previous deployments
firebase functions:log

# Rollback to previous version
firebase rollback functions
```

### Rollback Security Rules
```bash
# View rule history in Firebase Console
# Or restore from git:
git checkout HEAD~1 firebase/firestore.rules
firebase deploy --only firestore:rules
```

### Emergency Admin Access
If locked out of admin functions:

```bash
# Direct database access via Firebase CLI
firebase firestore:set users/YOUR_UID '{"role":"admin","adminProfile":{"permissions":["all"],"isSuperAdmin":true}}' --merge

# Set custom claim via Node.js
node -e "
const admin = require('firebase-admin');
admin.initializeApp();
admin.auth().setCustomUserClaims('YOUR_UID', { admin: true, role: 'admin' });
"
```

---

## ✅ Deployment Complete!

Once all steps are done:
- [ ] Firestore rules deployed
- [ ] Cloud Functions deployed
- [ ] First admin user created
- [ ] Custom claims tested
- [ ] Security rules verified
- [ ] Monitoring set up
- [ ] Documentation reviewed

**Next:** Build admin dashboard UI to call these functions!

---

**Questions?** Check [ADMIN_FUNCTIONS.md](./ADMIN_FUNCTIONS.md) for detailed docs.

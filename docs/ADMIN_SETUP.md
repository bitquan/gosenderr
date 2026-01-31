# Admin Setup Guide

## Overview

Admin access is now completely separate from regular user roles to maintain security and prevent confusion.

## Changes Made

### 1. Separate Admin Login

- **New Admin Login Page**: `/admin-login`
- **Access**: Click "🔐 Admin Access" at the bottom of the regular login page
- **Security**: Only users with `role: "admin"` in Firestore can access

### 2. Regular Login (No Admin Tab)

- Removed Admin from role tabs
- Role tabs: Customer, Driver, Runner, Seller
- Clean separation between regular users and admin access

### 3. Admin Dashboard Access

- URL: `http://localhost:3000/admin-login`
- Requires email + password
- Validates admin role in Firestore
- Redirects to `/admin/dashboard` on success

## How to Make Yourself Admin

### Option 1: Firebase Console (Recommended)

1. **Sign up for a regular account first**:
   - Go to `http://localhost:3000/login`
   - Sign up with your email (choose any role like Customer)
2. **Get your User UID**:
   - Login and check browser console
   - Or go to Firebase Console > Authentication > Users
   - Copy your User UID

3. **Set admin role manually**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: `gosenderr-6773f`
   - Navigate to: Firestore Database > users > [YOUR_UID]
   - Edit the `role` field to: `admin`
   - Click Save

4. **Login as admin**:
   - Go to `http://localhost:3000/admin-login`
   - Enter your email and password
   - You'll be redirected to admin dashboard

### Option 2: Using Firebase CLI

```bash
# Update user role to admin
firebase firestore:update users/YOUR_USER_UID --data '{"role":"admin"}' --project gosenderr-6773f
```

### Option 3: Using the Script

```bash
# Run the helper script
./scripts/make-admin.sh

# Follow the prompts
```

## Testing

1. **Test Admin Login**:

   ```
   - Go to http://localhost:3000/admin-login
   - Enter admin email/password
   - Should redirect to /admin/dashboard
   ```

2. **Test Regular Login**:

   ```
   - Go to http://localhost:3000/login
   - Should see 4 role tabs (no Admin tab)
   - Small "🔐 Admin Access" link at bottom
   ```

3. **Test Security**:
   ```
   - Try admin login with non-admin user
   - Should show "Access denied. Admin privileges required."
   ```

## Current Admin User

Based on the screenshot:

- **UID**: `AqP3BafBqqSltKxGV86VJbqtfs83`
- **Role**: `admin` (already set)
- **Email**: Your email in Firebase Auth

## Quick Start

1. **If you already have an admin user**:

   ```
   Go to: http://localhost:3000/admin-login
   Login with your credentials
   ```

2. **If you need to create a new admin**:
   ```
   1. Sign up at /login (any role)
   2. Update Firestore: users/[UID]/role = "admin"
   3. Login at /admin-login
   ```

## Security Notes

- ⚠️ Admin role can ONLY be set manually (not via signup)
- ⚠️ Firestore rules prevent users from setting their own role to admin
- ⚠️ Admin login checks role before granting access
- ⚠️ All admin access attempts are logged

## Troubleshooting

### "Access denied" when trying to login as admin

- Check Firestore: `users/[YOUR_UID]/role` must equal `"admin"`
- Make sure you're using the correct email/password
- Check browser console for detailed error logs

### Redirected to /select-role after login

- This means your user document has no `role` field
- Set the role in Firestore to `"admin"` manually
- Then try logging in again at `/admin-login`

### Can't find Admin tab

- Admin tab has been removed from regular login (by design)
- Look for "🔐 Admin Access" link at the bottom of login page
- Or go directly to `/admin-login`

## File Locations

- **Admin Login Page**: `/apps/web/src/app/admin-login/page.tsx`
- **Regular Login Page**: `/apps/web/src/app/login/page.tsx`
- **Admin Setup Script**: `/scripts/make-admin.sh`
- **Firestore Rules**: `/firebase/firestore.rules`

## Next Steps

- [ ] Create admin account using instructions above
- [ ] Test admin login at `/admin-login`
- [ ] Test regular login still works for other roles
- [ ] Consider adding role switching in user settings (future feature)

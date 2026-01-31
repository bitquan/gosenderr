# 🚀 Quick Start: Enable Phase 2 Features

## Step-by-Step Instructions

### 1️⃣ Access Admin Feature Flags

1. **Open the app**: http://localhost:3000
2. **Login as Admin**:
   - Click on the **Admin** tab (👨‍💼)
   - Enter admin credentials
3. **Navigate to Feature Flags**:
   - From Admin Dashboard
   - Click **"Feature Flags"** card
   - You'll see the feature flags management page

---

### 2️⃣ Enable Package Shipping

**Location:** Customer Section (scroll down)

**Toggle:** "Package Shipping"

**Description:** "Enable package shipping for customers"

**Action:**

```
☐ OFF  →  ☑ ON
```

**Effect:**

- Customers can now access `/ship` page
- Stripe payment processing enabled
- Package creation workflow active

---

### 3️⃣ Enable Courier Routes

**Location:** Delivery Section (near top)

**Toggle:** "Route Delivery"

**Description:** "Enable scheduled route-based deliveries"

**Action:**

```
☐ OFF  →  ☑ ON
```

**Effect:**

- Couriers can browse routes at `/courier/routes`
- Route acceptance workflow enabled
- Batched delivery system active

---

## ✅ Verification

### Verify Package Shipping is Enabled

1. **Login as Customer** (use Customer tab)
2. **Go to Dashboard**
3. **Click "Ship Package"** button
4. **You should see:** Ship package form (NOT "not available" error)

### Verify Courier Routes is Enabled

1. **Login as Courier** (use Driver tab)
2. **Navigate to Routes** page
3. **You should see:** List of available routes (NOT "currently disabled" error)

---

## 🎯 What's Next?

After enabling both flags:

1. **Internal Testing** (2-3 team members)
   - Test package shipping flow end-to-end
   - Test courier route acceptance
   - Use test Stripe card: `4242 4242 4242 4242`

2. **Beta Testing** (5-10 users)
   - Select trusted users
   - Monitor for issues
   - Collect feedback

3. **Full Rollout** (Phase 3)
   - If no critical issues
   - Expand to all users

---

## 📊 Current Status

| Feature          | Flag Path                  | Status      | Ready? |
| ---------------- | -------------------------- | ----------- | ------ |
| Package Shipping | `customer.packageShipping` | 🔴 Disabled | ✅ Yes |
| Courier Routes   | `delivery.routes`          | 🔴 Disabled | ✅ Yes |

**Both features are fully built and tested in Phase 1.** They just need the feature flags enabled!

---

## 🐛 Troubleshooting

### "Feature flags page not loading"

- Check you're logged in as admin
- Verify Firestore connection
- Check browser console for errors

### "Toggle not saving"

- Check Firestore permissions
- Verify admin role in Firestore users collection
- Try refreshing the page

### "Feature still shows as disabled"

- Feature flags use real-time sync
- May take 1-2 seconds to update
- Try refreshing the app

---

## 📞 Need Help?

**Error Messages:**

- Check browser console (F12)
- Look for red errors
- Share screenshot in team chat

**Feature Questions:**

- See full documentation: [PHASE_2_ENABLE_FEATURES.md](./PHASE_2_ENABLE_FEATURES.md)
- Review Phase 1 completion: Issue #12

**Technical Issues:**

- Create GitHub issue
- Include steps to reproduce
- Tag with "Phase 2" label

---

## 🎉 That's It!

Once both flags are enabled:

- ✅ Package shipping is live
- ✅ Courier routes are active
- ✅ Phase 2 objectives met
- ✅ Ready for beta testing

**Remember:** These features were fully built in Phase 1. Enabling the flags just makes them accessible to users!

# Phase 2: Enable Core Features - Implementation Guide

## 🎯 Overview

Phase 2 focuses on enabling the core features that were built in Phase 1 and making them available to users through feature flag management.

## 📋 Task Checklist

- [ ] Enable Package Shipping Feature Flag
- [ ] Enable Courier Routes Feature Flag
- [ ] Beta Testing with Small Group
- [ ] Monitor & Fix Issues

## 🚀 Features to Enable

### 1. Package Shipping (`customer.packageShipping`)

**What it does:**

- Allows customers to ship packages through the `/ship` page
- Integrates with Stripe for payment processing
- Creates package documents in Firestore
- Generates public tracking links

**Current State:** ❌ Disabled (default: `false`)

**When disabled:** Users see error message "Package shipping is not currently available"

**How to enable:**

1. Login as admin at http://localhost:3000/login (select Admin tab)
2. Navigate to Admin Dashboard → Feature Flags
3. Scroll to "Customer" section
4. Toggle "Package Shipping" to ON

**Impact:**

- Customers can access `/ship` page
- Full Stripe payment flow becomes active
- Package creation and tracking enabled

---

### 2. Courier Routes (`delivery.routes`)

**What it does:**

- Allows couriers to browse and claim delivery routes
- Shows available routes with multiple stops
- Displays route details: earnings, distance, time estimates
- Enables route acceptance workflow

**Current State:** ❌ Disabled (default: `false`)

**When disabled:** Couriers see message "The routes feature is currently disabled. Please check back later."

**How to enable:**

1. Login as admin at http://localhost:3000/login
2. Navigate to Admin Dashboard → Feature Flags
3. Scroll to "Delivery" section
4. Toggle "Route Delivery" to ON

**Impact:**

- Couriers can access `/courier/routes` page
- Route browsing and acceptance enabled
- Batched delivery workflow active

---

## 🧪 Beta Testing Plan

### Phase 2.1: Internal Testing (Week 1)

**Participants:** 2-3 team members

**Test Scenarios:**

1. **Package Shipping Flow**
   - Create new package shipment
   - Complete Stripe payment
   - Verify package appears in dashboard
   - Test public tracking link
   - Check GPS photo capture

2. **Courier Routes Flow**
   - Browse available routes
   - Accept a route
   - View route details
   - Check earnings calculation
   - Test route completion

**Success Criteria:**

- ✅ All payments process successfully
- ✅ No console errors or crashes
- ✅ Data saves correctly to Firestore
- ✅ UI responds smoothly
- ✅ Tracking links work publicly

---

### Phase 2.2: Controlled Beta (Week 2)

**Participants:** 5-10 selected users

- 3-5 customers (for package shipping)
- 2-5 couriers (for route delivery)

**Selection Criteria:**

- Active users with good history
- Diverse geographic locations
- Mix of device types (iOS, Android, Web)
- Willing to provide feedback

**Monitoring:**

- Daily check of error logs
- User feedback collection
- Performance metrics
- Payment success rate

**Rollback Plan:**

- If critical issues found, immediately disable flags
- Document issues in GitHub
- Fix and re-test before re-enabling

---

## 🔍 Monitoring Checklist

### Metrics to Track

**Package Shipping:**

- [ ] Number of shipments created
- [ ] Payment success rate
- [ ] Average time to complete shipment
- [ ] Tracking link usage
- [ ] GPS photo upload success rate

**Courier Routes:**

- [ ] Number of routes accepted
- [ ] Average time to accept route
- [ ] Route completion rate
- [ ] Courier satisfaction (feedback)

### Error Monitoring

**Watch for:**

- Stripe payment failures
- Firestore write errors
- GPS location issues
- Photo upload failures
- Route calculation errors

**Tools:**

- Browser console logs
- Firestore error logs
- Stripe dashboard
- Firebase Analytics (if enabled)

---

## 📝 Testing Instructions

### Test Package Shipping

1. **Login as Customer**

   ```
   - Go to http://localhost:3000/login
   - Select "Customer" tab
   - Login with test customer account
   ```

2. **Create Package**

   ```
   - Click "Ship Package" from dashboard
   - Fill in sender/recipient details
   - Select package size and weight
   - Choose pickup/dropoff locations
   - Submit and proceed to payment
   ```

3. **Complete Payment**

   ```
   Test Card: 4242 4242 4242 4242
   Expiry: Any future date
   CVC: Any 3 digits
   ZIP: Any 5 digits
   ```

4. **Verify Results**
   ```
   - Check package appears in dashboard
   - Copy tracking link and test in incognito
   - Verify package status updates
   ```

---

### Test Courier Routes

1. **Login as Courier**

   ```
   - Go to http://localhost:3000/login
   - Select "Driver" tab
   - Login with test courier account
   ```

2. **Browse Routes**

   ```
   - Navigate to Routes page
   - Verify routes list displays
   - Check earnings and distance calculations
   - View route details
   ```

3. **Accept Route**

   ```
   - Click "Accept Route" on available route
   - Verify route status changes
   - Check route appears in dashboard
   - Test route navigation
   ```

4. **Complete Route**
   ```
   - Follow route stops
   - Take GPS photos at each stop
   - Mark deliveries complete
   - Verify earnings credited
   ```

---

## 🐛 Known Issues & Limitations

### Current Known Issues

- None reported yet (Phase 1 complete)

### Expected Limitations

- Payment requires real Stripe account (test mode)
- GPS requires device location permissions
- Photo upload requires camera access
- Routes require Mapbox API key

---

## 📊 Success Metrics

**Phase 2 Complete When:**

- ✅ Both feature flags enabled successfully
- ✅ 5+ successful package shipments
- ✅ 3+ routes accepted and completed
- ✅ No critical bugs reported
- ✅ User feedback is positive
- ✅ Payment success rate > 95%

---

## 🔗 Related Resources

- [Phase 1 Completion Report](../history/CHECKPOINT_V2_E2E_JOBS_READY.md)
- [Feature Flags Page](/apps/web/src/app/admin/feature-flags/page.tsx)
- [Ship Page](/apps/web/src/app/ship/page.tsx)
- [Courier Routes Page](/apps/web/src/app/courier/routes/page.tsx)

---

## 📞 Support

**Issue Reporting:**

- Create GitHub issue with "Phase 2" label
- Include screenshots and error messages
- Tag @bitquan for critical issues

**Questions:**

- Check documentation first
- Ask in team channel
- Schedule demo if needed

---

## ✅ Completion Status

**Last Updated:** 2025-01-26

**Status:** 🟡 In Progress

**Next Steps:**

1. Enable feature flags via admin UI
2. Conduct internal testing
3. Select beta testers
4. Monitor for 1 week
5. Move to Phase 3

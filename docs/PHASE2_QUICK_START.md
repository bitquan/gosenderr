# Phase 2: Quick Start Guide

## For Product/Admin Team - How to Enable Beta Features

### Prerequisites
✅ PR merged and deployed to production  
✅ You have admin access to GoSenderr  
✅ Firebase Console access (for monitoring)

### Step-by-Step Instructions

#### 1. Access Admin Dashboard
1. Log in to GoSenderr with your admin account
2. Navigate to: `https://your-domain.com/admin/feature-flags`
3. You should see the Feature Flags admin page

#### 2. Initialize Feature Flags (First Time Only)
If you see "No feature flags found":
1. Click **"Initialize Default Flags"** button
2. Wait for success message
3. Two flags will appear:
   - `customer.packageShipping` (✗ Disabled)
   - `delivery.routes` (✗ Disabled)

#### 3. Enable Package Shipping Feature
1. Find "customer.packageShipping" in the Customer Features section
2. Click the toggle button (currently shows "✗ Disabled")
3. Button changes to "✓ Enabled" (green)
4. Feature is now live!

**What this enables:**
- Customers can access `/ship` page
- Page provides links to package delivery creation
- Marked as "Beta Feature" for users

#### 4. Enable Courier Routes Feature
1. Find "delivery.routes" in the Delivery Features section
2. Click the toggle button
3. Button changes to "✓ Enabled"
4. Feature is now live!

**What this enables:**
- Couriers can access `/courier/routes` page
- Alternative view of available delivery jobs
- Shows route details with earnings estimates

#### 5. Verify Features Work
**Test Package Shipping:**
1. Log in as a customer
2. Navigate to `/ship`
3. Should see package shipping page (not "Feature Not Available")
4. Click links to verify job creation works

**Test Courier Routes:**
1. Log in as a courier
2. Navigate to `/courier/routes`
3. Should see available routes (if any jobs exist)
4. Verify route details display correctly

#### 6. Begin Beta Testing
Follow the detailed guide: `docs/BETA_TESTING_PHASE2.md`

**Quick checklist:**
- [ ] Select 5-10 test customers
- [ ] Select 5-10 test couriers
- [ ] Send them instructions and feature overview
- [ ] Ask for feedback via Google Form or email
- [ ] Monitor Firebase Console daily
- [ ] Check payment processing logs
- [ ] Respond to issues within 24 hours

#### 7. Monitor Features
**Daily:**
- Check Firebase Console → Functions → Logs for errors
- Review Firestore for new jobs created via /ship
- Check payment success rates
- Read user feedback

**Weekly:**
- Review beta testing metrics
- Assess if ready to expand to more users
- Fix any issues discovered
- Update feature flags documentation if needed

#### 8. Disable Features if Needed
If critical issues arise:
1. Go to `/admin/feature-flags`
2. Click the toggle for problematic feature
3. Button changes to "✗ Disabled" (gray)
4. Feature becomes inaccessible immediately
5. Users see "Feature Not Available" message
6. Fix issues, then re-enable when ready

### Common Questions

**Q: Who can access the admin dashboard?**  
A: Only users with `role === 'admin'` in their Firestore user document.

**Q: Do changes require a page refresh?**  
A: No! Changes sync in real-time via WebSocket. Users will see updates immediately.

**Q: Can we enable features for specific users only?**  
A: Not yet. This is a future enhancement. Currently, flags are global (all or none).

**Q: What if a flag doesn't exist?**  
A: The system treats non-existent flags as disabled. Use "Initialize Default Flags" to create them.

**Q: How do we know who last changed a flag?**  
A: The admin's UID is recorded in the `updatedBy` field, visible in Firestore Console.

**Q: What happens if we delete a flag?**  
A: The gated pages will show "Feature Not Available". Only do this if permanently removing the feature.

### Troubleshooting

**Problem: "Feature Not Available" message when flag is enabled**
- Check flag key matches exactly (case-sensitive)
- Verify flag document exists in Firestore
- Check browser console for errors
- Try logging out and back in
- Clear browser cache and cookies

**Problem: Cannot toggle flag**
- Verify you're logged in as admin
- Check Firestore rules are deployed
- Look for errors in browser console
- Try refreshing the page

**Problem: Flag doesn't update in real-time**
- Check browser network tab for WebSocket connection
- Verify Firestore rules allow read access
- Try refreshing the page manually
- Check for JavaScript errors in console

### Emergency Contacts
- **Technical Issues**: Development team Slack
- **User Support Issues**: support@gosenderr.com
- **Payment Issues**: Stripe dashboard + finance team
- **Security Issues**: security@gosenderr.com

### Documentation Links
- **Full Feature Flag Guide**: `docs/FEATURE_FLAGS.md`
- **Detailed Beta Testing**: `docs/BETA_TESTING_PHASE2.md`
- **Firebase Console**: https://console.firebase.google.com
- **Firestore Rules**: `firebase/firestore.rules`

---

**Ready to Begin?**  
Start with Step 1 above and follow the guide. Reach out to the development team if you have questions!

**Last Updated**: January 2026  
**Version**: 1.0

# Stripe API Migration - Deployment Checklist

**Date:** January 24, 2026  
**Branch:** `feature/issue-33-vite-migration`  
**Status:** 🔴 Ready for Deployment

---

## ✅ Pre-Deployment Checklist

### 1. Cloud Functions Created

- [x] Created `firebase/functions/src/stripe/createPaymentIntent.ts`
- [x] Created `firebase/functions/src/stripe/stripeConnect.ts`
- [x] Created `firebase/functions/src/stripe/marketplaceCheckout.ts`
- [x] Created `firebase/functions/src/stripe/webhook.ts`
- [x] Created `firebase/functions/src/stripe/index.ts`
- [x] Updated `firebase/functions/src/index.ts` to export Stripe functions
- [x] Updated Stripe package to v17.5.0
- [x] Fixed Stripe API version to '2025-02-24.acacia'
- [x] Build succeeded without errors

### 2. Helper Functions Created

- [x] Created `apps/marketplace-app/src/lib/cloudFunctions.ts`
- [x] Type definitions for all Cloud Functions
- [x] Wrapper functions for easy consumption

### 3. Environment Variables

- [ ] Set `STRIPE_SECRET_KEY` in Firebase Functions config
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Firebase Functions config

```bash
# Run these commands:
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# Verify:
firebase functions:config:get
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Cloud Functions

```bash
cd /Users/papadev/dev/apps/gosenderr
firebase deploy --only functions:createPaymentIntent,functions:stripeConnect,functions:marketplaceCheckout,functions:stripeWebhook --project gosenderr-6773f
```

**Expected Output:**
```
✔ functions[createPaymentIntent] Successful create operation
✔ functions[stripeConnect] Successful create operation
✔ functions[marketplaceCheckout] Successful create operation
✔ functions[stripeWebhook] Successful create operation
```

**Function URLs:**
- `https://us-central1-gosenderr-6773f.cloudfunctions.net/createPaymentIntent`
- `https://us-central1-gosenderr-6773f.cloudfunctions.net/stripeConnect`
- `https://us-central1-gosenderr-6773f.cloudfunctions.net/marketplaceCheckout`
- `https://us-central1-gosenderr-6773f.cloudfunctions.net/stripeWebhook`

---

### Step 2: Update Stripe Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter webhook URL:
   ```
   https://us-central1-gosenderr-6773f.cloudfunctions.net/stripeWebhook
   ```
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copy the webhook signing secret (starts with `whsec_...`)
6. Update Firebase config:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_..."
   firebase deploy --only functions:stripeWebhook
   ```

---

### Step 3: Update Customer App (Code Changes Needed)

**Files to Update:**

1. **Payment Form** - `apps/marketplace-app/src/components/v2/PaymentForm.tsx`
2. **Marketplace Checkout** - `apps/marketplace-app/src/pages/marketplace/[itemId]/page.tsx`
3. **Vendor Onboarding** - `apps/marketplace-app/src/pages/vendor/apply/page.tsx` or similar

#### Example Updates:

**OLD CODE (Next.js API):**
```typescript
// apps/marketplace-app/src/components/v2/PaymentForm.tsx
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobId, courierRate, platformFee }),
});
const data = await response.json();
```

**NEW CODE (Cloud Function):**
```typescript
import { createPaymentIntent } from '@/lib/cloudFunctions';

const data = await createPaymentIntent({
  jobId,
  courierRate,
  platformFee,
});
```

---

## 🧪 Testing Checklist

### Local Testing (Firebase Emulator)

- [ ] Start Firebase emulators
  ```bash
  firebase emulators:start --only functions
  ```

- [ ] Update marketplace-app to point to emulator
  ```typescript
  // In firebase.ts during development
  import { connectFunctionsEmulator } from 'firebase/functions';
  connectFunctionsEmulator(functions, 'localhost', 5001);
  ```

- [ ] Test each function locally

### Production Testing

#### Test 1: Payment Intent Creation
- [ ] Log in to customer app
- [ ] Create a delivery job
- [ ] Navigate to payment page
- [ ] Verify PaymentIntent created
- [ ] Check Firebase Functions logs:
  ```bash
  firebase functions:log --only createPaymentIntent
  ```

#### Test 2: Stripe Connect Onboarding
- [ ] Navigate to vendor application
- [ ] Start Stripe Connect flow
- [ ] Complete onboarding
- [ ] Verify account ID saved
- [ ] Check Stripe Dashboard for connected account

#### Test 3: Marketplace Checkout
- [ ] Browse marketplace
- [ ] Select an item
- [ ] Add delivery address
- [ ] Complete checkout
- [ ] Verify payment succeeded
- [ ] Check Firestore for order update

#### Test 4: Webhook Processing
- [ ] Make a test payment
- [ ] Wait for webhook event
- [ ] Check Firebase Functions logs:
  ```bash
  firebase functions:log --only stripeWebhook
  ```
- [ ] Verify Firestore updated correctly
- [ ] For 3-way split: verify courier received transfer

---

## 🔍 Monitoring & Verification

### Firebase Functions Logs

```bash
# Real-time logs for all Stripe functions
firebase functions:log --only createPaymentIntent,stripeConnect,marketplaceCheckout,stripeWebhook

# Check for errors
firebase functions:log | grep ERROR
```

### Stripe Dashboard Checks

1. **Payments**: Verify test payments appearing
2. **Webhooks**: Check webhook delivery status
3. **Connected Accounts**: Verify vendor/courier accounts
4. **Transfers**: Verify 3-way split transfers

### Firestore Checks

- [ ] Check `jobs` collection for new deliveries
- [ ] Check `marketplaceOrders` for payment status
- [ ] Check `users` for Stripe account IDs

---

## 🚨 Rollback Plan

If anything goes wrong:

### Quick Rollback (Revert Customer App)

```bash
cd apps/marketplace-app
git revert HEAD
pnpm build
firebase deploy --only hosting:gosenderr-customer
```

This reverts marketplace-app to use Next.js API routes. Old endpoints still work.

### Full Rollback (Delete Cloud Functions)

```bash
firebase functions:delete createPaymentIntent
firebase functions:delete stripeConnect
firebase functions:delete marketplaceCheckout
firebase functions:delete stripeWebhook
```

---

## 📊 Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Cloud Functions deployed | 4/4 | ⏳ Pending |
| Payment intent creation | Working | ⏳ Pending |
| Stripe Connect onboarding | Working | ⏳ Pending |
| Marketplace checkout | Working | ⏳ Pending |
| Webhook processing | Working | ⏳ Pending |
| Test payment completed | Success | ⏳ Pending |
| Zero production errors | ✅ | ⏳ Pending |

---

## 🔄 Migration Timeline

### Day 1: Deploy Functions (Today)
- [x] Create Cloud Functions
- [ ] Set environment variables
- [ ] Deploy to production
- [ ] Update Stripe webhook endpoint
- [ ] Test with Stripe test mode

### Day 2: Update Marketplace App
- [ ] Update PaymentForm component
- [ ] Update marketplace checkout
- [ ] Update vendor onboarding
- [ ] Deploy marketplace-app
- [ ] Test end-to-end flows

### Day 3: Monitor & Verify
- [ ] Monitor Firebase Functions logs
- [ ] Monitor Stripe Dashboard
- [ ] Check for any errors
- [ ] Verify all payments working
- [ ] Document any issues

### Day 4-5: Cleanup
- [ ] Delete Next.js API routes
- [ ] Update documentation
- [ ] Archive old code
- [ ] Celebrate 🎉

---

## 📝 Next Steps

1. **Set environment variables** (see Step 1)
2. **Deploy Cloud Functions** (see Step 1)
3. **Update Stripe webhook** (see Step 2)
4. **Update marketplace-app code** (see Step 3)
5. **Test thoroughly** (see Testing Checklist)
6. **Monitor for 48 hours**
7. **Delete old API routes**

---

## 🔗 Important Links

- [Firebase Console](https://console.firebase.com/project/gosenderr-6773f)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
- [Firebase Functions Logs](https://console.firebase.google.com/project/gosenderr-6773f/functions/logs)

---

**Ready to proceed?** Follow the deployment steps above carefully and test at each stage.

---

## 💡 Pro Tips

1. **Deploy during low-traffic hours** to minimize impact
2. **Test with Stripe test mode first** before live payments
3. **Keep Next.js app running** until 100% confident
4. **Monitor logs closely** for first 24-48 hours
5. **Have rollback plan ready** (see above)

---

**Status:** 🟢 Ready to Deploy  
**Risk Level:** 🟡 Medium (payment-critical feature)  
**Estimated Time:** 2-3 hours  
**Rollback Time:** <15 minutes

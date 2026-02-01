# Stripe Configuration Setup Guide

## Required Environment Variables

### 1. Firebase Functions (`firebase/functions/.env`)

Create or update `firebase/functions/.env`:

```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# App URL (for redirects)
APP_URL=http://localhost:5173  # Change to production URL in prod
```

### 2. Marketplace App (`apps/marketplace-app/.env.local`)

Create or update `apps/marketplace-app/.env.local`:

```bash
# Stripe Publishable Key (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY

# Optional: Force real Cloud Functions in development
# VITE_USE_REAL_FUNCTIONS=true
```

---

## Getting Your Stripe Keys

### Step 1: Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test mode** (toggle in top-right)
3. Copy your keys:
   - **Publishable key**: `pk_test_...` → Use in marketplace app `.env.local`
   - **Secret key**: `sk_test_...` → Use in functions `.env`

### Step 2: Enable Stripe Connect

1. Go to [Connect Settings](https://dashboard.stripe.com/test/settings/connect)
2. Click **Get Started** on Connect
3. Fill out basic business info (can use test data)
4. Enable **Express** accounts type

### Step 3: Configure Webhooks

1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL**:
   - Local testing: `http://127.0.0.1:5001/gosenderr-6773f/us-central1/marketplaceStripeWebhooks`
   - Production: `https://us-central1-gosenderr-6773f.cloudfunctions.net/marketplaceStripeWebhooks`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
   - `charge.dispute.closed`
5. **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`) → Use in functions `.env`

---

## Deployment Steps

### 1. Install Dependencies
```bash
cd firebase/functions
npm install
```

### 2. Configure Firebase Project
```bash
# Set the active project
firebase use gosenderr-6773f

# Verify functions are configured
firebase functions:config:get
```

### 3. Deploy Functions
```bash
# Deploy all Stripe functions
firebase deploy --only functions:marketplaceCreateConnectAccount,functions:marketplaceGetConnectOnboardingLink,functions:marketplaceGetConnectAccountStatus,functions:marketplaceCreatePaymentIntent,functions:marketplaceStripeWebhooks

# Or deploy all functions at once
firebase deploy --only functions
```

### 4. Test the Integration

#### Test Onboarding:
1. Open marketplace app: `http://localhost:5173`
2. Navigate to Profile → Seller Settings
3. Click "Set Up Stripe"
4. Complete onboarding flow

#### Test Checkout:
1. Browse marketplace items
2. Click "Buy Now" on any item
3. Use test card: `4242 4242 4242 4242`
   - Any future expiry (e.g., 12/25)
   - Any 3-digit CVC
   - Any ZIP code
4. Complete purchase

---

## Test Cards

| Card Number         | Scenario                  |
|---------------------|---------------------------|
| 4242 4242 4242 4242 | Success                   |
| 4000 0025 0000 3155 | Requires authentication   |
| 4000 0000 0000 9995 | Declined (insufficient funds) |

Full list: https://stripe.com/docs/testing

---

## Verification Checklist

- [ ] Stripe API keys added to `firebase/functions/.env`
- [ ] Publishable key added to `apps/marketplace-app/.env.local`
- [ ] Stripe Connect enabled in dashboard
- [ ] Webhook endpoint configured
- [ ] Functions deployed successfully
- [ ] Seller onboarding works (creates Connect account)
- [ ] Checkout creates payment intent
- [ ] Payment succeeds with test card
- [ ] Webhook receives `payment_intent.succeeded`
- [ ] Order status updates in Firestore

---

## Troubleshooting

### "STRIPE_SECRET_KEY not configured"
- Make sure `firebase/functions/.env` exists with `STRIPE_SECRET_KEY=sk_test_...`
- Restart the Firebase emulator after adding env vars

### "No signature" webhook error
- Verify webhook secret in `firebase/functions/.env`
- Make sure webhook endpoint URL matches deployed function

### Functions not deploying
```bash
# Check for TypeScript errors
cd firebase/functions
npm run build

# View logs
firebase functions:log
```

### Development mode stuck (using mocks)
- Set `VITE_USE_REAL_FUNCTIONS=true` in `apps/marketplace-app/.env.local`
- Restart the Vite dev server
- Check browser console for connection errors

---

## Production Deployment

### Update Environment Variables
1. Set production Stripe keys in Firebase Functions:
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_..."
   firebase functions:config:set stripe.webhook_secret="whsec_..."
   ```

2. Update `APP_URL` to production domain in functions config

3. Update marketplace app with production publishable key

### Switch to Live Mode
1. Toggle Stripe dashboard to **Live mode**
2. Get live API keys
3. Configure live webhook endpoint
4. Deploy functions with live keys

### Security Notes
- Never commit `.env` files to git
- Use Firebase Functions config for production secrets
- Verify webhook signatures in production
- Monitor Stripe Dashboard for disputes

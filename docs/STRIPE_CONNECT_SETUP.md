# Stripe Connect Marketplace Integration

This document explains the Stripe Connect integration for marketplace payments in GoSenderr.

## Overview

GoSenderr uses **Stripe Connect** to enable marketplace sellers to receive payments directly. When a customer purchases an item with delivery:

1. Customer pays: **Item Price + Delivery Fee + Platform Fee**
2. Seller receives: **Item Price - Stripe fees (~3%)**
3. Platform receives: **Delivery Fee + Platform Fee** (as application fee)
4. Courier receives: **Delivery Fee** (from platform)

## Setup Instructions

### 1. Stripe Account Configuration

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Connect** → **Settings**
3. Enable **Express** accounts (recommended for marketplace sellers)
4. Configure your branding and business information

### 2. Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Webhook signing secret
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your app URL
```

For production, use live mode keys (starting with `sk_live_`).

### 3. Webhook Configuration

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/connect/webhook`
4. Select events to listen for:
   - `account.updated`
   - `account.external_account.created`
   - `account.external_account.updated`
5. Copy the **Signing secret** and add it to `STRIPE_WEBHOOK_SECRET`

### 4. Test Mode

For development, use Stripe's test mode:
- Test account verification with [test data](https://stripe.com/docs/connect/testing)
- Use test card: `4242 4242 4242 4242`

## Seller Onboarding Flow

### Step 1: Create Stripe Connect Account

Sellers visit `/vendor/onboarding/stripe` to begin:

```typescript
// API: /api/stripe/connect/create-account
POST /api/stripe/connect/create-account
{
  "userId": "seller-user-id",
  "email": "seller@example.com"
}
```

This creates an Express Connect account and returns an `accountId`.

### Step 2: Complete Stripe Onboarding

The system generates an onboarding link:

```typescript
// API: /api/stripe/connect/create-onboarding-link
POST /api/stripe/connect/create-onboarding-link
{
  "accountId": "acct_xxxxx"
}
```

Stripe redirects seller to:
- `return_url`: `/vendor/onboarding/stripe?success=true` (after completion)
- `refresh_url`: `/vendor/onboarding/stripe?refresh=true` (if session expires)

### Step 3: Verify Account Status

The webhook receives `account.updated` events. Account status:
- **pending**: Onboarding not complete
- **active**: Ready to receive payments (`charges_enabled: true`)
- **restricted**: Additional information needed

## Payment Flow

### Creating Combined Payment Intent

When customer checks out:

```typescript
// API: /api/marketplace/create-combined-payment-intent
POST /api/marketplace/create-combined-payment-intent
{
  "jobId": "job-id",
  "itemId": "item-id",
  "itemPrice": 50.00,
  "deliveryFee": 10.00,
  "platformFee": 2.50,
  "sellerConnectAccountId": "acct_xxxxx",
  "sellerPayout": 48.50  // itemPrice * 0.97
}
```

This creates a PaymentIntent with:
- `amount`: Total customer charge (62.50)
- `application_fee_amount`: Platform keeps (12.50)
- `transfer_data.destination`: Seller's Connect account
- `transfer_data.amount`: Seller payout (48.50)
- `capture_method: 'manual'`: Hold payment until delivery confirmed

### Payment Capture

Payment is captured when:
1. Delivery is completed
2. Customer confirms receipt (or auto-confirms after 72 hours)
3. Firebase Cloud Function `capturePayment` triggers

The capture completes the transfer to the seller's Connect account.

## Database Schema

### UserDoc Updates

```typescript
{
  stripeConnectAccountId?: string;
  stripeConnectStatus?: 'pending' | 'active' | 'restricted';
  stripeConnectOnboardingComplete?: boolean;
}
```

### DeliveryJobDoc Updates

```typescript
{
  isMarketplaceOrder?: boolean;
  sellerReadyForPickup?: boolean;
  stripeTransferId?: string;
  pricing: {
    itemPrice?: number;
    deliveryFee?: number;
    sellerPayout?: number;
    platformApplicationFee?: number;
  }
}
```

## Seller Order Management

Sellers access `/vendor/orders` to:
1. View pending orders
2. Mark items as "Ready for Pickup"
3. Track delivery status
4. View order history

### Mark Ready for Pickup

```typescript
// Update Firestore
await updateDoc(doc(db, 'deliveryJobs', orderId), {
  sellerReadyForPickup: true,
  sellerReadyAt: serverTimestamp(),
});
```

This triggers a notification to the assigned courier.

## Testing

### Test Seller Onboarding

1. Create a seller account in your app
2. Visit `/vendor/onboarding/stripe`
3. Use Stripe test data:
   - SSN: `000-00-0000`
   - DOB: Any date (18+ years old)
   - Bank: Use routing `110000000` and any account number

### Test Payment Flow

1. Create a test item as seller
2. As customer, proceed to checkout
3. Use test card: `4242 4242 4242 4242`
4. Verify payment holds (not captured immediately)
5. Complete delivery and confirm
6. Check Stripe Dashboard for successful transfer

## Payout Timing

- **Instant**: Payment held when customer pays
- **On Delivery**: Payment captured when delivery confirmed
- **Seller Payout**: Automatic transfer to seller's bank (Stripe schedule)
- **Platform Fee**: Remains in platform account

Default Stripe payout schedule: **2-day rolling** for Express accounts.

## Error Handling

### Common Issues

1. **Seller Not Onboarded**
   - Error: "Seller has not set up payment processing"
   - Solution: Redirect seller to `/vendor/onboarding/stripe`

2. **Account Restricted**
   - Error: Account cannot receive payments
   - Solution: Seller must complete onboarding or provide additional info

3. **Transfer Failed**
   - Logged in webhook handler
   - Retry logic should be implemented in production

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **API Authentication**: Validate user permissions before creating accounts
3. **PCI Compliance**: Never handle raw card data (Stripe handles it)
4. **Account Ownership**: Verify seller owns the Connect account before transfers

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Configure live webhook endpoint
- [ ] Test with real bank account (small transfer)
- [ ] Enable automatic payout schedule
- [ ] Monitor Stripe Dashboard for failed transfers
- [ ] Set up error alerting
- [ ] Document refund/dispute process
- [ ] Train support team on Connect issues

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Connect Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Testing Connect](https://stripe.com/docs/connect/testing)
- [Webhooks Guide](https://stripe.com/docs/webhooks)

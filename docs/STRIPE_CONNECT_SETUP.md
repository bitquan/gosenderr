# Stripe Connect Setup Guide

## ⚠️ URGENT: Configuration Issue Detected

**STATUS:** ❌ **INCORRECT SETTINGS - MUST FIX BEFORE PRODUCTION**

Your Stripe Platform Profile makes **YOU liable for all vendor disputes and chargebacks**. This is extremely risky and expensive.

### What's Wrong (Based on Your Screenshot)

```
❌ Business model: "Buyers will purchase from you"
❌ Negative balance liability: "Your platform is responsible for losses"
❌ Monetization: "Your platform pays all Stripe fees"
```

**Impact:** Every vendor chargeback costs YOU $15-$1000+. A single fraudulent vendor could bankrupt the platform.

### Required Changes

Navigate to: `https://dashboard.stripe.com/settings/connect/platform-profile`

**1. Business Model** → Change to:

- ✅ **"Buyers will purchase from your users"**
- Makes vendors the merchant of record

**2. Negative Balance Liability** → Change to:

- ✅ **"Connected accounts are responsible"**
- Vendors pay their own chargebacks
- Platform protected from losses

**3. Monetization Strategy** → Recommended:

- ✅ **"Stripe fees are deducted from connected account payouts"**
- Vendors pay their own processing fees
- OR keep current if you want to subsidize fees

---

## Overview

GoSenderr uses **Stripe Connect Express** accounts for marketplace vendors with `destination` charges.

## Loss Liability Model

### Current Configuration

- **Type:** Destination charges
- **Liability:** Connected account (vendor) bears dispute/chargeback costs
- **Platform Protection:** Platform only loses application fee portion

### Payment Flow

```
Customer pays $25 total
├─ $15.00 → Vendor (Stripe Connect account)
├─ $ 7.50 → Platform (delivery fee - application_fee)
└─ $ 2.50 → Platform (platform fee - application_fee)
```

### In Case of Dispute

```
Chargeback for $25
├─ $15.00 → Debited from vendor's Stripe balance
├─ $ 7.50 → Debited from platform
└─ $ 2.50 → Debited from platform
```

## Platform Profile Configuration

Navigate to: `https://dashboard.stripe.com/settings/connect/platform-profile`

### Required Settings

**1. Business Profile**

- Business name: GoSenderr
- Business type: Marketplace/Platform
- Support email: support@gosenderr.com
- Support phone: (required)

**2. Loss Liability**

- ✅ **Connected account** (recommended for marketplaces)
- Platform assumes minimal risk
- Vendors manage their own disputes

**3. Payout Schedule**

- **Recommendation:** Daily automatic payouts
- Vendors receive funds 2 business days after sale
- Can customize per account if needed

**4. Refund Policy**

- Define vendor responsibility for refunds
- Add to vendor terms of service

## Implementation Checklist

### Backend Setup

- [x] Stripe Connect account creation (`/api/stripe/connect`)
- [x] Destination charges with application fees
- [x] Marketplace checkout session creation
- [ ] Webhook handling for disputes
- [ ] Webhook handling for payouts
- [ ] Refund API endpoints

### Frontend Setup

- [x] Vendor onboarding flow (`/vendor/onboarding/stripe`)
- [x] Save `stripeConnectAccountId` to user doc
- [x] Check for Stripe account before checkout
- [ ] Vendor dashboard showing payout history
- [ ] Dispute management UI

### Legal/Compliance

- [ ] Vendor terms of service (chargeback responsibility)
- [ ] Customer refund policy
- [ ] Marketplace agreement with vendors
- [ ] Privacy policy update (Stripe data handling)

## Webhook Events to Monitor

Add these endpoints to Stripe Dashboard:

### Critical Events

```
account.updated              - Track vendor account status
payment_intent.succeeded     - Confirm payment completion
charge.dispute.created       - Alert vendor of dispute
charge.refunded              - Track refunds
payout.paid                  - Confirm vendor payout
payout.failed                - Handle payout failures
```

### Implementation Example

```typescript
// apps/web/src/app/api/stripe/webhooks/route.ts
export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

  switch (event.type) {
    case "charge.dispute.created":
      // Notify vendor via email
      // Update order status to 'disputed'
      break;
    case "payout.paid":
      // Record payout in vendor dashboard
      break;
  }
}
```

## Vendor Requirements

Before vendors can receive payments:

1. **Complete Express Onboarding**
   - Business/individual details
   - Bank account information
   - Identity verification

2. **Stripe Account Capabilities**

   ```typescript
   capabilities: {
     card_payments: { requested: true },
     transfers: { requested: true }
   }
   ```

3. **Ongoing Compliance**
   - Maintain valid bank account
   - Respond to Stripe verification requests
   - Handle disputes within 7 days

## Testing

### Test Mode Connected Accounts

```bash
# Create test vendor account
curl https://www.gosenderr.com/api/stripe/connect \\
  -d '{"refreshUrl": "...", "returnUrl": "..."}'
```

### Test Cards

- Success: `4242 4242 4242 4242`
- Dispute: `4000 0000 0000 0259`
- Declined: `4000 0000 0000 0002`

## Production Checklist

Before going live:

### 🚨 CRITICAL - Must Fix First

- [ ] **Change platform profile settings:**
  - [ ] Business model → "Buyers will purchase from your users"
  - [ ] Negative balance liability → "Connected accounts are responsible"
  - [ ] Monetization → "Fees deducted from connected account" (recommended)
- [ ] **Verify changes saved** - Check dashboard shows correct `losses.payments: stripe`
- [ ] **Test with chargeback test card** - Confirm vendor account debited, not platform

### Standard Checklist

- [ ] Add webhook endpoints (live mode)
- [ ] Test full payment flow end-to-end
- [ ] Document vendor chargeback process (in terms of service)
- [ ] Set up dispute notification emails
- [ ] Configure payout schedule
- [ ] Add Stripe dashboard access for support team
- [ ] Legal review of marketplace agreements

## Support Resources

- Stripe Connect Docs: https://stripe.com/docs/connect
- Loss Liability Guide: https://stripe.com/docs/connect/charges#application-fee-compatibility
- Disputes: https://stripe.com/docs/disputes

# Stripe Payment Integration

This document describes the Stripe payment integration for GoSenderr delivery platform.

## Overview

The payment system uses Stripe's pre-authorization (hold) flow:
1. **Pre-authorize**: When customer confirms order, funds are held but not charged
2. **Deliver**: Courier delivers the item
3. **Confirm**: Customer confirms receipt
4. **Capture**: Payment is captured and transferred to courier
5. **Cancel**: If cancelled before delivery, pre-authorization is released (automatic refund)

## Architecture

### Components

#### 1. Payment Intent API Route
**Location**: `apps/web/src/app/api/create-payment-intent/route.ts`

Creates a Stripe PaymentIntent with `capture_method: 'manual'` to pre-authorize payment.

**Endpoint**: `POST /api/create-payment-intent`

**Request Body**:
```json
{
  "jobId": "string",
  "courierRate": number,
  "platformFee": number
}
```

**Response**:
```json
{
  "clientSecret": "string"
}
```

#### 2. PaymentForm Component
**Location**: `apps/web/src/components/v2/PaymentForm.tsx`

Client-side React component that:
- Loads Stripe.js
- Fetches PaymentIntent client secret
- Renders Stripe Elements (PaymentElement)
- Handles payment confirmation
- Triggers success callback

**Props**:
- `jobId`: string - Delivery job ID
- `courierRate`: number - Courier's rate
- `platformFee`: number - Platform service fee
- `onSuccess`: () => void - Callback after successful payment

#### 3. Payment Page
**Location**: `apps/web/src/app/customer/payment/page.tsx`

Full payment checkout page that:
- Displays order summary
- Shows pricing breakdown
- Embeds PaymentForm component
- Creates delivery job in Firestore after payment
- Updates item status to 'pending'
- Navigates to job tracking page

#### 4. Firebase Cloud Functions

##### Capture Payment Function
**Location**: `firebase/functions/src/triggers/capturePayment.ts`

Automatically captures payment when:
- `customerConfirmation.received` changes to `true`
- `paymentStatus` is `'authorized'`

Updates:
- `paymentStatus` → `'captured'`
- `paymentDetails.capturedAt` → timestamp
- `paymentDetails.captureAmount` → amount captured

##### Refund Payment Function
**Location**: `firebase/functions/src/triggers/refundPayment.ts`

Automatically cancels payment intent when:
- `status` changes to `'cancelled'`
- `paymentStatus` is `'authorized'`

Updates:
- `paymentStatus` → `'refunded'`
- `paymentDetails.refundedAt` → timestamp
- `paymentDetails.refundReason` → "Job cancelled before delivery"

## Environment Variables

### Web App (.env.local)
```bash
# Stripe Secret Key (Server-side only)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Publishable Key (Client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Firebase Functions (.env)
```bash
# Stripe Secret Key (Server-side only)
STRIPE_SECRET_KEY=sk_test_...
```

## Payment Flow

### Customer Journey

1. **Browse Marketplace** → Select item
2. **Choose Courier** → Select delivery courier and rate
3. **Payment Page** → Review order and enter payment details
4. **Pre-authorize** → Card is pre-authorized (not charged)
5. **Job Created** → Delivery job created in Firestore
6. **Track Delivery** → Follow courier's progress
7. **Confirm Receipt** → Customer confirms delivery
8. **Payment Captured** → Funds are captured automatically

### Cancellation Scenarios

#### Before Pickup
- Customer or courier cancels
- PaymentIntent is cancelled via Cloud Function
- Pre-authorization is released (no charge)

#### After Pickup (Before Delivery)
- Requires manual handling/dispute resolution
- Payment may still be in authorized state

## Payment Statuses

- `pending`: Payment initiated but not authorized yet
- `authorized`: Payment pre-authorized (funds held)
- `captured`: Payment captured (charged)
- `refunded`: Payment refunded (cancelled pre-auth)
- `capture_failed`: Payment capture failed (requires intervention)
- `refund_failed`: Refund/cancellation failed (requires intervention)

## Firestore Schema

### DeliveryJob Document
```typescript
{
  customerId: string,
  courierId: string,
  itemId: string,
  status: JobStatus,
  paymentStatus: PaymentStatus,
  stripePaymentIntentId: string,
  pricing: {
    courierRate: number,
    platformFee: number,
    totalAmount: number
  },
  paymentDetails?: {
    capturedAt?: Timestamp,
    captureAmount?: number,
    captureError?: string,
    refundedAt?: Timestamp,
    refundReason?: string,
    refundError?: string
  },
  customerConfirmation?: {
    received: boolean,
    timestamp?: Timestamp
  },
  // ... other fields
}
```

## Testing

### Test Cards

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Exp: Any future date
- CVC: Any 3 digits

**Payment Fails**:
- Card: `4000 0000 0000 0002`

**3D Secure Authentication**:
- Card: `4000 0025 0000 3155`

### Test Scenarios

1. **Successful Order**:
   - Complete payment with test card
   - Verify job created in Firestore
   - Simulate delivery confirmation
   - Verify payment captured

2. **Cancelled Order**:
   - Complete payment with test card
   - Cancel job before delivery
   - Verify payment intent cancelled
   - Verify status changed to 'refunded'

3. **Failed Payment**:
   - Use failing test card
   - Verify error message displayed
   - Verify no job created

## Security Considerations

1. **API Route Protection**:
   - Runs server-side (secure)
   - Never exposes secret key to client
   - Validates all input parameters
   - Checks for negative amounts

2. **Authentication**:
   - Payment page checks user authentication
   - Only authenticated users can make payments
   - User ID stored with payment metadata

3. **Amount Validation**:
   - Server calculates total amount
   - Client cannot manipulate payment amount
   - Amount stored in PaymentIntent metadata

4. **Idempotency**:
   - Each PaymentIntent has unique ID
   - Safe to retry API calls
   - Prevents duplicate charges

## Error Handling

### Client-Side Errors
- Network failures: Retry mechanism
- Invalid card: Display Stripe error message
- Authentication required: Show 3D Secure modal

### Server-Side Errors
- Missing environment variables: Throws error at initialization
- Invalid Stripe key: Caught and returned as 500 error
- Firestore write failures: Caught and displayed to user

### Cloud Function Errors
- Capture failures: Updates `paymentStatus` to `capture_failed`
- Refund failures: Updates `paymentStatus` to `refund_failed`
- All errors logged to Firebase Functions logs

## Monitoring and Debugging

### Stripe Dashboard
- View all payments, refunds, and disputes
- Monitor payment intent status
- Check webhook events
- Access detailed logs

### Firebase Functions Logs
```bash
firebase functions:log
```

### Next.js API Logs
Check Vercel deployment logs or local server output

## Future Enhancements

1. **Webhooks**: Add Stripe webhook handlers for asynchronous events
2. **Payouts**: Implement automated payouts to couriers
3. **Disputes**: Handle payment disputes and chargebacks
4. **Receipts**: Generate and email payment receipts
5. **Multi-currency**: Support multiple currencies
6. **Subscription**: Add subscription plans for frequent users
7. **Refunds**: Partial refunds for incomplete deliveries

## Troubleshooting

### "Neither apiKey nor config.authenticator provided"
- Ensure `STRIPE_SECRET_KEY` environment variable is set
- Check that environment variable is available at runtime

### "Payment intent capture failed"
- Check Stripe dashboard for specific error
- Verify payment intent is in 'requires_capture' state
- Ensure sufficient funds in test account

### "Payment page shows loading spinner forever"
- Check browser console for errors
- Verify Firebase configuration
- Ensure Stripe publishable key is correct

### "Cloud function not triggering"
- Check Firebase Functions logs
- Verify function is deployed
- Ensure Firestore trigger path matches document structure

## API Versions

- **Stripe API**: 2023-10-16 (Functions), 2025-12-15.clover (Web)
- **Stripe Node.js**: v14.0.0+ (Functions), v20.2.0 (Web)
- **@stripe/stripe-js**: v8.6.3
- **@stripe/react-stripe-js**: v5.4.1

## Support

For issues or questions:
1. Check Stripe documentation: https://stripe.com/docs
2. Review Firebase Functions logs
3. Check browser console for client errors
4. Refer to this documentation for architecture details

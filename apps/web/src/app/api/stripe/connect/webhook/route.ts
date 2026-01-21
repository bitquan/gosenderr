import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);
        
        // Update user's Stripe Connect status in Firestore
        // Note: In production, you would:
        // 1. Get userId from account.metadata
        // 2. Update Firestore user document with:
        //    - stripeConnectStatus based on account.charges_enabled and account.details_submitted
        //    - stripeConnectOnboardingComplete based on account.details_submitted
        
        const status = account.charges_enabled ? 'active' : 
                      account.details_submitted ? 'restricted' : 'pending';
        
        console.log(`Account ${account.id} status: ${status}`);
        console.log(`Details submitted: ${account.details_submitted}`);
        console.log(`Charges enabled: ${account.charges_enabled}`);
        console.log(`Payouts enabled: ${account.payouts_enabled}`);
        
        break;

      case 'account.external_account.created':
      case 'account.external_account.updated':
        console.log('Account external account event:', event.type);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { 
      jobId, 
      itemId,
      itemPrice, 
      deliveryFee, 
      platformFee, 
      sellerConnectAccountId,
      sellerPayout 
    } = body;

    // Validate inputs
    if (!jobId || !itemId || !sellerConnectAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, itemId, sellerConnectAccountId' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (
      typeof itemPrice !== 'number' || 
      typeof deliveryFee !== 'number' || 
      typeof platformFee !== 'number' ||
      typeof sellerPayout !== 'number'
    ) {
      return NextResponse.json(
        { error: 'itemPrice, deliveryFee, platformFee, and sellerPayout must be numbers' },
        { status: 400 }
      );
    }

    if (itemPrice < 0 || deliveryFee < 0 || platformFee < 0 || sellerPayout < 0) {
      return NextResponse.json(
        { error: 'All amounts must be non-negative' },
        { status: 400 }
      );
    }

    // Calculate total amount in cents
    // Customer pays: item price + delivery fee + platform fee
    const totalAmount = Math.round((itemPrice + deliveryFee + platformFee) * 100);
    const applicationFeeAmount = Math.round((deliveryFee + platformFee) * 100);
    const sellerPayoutAmount = Math.round(sellerPayout * 100);

    // Verify math: seller should receive item price (or close to it after Stripe fees)
    // Platform keeps delivery fee + platform fee as application fee
    
    // Create payment intent with Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      capture_method: 'manual',
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: sellerConnectAccountId,
        amount: sellerPayoutAmount, // Amount to transfer to seller (typically itemPrice minus Stripe fees)
      },
      metadata: {
        jobId,
        itemId,
        itemPrice: itemPrice.toString(),
        deliveryFee: deliveryFee.toString(),
        platformFee: platformFee.toString(),
        sellerPayout: sellerPayout.toString(),
        isMarketplaceOrder: 'true',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating marketplace payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

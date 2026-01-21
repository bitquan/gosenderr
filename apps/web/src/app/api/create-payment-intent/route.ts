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
    const { jobId, courierRate, platformFee } = body;

    // Validate inputs
    if (!jobId || courierRate === undefined || platformFee === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, courierRate, platformFee' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (typeof courierRate !== 'number' || typeof platformFee !== 'number') {
      return NextResponse.json(
        { error: 'courierRate and platformFee must be numbers' },
        { status: 400 }
      );
    }

    if (courierRate < 0 || platformFee < 0) {
      return NextResponse.json(
        { error: 'courierRate and platformFee must be non-negative' },
        { status: 400 }
      );
    }

    // Calculate total amount in cents
    const totalAmount = Math.round((courierRate + platformFee) * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      capture_method: 'manual',
      metadata: {
        jobId,
        courierRate: courierRate.toString(),
        platformFee: platformFee.toString(),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

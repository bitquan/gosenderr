import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const {
      itemTitle,
      itemPrice,
      deliveryFee,
      platformFee,
      sellerStripeAccountId,
      courierStripeAccountId,
      successUrl,
      cancelUrl,
    } = body || {};

    if (
      !itemTitle ||
      itemPrice === undefined ||
      deliveryFee === undefined ||
      platformFee === undefined ||
      !sellerStripeAccountId ||
      !successUrl ||
      !cancelUrl
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: itemTitle, itemPrice, deliveryFee, platformFee, sellerStripeAccountId, successUrl, cancelUrl",
        },
        { status: 400 },
      );
    }

    const total = Number(itemPrice) + Number(deliveryFee) + Number(platformFee);

    // If courier has Stripe account, we'll do 3-way split
    // Otherwise, platform collects delivery fee and must pay courier manually
    const hasCourierStripe =
      courierStripeAccountId && courierStripeAccountId.startsWith("acct_");

    if (hasCourierStripe) {
      // 3-WAY SPLIT: Customer → Vendor + Courier + Platform
      // We use on_behalf_of for the vendor as primary destination
      // Then create a separate transfer to courier after payment succeeds
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: itemTitle,
              },
              unit_amount: Math.round(Number(itemPrice) * 100),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Delivery by Senderr",
              },
              unit_amount: Math.round(Number(deliveryFee) * 100),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Platform Fee",
              },
              unit_amount: Math.round(Number(platformFee) * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          // Platform keeps platformFee as application fee
          application_fee_amount: Math.round(Number(platformFee) * 100),
          // Send item price to vendor
          transfer_data: {
            destination: sellerStripeAccountId,
          },
          // Store courier info in metadata for webhook to process
          metadata: {
            courierStripeAccountId: courierStripeAccountId,
            deliveryFee: deliveryFee.toString(),
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          itemTitle,
          total: total.toFixed(2),
          hasCourierStripe: "true",
          courierStripeAccountId: courierStripeAccountId,
          deliveryFee: deliveryFee.toString(),
        },
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    } else {
      // 2-WAY SPLIT: No courier Stripe account
      // Platform collects delivery fee, must pay courier manually
      const applicationFeeAmount = Math.round(
        (Number(deliveryFee) + Number(platformFee)) * 100,
      );

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: itemTitle,
              },
              unit_amount: Math.round(Number(itemPrice) * 100),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Delivery (Manual Payout)",
              },
              unit_amount: Math.round(Number(deliveryFee) * 100),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Platform Fee",
              },
              unit_amount: Math.round(Number(platformFee) * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: sellerStripeAccountId,
          },
          metadata: {
            hasCourierStripe: "false",
            deliveryFee: deliveryFee.toString(),
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          itemTitle,
          total: total.toFixed(2),
          hasCourierStripe: "false",
        },
      });

      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
        warning: "Courier payout will be manual - no Stripe account connected",
      });
    }
  } catch (error: any) {
    console.error("Error creating marketplace checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}

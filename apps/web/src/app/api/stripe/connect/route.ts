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
    const { accountId, refreshUrl, returnUrl } = body || {};

    if (!refreshUrl || !returnUrl) {
      return NextResponse.json(
        { error: "Missing required fields: refreshUrl, returnUrl" },
        { status: 400 },
      );
    }

    const account = accountId
      ? await stripe.accounts.retrieve(accountId)
      : await stripe.accounts.create({
          type: "express",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ accountId: account.id, url: link.url });
  } catch (error: any) {
    console.error("Error creating Stripe connect link:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create connect link" },
      { status: 500 },
    );
  }
}

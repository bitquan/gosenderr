import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

// Initialize Firebase Functions
const functions = getFunctions();

// Type definitions for Cloud Functions
export interface CreatePaymentIntentData {
  jobId: string;
  courierRate: number;
  platformFee: number;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface StripeConnectData {
  accountId?: string | null;
  refreshUrl: string;
  returnUrl: string;
}

export interface StripeConnectResponse {
  accountId: string;
  url: string;
}

export interface MarketplaceCheckoutData {
  itemTitle: string;
  itemPrice: number;
  deliveryFee: number;
  platformFee: number;
  sellerStripeAccountId: string;
  courierStripeAccountId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface MarketplaceCheckoutResponse {
  url: string | null;
  sessionId: string;
}

// Cloud Function wrappers
export async function createPaymentIntent(
  data: CreatePaymentIntentData
): Promise<CreatePaymentIntentResponse> {
  const callable = httpsCallable<CreatePaymentIntentData, CreatePaymentIntentResponse>(
    functions,
    'createPaymentIntent'
  );
  const result = await callable(data);
  return result.data;
}

export async function connectStripeAccount(
  data: StripeConnectData
): Promise<StripeConnectResponse> {
  const callable = httpsCallable<StripeConnectData, StripeConnectResponse>(
    functions,
    'stripeConnect'
  );
  const result = await callable(data);
  return result.data;
}

export async function createMarketplaceCheckout(
  data: MarketplaceCheckoutData
): Promise<MarketplaceCheckoutResponse> {
  const callable = httpsCallable<MarketplaceCheckoutData, MarketplaceCheckoutResponse>(
    functions,
    'marketplaceCheckout'
  );
  const result = await callable(data);
  return result.data;
}

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Types
interface CreatePaymentIntentData {
  jobId: string;
  courierRate: number;
  platformFee: number;
}

interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

interface StripeConnectData {
  accountId?: string | null;
  refreshUrl: string;
  returnUrl: string;
}

interface StripeConnectResult {
  accountId: string;
  url: string;
}

// Cloud Function references
const createPaymentIntentFn = httpsCallable<CreatePaymentIntentData, CreatePaymentIntentResult>(
  functions,
  'createPaymentIntent'
);

const stripeConnectFn = httpsCallable<StripeConnectData, StripeConnectResult>(
  functions,
  'stripeConnect'
);

/**
 * Create a Stripe payment intent for a job
 */
export async function createPaymentIntent(data: CreatePaymentIntentData): Promise<CreatePaymentIntentResult> {
  try {
    const result = await createPaymentIntentFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new Error(error.message || 'Failed to create payment intent');
  }
}

/**
 * Create or retrieve Stripe Connect account link
 */
export async function createStripeConnectLink(data: StripeConnectData): Promise<StripeConnectResult> {
  try {
    const result = await stripeConnectFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error creating Stripe Connect link:', error);
    throw new Error(error.message || 'Failed to create Stripe Connect link');
  }
}

import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';

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

function resolveCreatePaymentIntentUrl(): string {
  const explicitUrl = import.meta.env.VITE_CREATE_PAYMENT_INTENT_URL || '';
  if (explicitUrl) return explicitUrl;

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
  if (!projectId) return '';

  return `https://us-central1-${projectId}.cloudfunctions.net/createPaymentIntentHttp`;
}

const stripeConnectFn = httpsCallable<StripeConnectData, StripeConnectResult>(
  functions,
  'stripeConnect'
);

/**
 * Create a Stripe payment intent for a job
 */
export async function createPaymentIntent(data: CreatePaymentIntentData): Promise<CreatePaymentIntentResult> {
  const httpUrl = resolveCreatePaymentIntentUrl();

  try {
    if (httpUrl) {
      const currentUser = auth?.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';
      if (!idToken) {
        throw new Error('User must be authenticated to create payment intent');
      }

      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed with status ${response.status}`);
      }

      return (await response.json()) as CreatePaymentIntentResult;
    }
  } catch (error: any) {
    console.error('Error creating payment intent via HTTP:', error);
  }

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

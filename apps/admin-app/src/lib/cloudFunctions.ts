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

// --- Admin-only callable helpers ---

interface CreateUserRequest {
  email: string
  password: string
  displayName?: string
  role: 'courier' | 'admin' | 'customer' | 'vendor' | 'package_runner'
}

interface CreateUserResult {
  success: boolean
  uid?: string
}

interface RunTestFlowRequest {
  targetUserId: string
  steps?: string[]
  cleanup?: boolean
}

interface RunTestFlowResult {
  success: boolean
  runLogId?: string
}

const createUserForAdminFn = httpsCallable<CreateUserRequest, CreateUserResult>(functions, 'createUserForAdmin')
const runTestFlowFn = httpsCallable<RunTestFlowRequest, RunTestFlowResult>(functions, 'runTestFlow')

export async function createUserForAdmin(data: CreateUserRequest): Promise<CreateUserResult> {
  try {
    const res = await createUserForAdminFn(data)
    return res.data
  } catch (error: any) {
    console.error('createUserForAdmin error', error)
    throw new Error(error.message || 'Failed to create user')
  }
}

export async function runTestFlow(data: RunTestFlowRequest): Promise<RunTestFlowResult> {
  try {
    const res = await runTestFlowFn(data)
    return res.data
  } catch (error: any) {
    console.error('runTestFlow error', error)
    throw new Error(error.message || 'Failed to run test flow')
  }
}

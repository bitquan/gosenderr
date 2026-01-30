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
const diagnoseCreateUserCallFn = httpsCallable<Record<string, unknown>, any>(functions, 'diagnoseCreateUserCall')
const runTestFlowFn = httpsCallable<RunTestFlowRequest, RunTestFlowResult>(functions, 'runTestFlow')

// Simulate Firestore rules for a given path under the emulator (admin-only)
interface SimulateRuleRequest {
  op: 'get' | 'list' | 'set' | 'update' | 'delete'
  path: string
  payload?: any
  auth?: { uid?: string; claims?: Record<string, any> }
}

interface SimulateRuleResult {
  allowed: boolean
  status: number
  body?: any
}

const simulateRuleFn = httpsCallable<SimulateRuleRequest, SimulateRuleResult>(functions, 'simulateRule')

interface RunSystemSimulationRequest {
  intensity?: number
  cleanup?: boolean
}
interface RunSystemSimulationResult {
  success: boolean
  runLogId?: string
  created?: any
}
const runSystemSimulationFn = httpsCallable<RunSystemSimulationRequest, RunSystemSimulationResult>(functions, 'runSystemSimulation')

export async function simulateRule(data: SimulateRuleRequest): Promise<SimulateRuleResult> {
  try {
    const res = await simulateRuleFn(data)
    return res.data
  } catch (error: any) {
    console.error('simulateRule error', error)
    throw new Error(error.message || 'Failed to simulate rule')
  }
}

export async function runSystemSimulation(data: RunSystemSimulationRequest): Promise<RunSystemSimulationResult> {
  try {
    const res = await runSystemSimulationFn(data)
    return res.data
  } catch (error: any) {
    console.error('runSystemSimulation error', error)
    throw new Error(error.message || 'Failed to run system simulation')
  }
}
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

/**
 * Emulator-only diagnostic call to inspect auth + caller user doc
 */
export async function diagnoseCreateUserCall(): Promise<any> {
  try {
    const res = await diagnoseCreateUserCallFn({})
    return res.data
  } catch (error: any) {
    console.error('diagnoseCreateUserCall error', error)
    throw new Error(error.message || 'Failed diagnostic')
  }
}

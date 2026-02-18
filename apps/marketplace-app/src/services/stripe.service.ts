/**
 * Stripe Service
 * Handles Stripe Connect onboarding and payment processing
 * 
 * Development Mode:
 * - Uses mock responses when Cloud Functions aren't deployed
 * - Set VITE_USE_REAL_FUNCTIONS=true to force real function calls
 * 
 * Production Mode:
 * - Always uses real Cloud Functions
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/lib/firebase';

// Development mode flag
const USE_MOCK_FUNCTIONS = import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_FUNCTIONS;
const USING_EMULATORS = Boolean(
  import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ||
  import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ||
  import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST
);

const buildMockPaymentIntent = (request: CreatePaymentIntentRequest): CreatePaymentIntentResponse => {
  const mockItemPrice = 29.99;
  const amount = (mockItemPrice * request.quantity) + request.deliveryFee;
  const platformFee = amount * 0.029;
  const sellerAmount = amount - platformFee;

  return {
    clientSecret: `pi_mock_secret_${Date.now()}`,
    paymentIntentId: `pi_mock_${Date.now()}`,
    amount,
    platformFee,
    sellerAmount
  };
};

const buildMockConnectAccount = (): CreateConnectAccountResponse => ({
  accountId: `acct_mock_${Date.now()}`,
  onboardingUrl: window.location.origin + '/profile/seller-settings?mock_onboarding=complete'
});

export interface CreateConnectAccountResponse {
  accountId: string;
  onboardingUrl: string;
}

export interface ConnectAccountStatusResponse {
  accountId: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export interface CreatePaymentIntentRequest {
  itemId: string;
  quantity: number;
  deliveryOption: 'courier' | 'pickup' | 'shipping';
  deliveryFee: number;
  deliveryAddressId?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  platformFee: number;
  sellerAmount: number;
}

export class StripeService {
  
  /**
   * Create Stripe Connect account for seller
   * Returns onboarding URL to complete setup
   */
  async createConnectAccount(): Promise<CreateConnectAccountResponse> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in');
    }
    
    if (USE_MOCK_FUNCTIONS) {
      console.log('🧪 DEV MODE: Using mock Stripe Connect account creation');
      await new Promise(resolve => setTimeout(resolve, 500));
      return buildMockConnectAccount();
    }
    
    try {
      const createAccountFn = httpsCallable<void, CreateConnectAccountResponse>(
        functions,
        'marketplaceCreateConnectAccount'
      );
      const result = await createAccountFn();
      return result.data;
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
      if (import.meta.env.DEV) {
        console.warn('🧪 Falling back to mock connect account in dev');
        await new Promise(resolve => setTimeout(resolve, 300));
        return buildMockConnectAccount();
      }
      throw new Error(error.message || 'Failed to create Stripe account');
    }
  }
  
  /**
   * Get Connect account onboarding link (if incomplete)
   */
  async getConnectAccountOnboardingLink(): Promise<{ url: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in');
    }
    
    if (USE_MOCK_FUNCTIONS) {
      console.log('🧪 DEV MODE: Using mock onboarding link');
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        url: window.location.origin + '/profile/seller-settings?mock_onboarding=complete'
      };
    }
    
    try {
      const getOnboardingLinkFn = httpsCallable<void, { url: string }>(
        functions,
        'marketplaceGetConnectOnboardingLink'
      );
      const result = await getOnboardingLinkFn();
      return result.data;
    } catch (error: any) {
      console.error('Error getting onboarding link:', error);
      if (import.meta.env.DEV) {
        console.warn('🧪 Falling back to mock onboarding link in dev');
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          url: window.location.origin + '/profile/seller-settings?mock_onboarding=complete'
        };
      }
      throw new Error(error.message || 'Failed to get onboarding link');
    }
  }
  
  /**
   * Get Connect account status
   */
  async getConnectAccountStatus(): Promise<ConnectAccountStatusResponse> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in');
    }
    
    if (USE_MOCK_FUNCTIONS) {
      console.log('🧪 DEV MODE: Mock account status (complete)');
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        accountId: 'acct_mock_dev',
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: []
        }
      };
    }
    
    try {
      const getStatusFn = httpsCallable<void, ConnectAccountStatusResponse>(
        functions,
        'marketplaceGetConnectAccountStatus'
      );
      const result = await getStatusFn();
      return result.data;
    } catch (error: any) {
      console.error('Error getting Connect status:', error);
      if (import.meta.env.DEV) {
        console.warn('🧪 Falling back to mock connect status in dev');
        return {
          accountId: 'acct_mock_dev',
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          requirements: {
            currently_due: [],
            eventually_due: [],
            past_due: []
          }
        };
      }
      throw new Error(error.message || 'Failed to get account status');
    }
  }
  
  /**
   * Create payment intent for marketplace purchase
   * Uses Stripe Connect destination charges
   */
  async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in');
    }
    
    if (USE_MOCK_FUNCTIONS || USING_EMULATORS) {
      console.log('🧪 DEV MODE: Mock payment intent (checkout will not process real payment)');
      console.warn('⚠️ To enable real Stripe checkout, deploy Cloud Functions and set VITE_USE_REAL_FUNCTIONS=true');
      await new Promise(resolve => setTimeout(resolve, 800));
      return buildMockPaymentIntent(request);
    }
    
    try {
      const createIntentFn = httpsCallable<
        CreatePaymentIntentRequest,
        CreatePaymentIntentResponse
      >(
        functions,
        'marketplaceCreatePaymentIntent'
      );
      const result = await createIntentFn(request);
      return result.data;
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      if (import.meta.env.DEV && String(error?.message || '').includes('No such destination')) {
        console.warn('🧪 Falling back to mock payment intent in dev');
        await new Promise(resolve => setTimeout(resolve, 400));
        return buildMockPaymentIntent(request);
      }
      throw new Error(error.message || 'Failed to create payment intent');
    }
  }
  
  /**
   * Confirm order and capture payment
   */
  async confirmOrder(orderId: string): Promise<{ success: boolean }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in');
    }
    
    try {
      const confirmOrderFn = httpsCallable<
        { orderId: string },
        { success: boolean }
      >(
        functions,
        'stripe-confirmOrder'
      );
      const result = await confirmOrderFn({ orderId });
      return result.data;
    } catch (error: any) {
      console.error('Error confirming order:', error);
      throw new Error(error.message || 'Failed to confirm order');
    }
  }
}

export const stripeService = new StripeService();

/**
 * Stripe Service - Development Stubs
 * These are temporary mock implementations for local development.
 * Replace with real Cloud Functions when deploying to production.
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/lib/firebase';

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

// Development mode flag
const USE_MOCK_FUNCTIONS = import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_FUNCTIONS;

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
      // Mock response for development
      console.log('🧪 Using mock Stripe Connect account creation');
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        accountId: `acct_mock_${Date.now()}`,
        onboardingUrl: 'https://connect.stripe.com/express/oauth/authorize?mock=true'
      };
    }
    
    try {
      const createAccountFn = httpsCallable<void, CreateConnectAccountResponse>(
        functions,
        'stripe-createConnectAccount'
      );
      const result = await createAccountFn();
      return result.data;
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
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
      console.log('🧪 Using mock onboarding link');
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        url: 'https://connect.stripe.com/express/oauth/authorize?mock=true'
      };
    }
    
    try {
      const getOnboardingLinkFn = httpsCallable<void, { url: string }>(
        functions,
        'stripe-getConnectOnboardingLink'
      );
      const result = await getOnboardingLinkFn();
      return result.data;
    } catch (error: any) {
      console.error('Error getting onboarding link:', error);
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
      console.log('🧪 Using mock account status (returning as complete for dev)');
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        accountId: 'acct_mock_123',
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
        'stripe-getConnectAccountStatus'
      );
      const result = await getStatusFn();
      return result.data;
    } catch (error: any) {
      console.error('Error getting Connect status:', error);
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
    
    if (USE_MOCK_FUNCTIONS) {
      console.log('🧪 Using mock payment intent');
      await new Promise(resolve => setTimeout(resolve, 800));
      return buildMockPaymentIntent(request);
    }
    
    try {
      const createIntentFn = httpsCallable<
        CreatePaymentIntentRequest,
        CreatePaymentIntentResponse
      >(
        functions,
        'stripe-createPaymentIntent'
      );
      const result = await createIntentFn(request);
      return result.data;
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      if (import.meta.env.DEV && String(error?.message || '').includes('Seller has not set up payments')) {
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
    
    if (USE_MOCK_FUNCTIONS) {
      console.log('🧪 Using mock order confirmation');
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
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

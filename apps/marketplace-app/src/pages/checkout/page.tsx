/**
 * Marketplace Checkout Page
 * Complete checkout flow with Stripe payment
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { marketplaceService } from '@/services/marketplace.service';
import { stripeService } from '@/services/stripe.service';
import { useAuth } from '@/hooks/useAuth';
import { DeliveryOption } from '@/types/marketplace';
import type { MarketplaceItem, Address } from '@/types/marketplace';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemId) {
      loadItem();
    } else {
      setError('No item specified');
      setLoading(false);
    }
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const itemData = await marketplaceService.getItem(itemId!);
      setItem(itemData);
    } catch (err: any) {
      setError(err.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-800">{error || 'Item not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Checkout Form */}
        <div className="lg:col-span-2">
          <CheckoutForm item={item} />
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary item={item} />
        </div>
      </div>
    </div>
  );
}

function OrderSummary({ item }: { item: MarketplaceItem }) {
  const deliveryFee = 5.99;
  const total = item.price + deliveryFee;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
      
      {/* Item */}
      <div className="flex gap-4 mb-6 pb-6 border-b">
        <img
          src={item.photos[0]}
          alt={item.title}
          className="w-20 h-20 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">by {item.sellerName}</p>
          <p className="text-sm text-gray-600 mt-1">Condition: {item.condition}</p>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-700">
          <span>Item price</span>
          <span className="font-medium">${item.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Delivery fee</span>
          <span className="font-medium">${deliveryFee.toFixed(2)}</span>
        </div>
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center text-green-800 mb-2">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Buyer Protection</span>
        </div>
        <p className="text-sm text-green-700">
          Your payment is held securely for 3 days. If the item doesn't arrive as described, you can request a full refund.
        </p>
      </div>
    </div>
  );
}

function CheckoutForm({ item }: { item: MarketplaceItem }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'delivery' | 'payment'>('delivery');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>(
    item.deliveryOptions[0] || DeliveryOption.SHIPPING
  );
  const [deliveryAddress, setDeliveryAddress] = useState<Partial<Address>>({
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create payment intent
      const result = await stripeService.createPaymentIntent({
        itemId: item.id,
        quantity: 1,
        deliveryOption: deliveryOption as any,
        deliveryFee: deliveryOption === 'pickup' ? 0 : 5.99,
        deliveryAddressId: undefined
      });

      setClientSecret(result.clientSecret);
      setStep('payment');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'delivery') {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Information</h2>
        
        {/* Development Mode Warning */}
        {import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_FUNCTIONS && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Development Mode</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  Payment processing is currently unavailable. Deploy Cloud Functions to enable real checkout.
                  See <code className="bg-yellow-100 px-1 rounded">CHECKOUT_IMPLEMENTATION.md</code> for setup instructions.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleDeliverySubmit} className="space-y-6">
          {/* Delivery Option */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Delivery Option
            </label>
            <div className="grid grid-cols-1 gap-3">
              {item.deliveryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDeliveryOption(option)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    deliveryOption === option
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">
                        {option === 'courier' ? '🚗 Courier Delivery' : 
                         option === 'pickup' ? '📍 Local Pickup' :
                         option === 'shipping' ? '📦 Standard Shipping' : option}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {option === 'courier' ? 'Same-day delivery available' :
                         option === 'pickup' ? 'Meet seller in person' :
                         option === 'shipping' ? '3-5 business days' : ''}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      {option === 'pickup' ? 'Free' : '$5.99'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Address (if not pickup) */}
          {deliveryOption !== 'pickup' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Delivery Address</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="CA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress.zipCode}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="94102"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Leave at front door, apartment buzzer code, etc."
                />
              </div>
            </div>
          )}

          {/* Pickup Location */}
          {deliveryOption === 'pickup' && item.pickupLocation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📍 Pickup Location</h3>
              <p className="text-blue-800">
                {item.pickupLocation.address}<br />
                {item.pickupLocation.city}, {item.pickupLocation.state}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                You'll receive the seller's contact information after payment to arrange pickup.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </form>
      </div>
    );
  }

  // Payment step
  if (!clientSecret) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Initializing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <button
          onClick={() => setStep('delivery')}
          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
        >
          ← Back to Delivery
        </button>
      </div>

      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm
          item={item}
          deliveryOption={deliveryOption}
          deliveryAddress={deliveryAddress as Address}
          deliveryInstructions={deliveryInstructions}
        />
      </Elements>
    </div>
  );
}

function PaymentForm({
  item,
  deliveryOption,
  deliveryAddress,
  deliveryInstructions
}: {
  item: MarketplaceItem;
  deliveryOption: DeliveryOption;
  deliveryAddress: Address;
  deliveryInstructions: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders?success=true`,
        },
        redirect: 'if_required'
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      // Payment succeeded
      navigate('/orders?success=true');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Payment secured by Stripe</h3>
        <p className="text-sm text-gray-600">
          Your payment information is encrypted and secure. Funds are held for 3 days to protect buyers.
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing Payment...' : `Pay $${(item.price + (deliveryOption === 'pickup' ? 0 : 5.99)).toFixed(2)}`}
      </button>
    </form>
  );
}

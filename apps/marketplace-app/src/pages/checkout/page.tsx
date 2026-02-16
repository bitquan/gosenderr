/**
 * Marketplace Checkout Page
 * Complete checkout flow with Stripe payment
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/lib/stripeConfig';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { marketplaceService } from '@/services/marketplace.service';
import { stripeService } from '@/services/stripe.service';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { DeliveryOption } from '@/types/marketplace';
import type { MarketplaceItem, Address } from '@/types/marketplace';
import { db } from '@/lib/firebase/client';
import { calcMiles } from '@/lib/v2/pricing';
import { calculateCourierRate, JobInfo } from '@/lib/pricing/calculateCourierRate';
import { AddressAutocomplete } from '@/components/v2/AddressAutocomplete';
import { CourierSelector, CourierWithRate } from '@/components/v2/CourierSelector';
import { UserDoc } from '@gosenderr/shared';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { PaymentForm as CartCheckoutPaymentForm } from '@/components/checkout/PaymentForm';
import { canUsePaymentMocks } from '@/lib/runtime/paymentSafety';

const stripePromise = getStripePromise();

interface CourierDropoffAddress {
  address: string;
  lat: number;
  lng: number;
}

interface CheckoutSummary {
  deliveryFee: number;
  deliveryOption: DeliveryOption;
  selectedCourier: CourierWithRate | null;
  courierEtaMinutes: number | null;
  courierDistance: number | null;
}

interface ShippingFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat?: number;
  lng?: number;
}

interface CartRoutePoint {
  lat: number;
  lng: number;
}

interface CartDeliveryPolicy {
  baseFee: number;
  perMileFee: number;
  perStopFee: number;
  minimumFee: number;
}

const DEFAULT_CART_DELIVERY_POLICY: CartDeliveryPolicy = {
  baseFee: 3.99,
  perMileFee: 0.85,
  perStopFee: 0.65,
  minimumFee: 4.99,
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractPickupPoint(cartItem: CartItem): CartRoutePoint | null {
  const pickupLocation = (cartItem.item as any)?.pickupLocation;
  const rawPoint = pickupLocation?.location ?? pickupLocation;
  if (!rawPoint || typeof rawPoint !== 'object') return null;

  const candidate = rawPoint as Record<string, unknown>;
  const latRaw = candidate.lat ?? candidate.latitude ?? candidate._latitude;
  const lngRaw = candidate.lng ?? candidate.longitude ?? candidate._longitude;
  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function estimateCartDeliveryFee(
  items: CartItem[],
  dropoff: CartRoutePoint | null,
  policy: CartDeliveryPolicy
): number {
  if (!items.length) return 0;

  const sellerStopIds = new Set<string>();
  const uniqueStops = new Map<string, CartRoutePoint>();
  items.forEach((cartItem) => {
    const sellerId = cartItem.item.sellerId || cartItem.item.id;
    if (!sellerId) return;
    sellerStopIds.add(sellerId);
    if (uniqueStops.has(sellerId)) return;
    const pickup = extractPickupPoint(cartItem);
    if (pickup) {
      uniqueStops.set(sellerId, pickup);
    }
  });

  const stopCount = Math.max(1, sellerStopIds.size);
  if (!dropoff || uniqueStops.size === 0) {
    return roundCurrency(
      Math.max(policy.minimumFee, policy.baseFee + Math.max(0, stopCount - 1) * policy.perStopFee)
    );
  }

  const remaining = [...uniqueStops.values()];
  const reverseOrdered: CartRoutePoint[] = [];
  let anchor = dropoff;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const distance = calcMiles(anchor, remaining[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    const [next] = remaining.splice(nearestIndex, 1);
    reverseOrdered.push(next);
    anchor = next;
  }

  const orderedStops = reverseOrdered.reverse();
  let routeMiles = 0;
  for (let index = 1; index < orderedStops.length; index += 1) {
    routeMiles += calcMiles(orderedStops[index - 1], orderedStops[index]);
  }
  if (orderedStops.length > 0) {
    routeMiles += calcMiles(orderedStops[orderedStops.length - 1], dropoff);
  }

  const extraStops = Math.max(0, stopCount - 1);
  const variableFee = policy.baseFee + routeMiles * policy.perMileFee + extraStops * policy.perStopFee;
  return roundCurrency(Math.max(policy.minimumFee, variableFee));
}


function parseAddressParts(address: string) {
  const parts = address.split(',').map((part) => part.trim());
  const [street, city, stateZip] = parts;
  const stateZipParts = (stateZip || '').split(' ').filter(Boolean);
  const state = stateZipParts[0] || '';
  const zipCode = stateZipParts.slice(1).join(' ');

  return {
    street: street || address,
    city: city || '',
    state,
    zipCode,
  };
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const checkoutMode = searchParams.get('mode');
  const isCartCheckout = checkoutMode === 'cart';
  const itemId = searchParams.get('itemId');
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CheckoutSummary>({
    deliveryFee: 5.99,
    deliveryOption: DeliveryOption.SHIPPING,
    selectedCourier: null,
    courierEtaMinutes: null,
    courierDistance: null,
  });

  if (isCartCheckout) {
    return <UnifiedCartCheckoutPage />;
  }

  useEffect(() => {
    if (itemId) {
      loadItem();
    } else {
      setError('No item specified');
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (!item) return;

    const initialOption = item.deliveryOptions[0] || DeliveryOption.SHIPPING;
    setSummary((prev) => ({
      ...prev,
      deliveryOption: initialOption,
      deliveryFee: initialOption === 'pickup' ? 0 : 5.99,
    }));
  }, [item]);

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
          <CheckoutForm item={item} onSummaryChange={setSummary} />
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary
            item={item}
            deliveryFee={summary.deliveryFee}
            deliveryOption={summary.deliveryOption}
            selectedCourier={summary.selectedCourier}
            courierEtaMinutes={summary.courierEtaMinutes}
            courierDistance={summary.courierDistance}
          />
        </div>
      </div>
    </div>
  );
}

function OrderSummary({
  item,
  deliveryFee,
  deliveryOption,
  selectedCourier,
  courierEtaMinutes,
  courierDistance,
}: {
  item: MarketplaceItem;
  deliveryFee: number;
  deliveryOption: DeliveryOption;
  selectedCourier: CourierWithRate | null;
  courierEtaMinutes: number | null;
  courierDistance: number | null;
}) {
  const resolvedDeliveryFee =
    deliveryOption === 'courier' && !selectedCourier ? 0 : deliveryFee;
  const total = item.price + resolvedDeliveryFee;

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
          <span className="font-medium">
            {deliveryOption === 'pickup'
              ? 'Free'
              : deliveryOption === 'courier' && !selectedCourier
                ? 'Select a courier'
                : `$${resolvedDeliveryFee.toFixed(2)}`}
          </span>
        </div>
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {deliveryOption === 'courier' && selectedCourier && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-800 font-semibold">Courier</p>
              <p className="text-sm text-purple-700">
                {selectedCourier.displayName || 'Selected Senderr'}
              </p>
              {(courierEtaMinutes || courierDistance) && (
                <p className="text-xs text-purple-600 mt-1">
                  {courierEtaMinutes ? `${courierEtaMinutes} min ETA` : ''}
                  {courierEtaMinutes && courierDistance ? ' • ' : ''}
                  {courierDistance ? `${courierDistance.toFixed(1)} mi` : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-600">Delivery</p>
              <p className="text-lg font-bold text-purple-900">
                ${resolvedDeliveryFee.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

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

function UnifiedCartCheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { settings: platformSettings } = usePlatformSettings();
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [shippingInfo, setShippingInfo] = useState<ShippingFormData>({
    fullName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const deliveryPolicy = useMemo<CartDeliveryPolicy>(() => ({
    baseFee:
      typeof (platformSettings as any).deliveryBaseFee === 'number'
        ? (platformSettings as any).deliveryBaseFee
        : DEFAULT_CART_DELIVERY_POLICY.baseFee,
    perMileFee:
      typeof (platformSettings as any).deliveryPerMileFee === 'number'
        ? (platformSettings as any).deliveryPerMileFee
        : DEFAULT_CART_DELIVERY_POLICY.perMileFee,
    perStopFee:
      typeof (platformSettings as any).deliveryPerStopFee === 'number'
        ? (platformSettings as any).deliveryPerStopFee
        : DEFAULT_CART_DELIVERY_POLICY.perStopFee,
    minimumFee:
      typeof (platformSettings as any).deliveryMinimumFee === 'number'
        ? (platformSettings as any).deliveryMinimumFee
        : DEFAULT_CART_DELIVERY_POLICY.minimumFee,
  }), [platformSettings]);

  const dropoffPoint = shippingInfo.lat != null && shippingInfo.lng != null
    ? { lat: shippingInfo.lat, lng: shippingInfo.lng }
    : null;
  const shippingCost = useMemo(
    () => estimateCartDeliveryFee(items as CartItem[], dropoffPoint, deliveryPolicy),
    [items, dropoffPoint, deliveryPolicy]
  );

  const platformFee = roundCurrency(platformSettings.platformFeePackage || 0);
  const adFeeEnabled = Boolean((platformSettings as any).orderAdFeeEnabled || (platformSettings as any).adFeeEnabled);
  const adFee = adFeeEnabled ? roundCurrency((platformSettings as any).orderAdFeeFlat || 0) : 0;
  const taxRate = platformSettings.collectTax ? (platformSettings.taxRate || 0) / 100 : 0;
  const tax = roundCurrency(subtotal * taxRate);
  const total = roundCurrency(subtotal + shippingCost + platformFee + adFee + tax);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/marketplace');
    }
  }, [items.length, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const field = e.target.name;
    const value = e.target.value;
    setShippingInfo((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'address' || field === 'city' || field === 'state' || field === 'zipCode'
        ? { lat: undefined, lng: undefined }
        : {}),
    }))
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields: Array<
      'fullName' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'zipCode'
    > = [
      'fullName',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'zipCode',
    ];
    const valid = requiredFields.every((field) => shippingInfo[field].trim() !== '');
    if (!valid) {
      alert('Please fill in all required fields');
      return;
    }
    setStep('payment');
  };

  const handlePaymentSuccess = async (orderId: string) => {
    clearCart();
    navigate(`/orders/${orderId}`);
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center ${
                step === 'shipping' ? 'text-blue-600' : 'text-green-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'shipping'
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                {step === 'payment' ? '✓' : '1'}
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div
              className={`flex items-center ${
                step === 'payment' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-300'
                }`}
              >
                2
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {step === 'shipping' ? (
                <>
                  <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={shippingInfo.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={shippingInfo.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <AddressAutocomplete
                        label="Address"
                        placeholder="Search dropoff address..."
                        required
                        onSelect={(result) => {
                          const parsed = parseAddressParts(result.address);
                          setShippingInfo((prev) => ({
                            ...prev,
                            address: parsed.street || result.address,
                            city: parsed.city || prev.city,
                            state: parsed.state || prev.state,
                            zipCode: parsed.zipCode || prev.zipCode,
                            lat: result.lat,
                            lng: result.lng,
                          }));
                        }}
                      />
                      <input
                        type="text"
                        name="address"
                        value={shippingInfo.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Street address"
                        required
                      />
                      {shippingInfo.lat != null && shippingInfo.lng != null && (
                        <p className="text-xs text-green-700 mt-2">
                          Route geocode ready: {shippingInfo.lat.toFixed(5)}, {shippingInfo.lng.toFixed(5)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={shippingInfo.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={shippingInfo.state}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          value={shippingInfo.zipCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => navigate('/marketplace')}
                        className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      >
                        Back to Shopping
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">Payment</h2>
                    <button
                      onClick={() => setStep('shipping')}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      ← Edit shipping information
                    </button>
                  </div>
                  <Elements stripe={stripePromise}>
                    <CartCheckoutPaymentForm
                      amount={total}
                      shippingInfo={shippingInfo}
                      items={items as CartItem[]}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>

              <div className="space-y-4 mb-6">
                {items.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex gap-4">
                    <img
                      src={cartItem.item.images?.[0]}
                      alt={cartItem.item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cartItem.item.title}</p>
                      <p className="text-sm text-gray-600">Qty: {cartItem.quantity}</p>
                      <p className="text-sm font-medium">
                        ${(cartItem.item.price * cartItem.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Delivery {dropoffPoint ? '' : '(estimate)'}
                  </span>
                  <span className="font-medium">${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="font-medium">${platformFee.toFixed(2)}</span>
                </div>
                {adFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ad fee</span>
                    <span className="font-medium">${adFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Pricing rail</span>
                  <span>Delivery + platform</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-lg">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({
  item,
  onSummaryChange,
}: {
  item: MarketplaceItem;
  onSummaryChange: (summary: CheckoutSummary) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const { settings: platformSettings } = usePlatformSettings();
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
  const [courierDropoff, setCourierDropoff] = useState<CourierDropoffAddress | null>(null);
  const [courierDistance, setCourierDistance] = useState<number>(0);
  const [courierEtaMinutes, setCourierEtaMinutes] = useState<number>(0);
  const [availableCouriers, setAvailableCouriers] = useState<CourierWithRate[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierWithRate | null>(null);
  const [searchingCouriers, setSearchingCouriers] = useState(false);
  const [courierError, setCourierError] = useState<string | null>(null);
  const paymentMocksEnabled = canUsePaymentMocks();
  const isMockClientSecret = clientSecret.startsWith('pi_mock_');
  const courierOffersEnabled = !!flags?.marketplace?.courierOffers;
  const pickupLocation = (item.pickupLocation as any)?.location || (item.pickupLocation as any);
  const pickupLat = pickupLocation?.latitude ?? pickupLocation?.lat;
  const pickupLng = pickupLocation?.longitude ?? pickupLocation?.lng;
  const isFoodItem = (item as any).isFoodItem || (item as any).category === 'food';

  const resolvedDeliveryFee =
    deliveryOption === 'pickup'
      ? 0
      : deliveryOption === 'courier' && courierOffersEnabled
        ? selectedCourier?.rateBreakdown?.totalCustomerCharge ?? 0
        : 5.99;

  const courierPriceRangeLabel = () => {
    if (!courierOffersEnabled) return '$5.99';
    if (availableCouriers.length === 0) return 'Select dropoff to see rates';
    const totals = availableCouriers
      .map((courier) => courier.rateBreakdown?.totalCustomerCharge)
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
    if (totals.length === 0) return 'Select dropoff to see rates';
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    if (min === max) return `$${min.toFixed(2)}`;
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  };

  useEffect(() => {
    onSummaryChange({
      deliveryFee: resolvedDeliveryFee,
      deliveryOption,
      selectedCourier,
      courierEtaMinutes: courierEtaMinutes || null,
      courierDistance: courierDistance || null,
    });
  }, [
    onSummaryChange,
    resolvedDeliveryFee,
    deliveryOption,
    selectedCourier,
    courierEtaMinutes,
    courierDistance,
  ]);

  useEffect(() => {
    if (deliveryOption !== 'courier') {
      setCourierDropoff(null);
      setCourierDistance(0);
      setCourierEtaMinutes(0);
      setAvailableCouriers([]);
      setSelectedCourier(null);
      setCourierError(null);
    }
  }, [deliveryOption]);

  useEffect(() => {
    if (!courierDropoff || pickupLat == null || pickupLng == null) return;

    const dist = calcMiles(
      { lat: pickupLat, lng: pickupLng },
      { lat: courierDropoff.lat, lng: courierDropoff.lng },
    );
    setCourierDistance(dist);
    setCourierEtaMinutes(Math.round((dist / 30) * 60));
  }, [courierDropoff, pickupLat, pickupLng]);

  useEffect(() => {
    if (!courierOffersEnabled || deliveryOption !== 'courier') return;
    if (pickupLat == null || pickupLng == null) {
      setCourierError('Pickup location is missing for courier delivery.');
      return;
    }

    setSearchingCouriers(true);
    setAvailableCouriers([]);
    setSelectedCourier(null);
    setCourierError(null);

    const usersRef = collection(db, 'users');
    const courierQuery = query(
      usersRef,
      where('role', '==', 'courier'),
      where('courierProfile.isOnline', '==', true),
    );

    const unsubscribe = onSnapshot(
      courierQuery,
      (snapshot) => {
        const couriers: CourierWithRate[] = [];

        snapshot.forEach((docSnap) => {
          const courierData = docSnap.data() as UserDoc;
          const courier: CourierWithRate = {
            ...courierData,
            id: docSnap.id,
            distance: 0,
            rateBreakdown: {} as any,
          };

          if (!courier.courierProfile) return;

          const courierStatus = courier.courierProfile.status as string | undefined;
          if (
            courierStatus &&
            courierStatus !== 'approved' &&
            courierStatus !== 'active'
          ) {
            return;
          }

          const workModes = courier.courierProfile.workModes;
          const workModeEnabled = isFoodItem
            ? workModes?.foodEnabled ?? true
            : workModes?.packagesEnabled ?? true;

          if (!workModeEnabled) return;
          if (!courier.courierProfile.currentLocation) return;

          const courierToPickup = calcMiles(
            {
              lat: courier.courierProfile.currentLocation.lat,
              lng: courier.courierProfile.currentLocation.lng,
            },
            { lat: pickupLat, lng: pickupLng },
          );

          if (courierToPickup > courier.courierProfile.serviceRadius) return;

          courier.distance = courierToPickup;

          if (isFoodItem && (item as any).foodDetails) {
            const equipment = courier.courierProfile.equipment;
            const foodDetails = (item as any).foodDetails;

            if (foodDetails.requiresCooler && !equipment.cooler?.approved) return;
            if (
              foodDetails.requiresHotBag &&
              !equipment.hot_bag?.approved &&
              !equipment.insulated_bag?.approved
            ) return;
            if (
              foodDetails.requiresDrinkCarrier &&
              !equipment.drink_carrier?.approved
            ) return;
          }

          const rateCard = isFoodItem
            ? courier.courierProfile.foodRateCard
            : courier.courierProfile.packageRateCard;

          if (!rateCard) return;

          const jobInfo: JobInfo = {
            distance: courierDistance,
            estimatedMinutes: courierEtaMinutes,
            isFoodItem,
          };

          courier.rateBreakdown = calculateCourierRate(rateCard, jobInfo, new Date(), {
            platformFeeFood: platformSettings.platformFeeFood,
            platformFeePackage: platformSettings.platformFeePackage,
          });
          couriers.push(courier);
        });

        couriers.sort(
          (a, b) =>
            a.rateBreakdown.totalCustomerCharge -
            b.rateBreakdown.totalCustomerCharge,
        );

        setAvailableCouriers(couriers);
        setSearchingCouriers(false);
      },
      (err) => {
        console.error('Error finding couriers:', err);
        setCourierError('Failed to find available couriers');
        setSearchingCouriers(false);
      },
    );

    return () => unsubscribe();
  }, [
    courierOffersEnabled,
    deliveryOption,
    courierDropoff,
    courierDistance,
    courierEtaMinutes,
    pickupLat,
    pickupLng,
    isFoodItem,
    item,
    platformSettings,
  ]);

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (deliveryOption === 'courier' && courierOffersEnabled) {
        if (!courierDropoff) {
          setError('Please select a dropoff address for courier delivery.');
          setLoading(false);
          return;
        }

        if (!selectedCourier) {
          setError('Please select a courier offer to continue.');
          setLoading(false);
          return;
        }
      }

      // Create payment intent
      const result = await stripeService.createPaymentIntent({
        itemId: item.id,
        quantity: 1,
        deliveryOption: deliveryOption as any,
        deliveryFee: resolvedDeliveryFee,
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
        {paymentMocksEnabled && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Development Mode</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  Payment mocks are enabled in this environment. No real Stripe charge will be processed.
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
                      {option === 'pickup'
                        ? 'Free'
                        : option === 'courier'
                          ? courierPriceRangeLabel()
                          : '$5.99'}
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

              {deliveryOption === 'courier' && courierOffersEnabled ? (
                <>
                  <AddressAutocomplete
                    label="Dropoff Address"
                    placeholder="Enter dropoff address..."
                    required
                    onSelect={(result) => {
                      setCourierDropoff(result);
                      const parsed = parseAddressParts(result.address);
                      setDeliveryAddress({
                        ...deliveryAddress,
                        street: parsed.street,
                        city: parsed.city,
                        state: parsed.state,
                        zipCode: parsed.zipCode,
                      });
                    }}
                  />

                  {courierDropoff && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      <div>
                        <span className="font-semibold">Distance:</span>{' '}
                        {courierDistance.toFixed(2)} miles
                      </div>
                      <div>
                        <span className="font-semibold">Estimated time:</span>{' '}
                        {courierEtaMinutes} minutes
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}

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

          {deliveryOption === 'courier' && courierOffersEnabled && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Courier Offers</h3>

              {courierError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                  {courierError}
                </div>
              )}


              {searchingCouriers ? (
                <div className="py-6 text-center text-sm text-gray-600">
                  Finding available Sendrs...
                </div>
              ) : (
                <CourierSelector
                  couriers={availableCouriers}
                  selectedCourierId={selectedCourier?.id || null}
                  onSelect={setSelectedCourier}
                  isFoodItem={isFoodItem}
                />
              )}
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

      {isMockClientSecret && paymentMocksEnabled ? (
        <MockPaymentForm
          item={item}
          deliveryOption={deliveryOption}
          deliveryAddress={deliveryAddress}
          deliveryFee={resolvedDeliveryFee}
        />
      ) : isMockClientSecret ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Mock payment is blocked on this environment.</p>
          <p className="mt-1 text-sm text-red-700">
            Refresh checkout after payment configuration is corrected.
          </p>
        </div>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            item={item}
            deliveryOption={deliveryOption}
            deliveryAddress={deliveryAddress as Address}
            deliveryInstructions={deliveryInstructions}
            deliveryFee={resolvedDeliveryFee}
          />
        </Elements>
      )}
    </div>
  );
}

function MockPaymentForm({
  item,
  deliveryOption,
  deliveryAddress,
  deliveryFee,
}: {
  item: MarketplaceItem;
  deliveryOption: DeliveryOption;
  deliveryAddress: Partial<Address>;
  deliveryFee: number;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const paymentMocksEnabled = canUsePaymentMocks();

  const handleMockPay = async () => {
    if (!paymentMocksEnabled) {
      return;
    }
    if (!user) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const orderRef = await addDoc(collection(db, 'orders'), {
      customerId: (user as any).uid ?? (user as any).id,
      customerEmail: (user as any).email ?? 'customer@example.com',
      items: [
        {
          itemId: item.id,
          title: item.title,
          quantity: 1,
          price: item.price,
          sellerId: item.sellerId,
        },
      ],
      subtotal: item.price,
      shipping: deliveryFee,
      tax: 0,
      total: item.price + deliveryFee,
      deliveryOption,
      status: 'delivered',
      paymentStatus: 'paid',
      createdAt: serverTimestamp(),
      shippingInfo: {
        fullName: (deliveryAddress as any)?.fullName || (user as any).displayName || 'Customer',
        email: (user as any).email || 'customer@example.com',
        phone: (deliveryAddress as any)?.phone || '',
        address: (deliveryAddress as any)?.street || '',
        city: (deliveryAddress as any)?.city || '',
        state: (deliveryAddress as any)?.state || '',
        zipCode: (deliveryAddress as any)?.zipCode || '',
        country: 'United States',
      },
    });

    navigate(`/orders/${orderRef.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          Dev mode: using mock payment intent. No real payment will be processed.
        </p>
      </div>

      <button
        onClick={handleMockPay}
        disabled={loading}
        className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing Payment...' : `Pay $${(item.price + deliveryFee).toFixed(2)}`}
      </button>
    </div>
  );
}

function PaymentForm({
  item,
  deliveryOption,
  deliveryAddress,
  deliveryInstructions,
  deliveryFee,
}: {
  item: MarketplaceItem;
  deliveryOption: DeliveryOption;
  deliveryAddress: Address;
  deliveryInstructions: string;
  deliveryFee: number;
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
        {loading ? 'Processing Payment...' : `Pay $${(item.price + deliveryFee).toFixed(2)}`}
      </button>
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { PaymentForm } from '@/components/v2/PaymentForm';
import { db } from '@/lib/firebase/firestore';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface OrderDetails {
  itemId: string;
  courierId: string;
  courierName?: string;
  courierRate: number;
  platformFee: number;
  pickupAddress: string;
  dropoffAddress: string;
  itemTitle?: string;
  itemDescription?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get order details from sessionStorage first
    const storedDetails = sessionStorage.getItem('orderDetails');
    if (storedDetails) {
      try {
        setOrderDetails(JSON.parse(storedDetails));
        return;
      } catch (e) {
        console.error('Failed to parse stored order details:', e);
      }
    }

    // Fallback to query params
    const itemId = searchParams.get('itemId');
    const courierId = searchParams.get('courierId');
    const courierRate = searchParams.get('courierRate');
    const platformFee = searchParams.get('platformFee');
    const dropoffAddress = searchParams.get('dropoffAddress');

    if (!itemId || !courierId || !courierRate || !platformFee || !dropoffAddress) {
      setError('Missing required order information. Please start over.');
      return;
    }

    setOrderDetails({
      itemId,
      courierId,
      courierName: searchParams.get('courierName') || undefined,
      courierRate: parseFloat(courierRate),
      platformFee: parseFloat(platformFee),
      pickupAddress: searchParams.get('pickupAddress') || 'Pickup location',
      dropoffAddress,
      itemTitle: searchParams.get('itemTitle') || undefined,
      itemDescription: searchParams.get('itemDescription') || undefined,
    });
  }, [searchParams]);

  const handlePaymentSuccess = async () => {
    if (!orderDetails || !user) {
      setError('Missing user or order information');
      return;
    }

    setIsCreatingJob(true);
    setError(null);

    try {
      // Generate a temporary job ID for payment
      const tempJobId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create delivery job in Firestore
      const deliveryJobData = {
        customerId: user.uid,
        courierId: orderDetails.courierId,
        itemId: orderDetails.itemId,
        status: 'pending',
        paymentStatus: 'authorized',
        pricing: {
          courierRate: orderDetails.courierRate,
          platformFee: orderDetails.platformFee,
          totalAmount: orderDetails.courierRate + orderDetails.platformFee,
        },
        pickup: {
          address: orderDetails.pickupAddress,
        },
        dropoff: {
          address: orderDetails.dropoffAddress,
        },
        stripePaymentIntentId: tempJobId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const jobRef = await addDoc(collection(db, 'deliveryJobs'), deliveryJobData);

      // Update item status to 'pending'
      if (orderDetails.itemId) {
        const itemRef = doc(db, 'items', orderDetails.itemId);
        await updateDoc(itemRef, {
          status: 'pending',
          updatedAt: serverTimestamp(),
        });
      }

      // Clear session storage
      sessionStorage.removeItem('orderDetails');

      // Navigate to job tracking page
      router.push(`/customer/jobs/${jobRef.id}`);
    } catch (err: any) {
      console.error('Error creating delivery job:', err);
      setError(err.message || 'Failed to create delivery job');
      setIsCreatingJob(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to continue with payment.</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (error && !orderDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push('/marketplace')}
            className="mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalAmount = orderDetails.courierRate + orderDetails.platformFee;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Order</h1>
          <p className="mt-2 text-gray-600">Review your order and provide payment details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

              {orderDetails.itemTitle && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500">Item</h3>
                  <p className="text-gray-900">{orderDetails.itemTitle}</p>
                  {orderDetails.itemDescription && (
                    <p className="text-sm text-gray-600 mt-1">{orderDetails.itemDescription}</p>
                  )}
                </div>
              )}

              {orderDetails.courierName && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500">Courier</h3>
                  <p className="text-gray-900">{orderDetails.courierName}</p>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500">Pickup Address</h3>
                <p className="text-gray-900">{orderDetails.pickupAddress}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500">Dropoff Address</h3>
                <p className="text-gray-900">{orderDetails.dropoffAddress}</p>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-3">Pricing Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Courier Rate</span>
                    <span>${orderDetails.courierRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee</span>
                    <span>${orderDetails.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Payment Process</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Payment will be pre-authorized (not charged yet)</li>
                <li>• Funds captured after successful delivery</li>
                <li>• Automatic refund if cancelled before pickup</li>
              </ul>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            {isCreatingJob ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Creating your delivery job...</p>
                </div>
              </div>
            ) : (
              <PaymentForm
                jobId={`pending_${Date.now()}`}
                courierRate={orderDetails.courierRate}
                platformFee={orderDetails.platformFee}
                onSuccess={handlePaymentSuccess}
              />
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

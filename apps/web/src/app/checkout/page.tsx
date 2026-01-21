'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { PaymentForm } from '@/components/v2/PaymentForm';
import { db } from '@/lib/firebase/firestore';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

interface CheckoutDetails {
  itemId: string;
  itemPrice: number;
  itemTitle?: string;
  sellerId: string;
  sellerConnectAccountId?: string;
  deliveryFee: number;
  platformFee: number;
  pickupAddress: string;
  dropoffAddress: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');

  useEffect(() => {
    loadCheckoutDetails();
  }, [user]);

  async function loadCheckoutDetails() {
    try {
      // Try to get details from sessionStorage
      const storedDetails = sessionStorage.getItem('checkoutDetails');
      if (storedDetails) {
        const parsed = JSON.parse(storedDetails);
        setDetails(parsed);
        
        // Create payment intent
        await createPaymentIntent(parsed);
        
        setLoading(false);
        return;
      }

      // Fallback to query params
      const itemId = searchParams.get('itemId');
      const itemPrice = parseFloat(searchParams.get('itemPrice') || '0');
      const deliveryFee = parseFloat(searchParams.get('deliveryFee') || '0');
      const platformFee = parseFloat(searchParams.get('platformFee') || '2.50');
      
      if (!itemId || !itemPrice) {
        setError('Missing required checkout information.');
        setLoading(false);
        return;
      }

      // Load item details from Firestore
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (!itemDoc.exists()) {
        setError('Item not found.');
        setLoading(false);
        return;
      }

      const itemData = itemDoc.data();
      
      // Load seller's Stripe Connect account
      const sellerDoc = await getDoc(doc(db, 'users', itemData.sellerId));
      const sellerData = sellerDoc.data();
      
      if (!sellerData?.stripeConnectAccountId) {
        setError('Seller has not set up payment processing. Cannot complete checkout.');
        setLoading(false);
        return;
      }

      const checkoutDetails: CheckoutDetails = {
        itemId,
        itemPrice,
        itemTitle: itemData.title,
        sellerId: itemData.sellerId,
        sellerConnectAccountId: sellerData.stripeConnectAccountId,
        deliveryFee,
        platformFee,
        pickupAddress: itemData.pickupLocation?.address || 'Unknown',
        dropoffAddress: searchParams.get('dropoffAddress') || 'Unknown',
      };

      setDetails(checkoutDetails);
      await createPaymentIntent(checkoutDetails);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading checkout details:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  async function createPaymentIntent(checkoutDetails: CheckoutDetails) {
    if (!user) return;

    try {
      // Create delivery job first
      const jobRef = await addDoc(collection(db, 'deliveryJobs'), {
        itemId: checkoutDetails.itemId,
        customerId: user.uid,
        sellerId: checkoutDetails.sellerId,
        isMarketplaceOrder: true,
        sellerReadyForPickup: false,
        status: 'open',
        jobType: 'package',
        priority: 50,
        pickup: {
          lat: 0, // Would be filled from item data
          lng: 0,
          address: checkoutDetails.pickupAddress,
          contactPhone: '',
        },
        dropoff: {
          lat: 0, // Would be filled from user input
          lng: 0,
          address: checkoutDetails.dropoffAddress,
          contactPhone: user.phone || '',
        },
        estimatedDistance: 0,
        estimatedDuration: 0,
        pricing: {
          baseFare: 0,
          perMileCharge: 0,
          optionalFees: [],
          courierEarnings: checkoutDetails.deliveryFee,
          platformFee: checkoutDetails.platformFee,
          totalCustomerCharge: checkoutDetails.itemPrice + checkoutDetails.deliveryFee + checkoutDetails.platformFee,
          itemPrice: checkoutDetails.itemPrice,
          deliveryFee: checkoutDetails.deliveryFee,
          sellerPayout: checkoutDetails.itemPrice * 0.97, // Seller gets 97% after Stripe fees
          platformApplicationFee: checkoutDetails.deliveryFee + checkoutDetails.platformFee,
        },
        paymentStatus: 'pending',
        stripePaymentIntentId: '',
        timeline: {
          orderPlaced: serverTimestamp(),
        },
        customerConfirmation: {
          received: false,
          autoConfirmed: false,
          deadline: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setJobId(jobRef.id);

      // Create Stripe payment intent with Connect transfer
      const response = await fetch('/api/marketplace/create-combined-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobRef.id,
          itemId: checkoutDetails.itemId,
          itemPrice: checkoutDetails.itemPrice,
          deliveryFee: checkoutDetails.deliveryFee,
          platformFee: checkoutDetails.platformFee,
          sellerConnectAccountId: checkoutDetails.sellerConnectAccountId,
          sellerPayout: checkoutDetails.itemPrice * 0.97,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);

      // Update job with payment intent ID
      await fetch(`/api/jobs/${jobRef.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePaymentIntentId: data.paymentIntentId,
        }),
      }).catch(err => console.error('Failed to update job:', err));

    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading checkout...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
        <div
          style={{
            padding: '20px',
            backgroundColor: '#FEE',
            border: '1px solid #FCC',
            borderRadius: '8px',
            color: '#C00',
            marginBottom: '20px',
          }}
        >
          {error || 'Failed to load checkout details'}
        </div>
        <Link
          href="/marketplace"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#6E56CF',
            color: '#FFF',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const total = details.itemPrice + details.deliveryFee + details.platformFee;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link
          href="/marketplace"
          style={{
            color: '#6E56CF',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          ← Back to Marketplace
        </Link>
      </div>

      <h1 style={{ marginBottom: '10px', fontSize: '28px' }}>
        Checkout
      </h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Complete your purchase for item + delivery
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Order Summary */}
        <div
          style={{
            backgroundColor: '#FFF',
            border: '1px solid #E0E0E0',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Order Summary</h2>
          
          {details.itemTitle && (
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#999', fontSize: '14px', margin: '0 0 5px 0' }}>ITEM</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{details.itemTitle}</p>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <p style={{ color: '#999', fontSize: '14px', margin: '0 0 5px 0' }}>PICKUP</p>
            <p style={{ margin: 0, fontSize: '14px' }}>{details.pickupAddress}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#999', fontSize: '14px', margin: '0 0 5px 0' }}>DELIVERY</p>
            <p style={{ margin: 0, fontSize: '14px' }}>{details.dropoffAddress}</p>
          </div>

          <div
            style={{
              borderTop: '1px solid #E0E0E0',
              paddingTop: '15px',
              marginBottom: '15px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#666' }}>Item Price</span>
              <span style={{ fontWeight: '600' }}>${details.itemPrice.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#666' }}>Delivery Fee</span>
              <span style={{ fontWeight: '600' }}>${details.deliveryFee.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ color: '#666' }}>Platform Fee</span>
              <span style={{ fontWeight: '600' }}>${details.platformFee.toFixed(2)}</span>
            </div>
            
            <div
              style={{
                borderTop: '1px solid #E0E0E0',
                paddingTop: '15px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#6E56CF' }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {clientSecret && (
          <div
            style={{
              backgroundColor: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Payment Details</h2>
            
            <PaymentForm
              clientSecret={clientSecret}
              amount={total}
              onSuccess={() => {
                sessionStorage.removeItem('checkoutDetails');
                router.push(`/customer/jobs/${jobId}?payment=success`);
              }}
              onError={(err) => {
                setError(err);
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          padding: '15px',
          backgroundColor: '#F5F5F5',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666',
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Note:</strong> Payment will be held until delivery is confirmed. 
          The seller will receive their payout after successful delivery.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { AddressAutocomplete } from '@/components/v2/AddressAutocomplete';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

interface ShippingAddress {
  address: string;
  lat: number;
  lng: number;
}

interface PackageDetails {
  description: string;
  weight: number; // pounds
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  value: number;
}

export default function ShipPackagePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  
  const [step, setStep] = useState<'package' | 'addresses' | 'payment'>(
 | 'payment'>('package');
  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    description: '',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    value: 0,
  });
  const [pickupAddress, setPickupAddress] = useState<ShippingAddress | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<ShippingAddress | null>(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth gate
  if (authLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/ship');
    return null;
  }

  const handlePackageDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!packageDetails.description || packageDetails.weight <= 0) {
      setError('Please provide package description and weight');
      return;
    }

    setError(null);
    setStep('addresses');
  };

  const handleAddressesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pickupAddress || !deliveryAddress) {
      setError('Please provide both pickup and delivery addresses');
      return;
    }

    if (!senderPhone || !recipientName || !recipientPhone) {
      setError('Please provide contact information for sender and recipient');
      return;
    }

    setError(null);
    setStep('payment');
  };

  const handlePaymentAndCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !pickupAddress || !deliveryAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate shipping cost (simple formula for demo)
      const distance = calculateDistance(pickupAddress, deliveryAddress);
      const baseRate = 5.00;
      const perMileRate = 1.50;
      const platformFee = 2.50;
      const courierRate = baseRate + (distance * perMileRate);
      const totalCost = courierRate + platformFee;

      // Step 1: Create payment intent
      const paymentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: `temp_${Date.now()}`,
          courierRate,
          platformFee,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await paymentResponse.json();

      // Step 2: Create package/job in Firestore
      const jobData = {
        createdByUid: user.uid,
        courierUid: null,
        agreedFee: totalCost,
        status: 'open',
        pickup: {
          lat: pickupAddress.lat,
          lng: pickupAddress.lng,
          label: pickupAddress.address,
        },
        dropoff: {
          lat: deliveryAddress.lat,
          lng: deliveryAddress.lng,
          label: deliveryAddress.address,
        },
        package: {
          description: packageDetails.description,
          weight: packageDetails.weight,
          dimensions: packageDetails.dimensions,
          value: packageDetails.value,
        },
        senderContact: {
          email: senderEmail || user.email,
          phone: senderPhone,
        },
        recipientContact: {
          name: recipientName,
          phone: recipientPhone,
        },
        pricing: {
          courierRate,
          platformFee,
          totalCost,
          distance,
        },
        paymentIntentId: clientSecret,
        paymentStatus: 'pending',
        photos: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const jobRef = await addDoc(collection(db, 'jobs'), jobData);

      // Step 3: Navigate to confirmation page
      // In a real implementation, we would process payment here
      // For now, we'll just create the job and redirect to confirmation
      
      // TODO: Send email/SMS confirmation
      // This would typically be done via Cloud Functions
      console.log('TODO: Send email to:', senderEmail || user.email);
      console.log('TODO: Send SMS to:', senderPhone);

      router.push(`/ship/confirmation/${jobRef.id}`);
    } catch (err: any) {
      console.error('Error creating package:', err);
      setError(err.message || 'Failed to create package. Please try again.');
      setLoading(false);
    }
  };

  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
    const R = 3959; // Earth radius in miles
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
            Ship a Package
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Fast, reliable package delivery
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px',
          gap: '16px',
        }}>
          {['package', 'addresses', 'payment'].map((s, idx) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: step === s || ['addresses', 'payment'].includes(step) && s === 'package' || step === 'payment' && s === 'addresses' ? '#2563eb' : '#e5e7eb',
                  color: step === s || ['addresses', 'payment'].includes(step) && s === 'package' || step === 'payment' && s === 'addresses' ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                {idx + 1}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: step === s ? '#111827' : '#6b7280',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Package Details */}
        {step === 'package' && (
          <form onSubmit={handlePackageDetailsSubmit}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
                Package Details
              </h2>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                    Description *
                  </label>
                  <input
                    type="text"
                    value={packageDetails.description}
                    onChange={(e) => setPackageDetails({ ...packageDetails, description: e.target.value })}
                    placeholder="e.g., Electronics, Books, Clothing"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                    Weight (lbs) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={packageDetails.weight || ''}
                    onChange={(e) => setPackageDetails({ ...packageDetails, weight: parseFloat(e.target.value) || 0 })}
                    placeholder="10"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                    Dimensions (inches)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={packageDetails.dimensions.length || ''}
                      onChange={(e) => setPackageDetails({
                        ...packageDetails,
                        dimensions: { ...packageDetails.dimensions, length: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="Length"
                      style={{
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={packageDetails.dimensions.width || ''}
                      onChange={(e) => setPackageDetails({
                        ...packageDetails,
                        dimensions: { ...packageDetails.dimensions, width: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="Width"
                      style={{
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={packageDetails.dimensions.height || ''}
                      onChange={(e) => setPackageDetails({
                        ...packageDetails,
                        dimensions: { ...packageDetails.dimensions, height: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="Height"
                      style={{
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                    Declared Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageDetails.value || ''}
                    onChange={(e) => setPackageDetails({ ...packageDetails, value: parseFloat(e.target.value) || 0 })}
                    placeholder="100.00"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '14px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Continue to Addresses
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Addresses */}
        {step === 'addresses' && (
          <form onSubmit={handleAddressesSubmit}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
                Pickup & Delivery
              </h2>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                    Pickup Address
                  </h3>
                  <AddressAutocomplete
                    label=""
                    placeholder="Enter pickup address..."
                    onSelect={(result) => setPickupAddress(result)}
                    required
                  />
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="tel"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="Sender phone number"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="Sender email (optional)"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                    Delivery Address
                  </h3>
                  <AddressAutocomplete
                    label=""
                    placeholder="Enter delivery address..."
                    onSelect={(result) => setDeliveryAddress(result)}
                    required
                  />
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Recipient name"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="Recipient phone number"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setStep('package')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Payment */}
        {step === 'payment' && (
          <form onSubmit={handlePaymentAndCreatePackage}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
                Review & Pay
              </h2>

              {/* Order Summary */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '24px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                  Order Summary
                </h3>
                <div style={{ fontSize: '14px', color: '#6b7280', display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Package:</span>
                    <span>{packageDetails.description}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>From:</span>
                    <span style={{ textAlign: 'right' }}>{pickupAddress?.address}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>To:</span>
                    <span style={{ textAlign: 'right' }}>{deliveryAddress?.address}</span>
                  </div>
                  {pickupAddress && deliveryAddress && (
                    <>
                      <div style={{
                        borderTop: '1px solid #e5e7eb',
                        marginTop: '12px',
                        paddingTop: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Distance:</span>
                        <span>{calculateDistance(pickupAddress, deliveryAddress).toFixed(1)} miles</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Courier Rate:</span>
                        <span>
                          ${(5 + calculateDistance(pickupAddress, deliveryAddress) * 1.5).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Platform Fee:</span>
                        <span>$2.50</span>
                      </div>
                      <div style={{
                        borderTop: '2px solid #e5e7eb',
                        marginTop: '12px',
                        paddingTop: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#111827',
                      }}>
                        <span>Total:</span>
                        <span style={{ color: '#2563eb' }}>
                          ${(5 + calculateDistance(pickupAddress, deliveryAddress) * 1.5 + 2.5).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1e40af',
                marginBottom: '24px',
              }}>
                ℹ️ Payment will be authorized now and captured after successful delivery.
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep('addresses')}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: loading ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Processing...' : 'Create Shipment'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

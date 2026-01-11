'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { JobForm } from '@/components/v2/JobForm';
import { useNearbyCouriers } from '@/hooks/v2/useNearbyCouriers';
import { createJob } from '@/lib/v2/jobs';
import { calcMiles, calcFee } from '@/lib/v2/pricing';
import { FLOOR_RATE_CARD } from '@/lib/v2/floorRateCard';
import { GeoPoint } from '@/lib/v2/types';

export default function NewJob() {
  const router = useRouter();
  const { uid } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  
  const { couriers, loading: couriersLoading } = useNearbyCouriers(pickup, dropoff);

  // Calculate minimum estimate
  const { jobMiles, minEstimate, estimateSource } = useMemo(() => {
    if (!pickup || !dropoff) {
      return { jobMiles: 0, minEstimate: 0, estimateSource: 'none' };
    }

    const miles = calcMiles(pickup, dropoff);
    const eligibleCouriers = couriers.filter(c => c.eligible);

    if (eligibleCouriers.length > 0) {
      // Use lowest fee from eligible couriers
      const minFee = Math.min(...eligibleCouriers.map(c => c.estimatedFee));
      return { jobMiles: miles, minEstimate: minFee, estimateSource: 'couriers' as const };
    } else {
      // Use floor rate card
      const floorFee = calcFee(FLOOR_RATE_CARD, miles, undefined, 'car');
      return { jobMiles: miles, minEstimate: floorFee, estimateSource: 'floor' as const };
    }
  }, [pickup, dropoff, couriers]);

  const handlePickupDropoffChange = (pickupData: any, dropoffData: any) => {
    // Update state for nearby couriers query
    if (pickupData && pickupData.lat && pickupData.lng) {
      setPickup({ lat: pickupData.lat, lng: pickupData.lng });
    } else {
      setPickup(null);
    }

    if (dropoffData && dropoffData.lat && dropoffData.lng) {
      setDropoff({ lat: dropoffData.lat, lng: dropoffData.lng });
    } else {
      setDropoff(null);
    }
  };

  const handleSubmit = async (payload: any) => {
    if (!uid) return;

    setLoading(true);
    try {
      const jobId = await createJob(uid, payload);
      router.push(`/v2/customer/jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create job. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Create New Job</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px' }}>
        {/* Main Form */}
        <div>
          <JobForm 
            onSubmit={handleSubmit} 
            loading={loading}
            onPickupDropoffChange={handlePickupDropoffChange}
          />
        </div>

        {/* Right Column - Always show when coordinates valid */}
        {pickup && dropoff && (
          <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
            {/* Minimum Estimate Panel - Always at top */}
            <div style={{ marginBottom: '20px', padding: '20px', background: 'white', border: '2px solid #6E56CF', borderRadius: '8px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#6E56CF', fontSize: '14px', fontWeight: '600' }}>
                Minimum Estimate (for this trip)
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  Distance
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>
                  {jobMiles.toFixed(2)} miles
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  Minimum
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>
                  ${minEstimate.toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', fontStyle: 'italic' }}>
                  {estimateSource === 'couriers' 
                    ? 'from nearby couriers' 
                    : estimateSource === 'floor'
                    ? 'No eligible couriers online'
                    : 'typical courier rates'}
                </div>
              </div>

              <div style={{ padding: '10px', background: '#fef9e7', border: '1px solid #f9e79f', borderRadius: '4px', fontSize: '11px', color: '#856404' }}>
                ⚠️ Estimate only. Couriers set their own rates and final price may differ.
              </div>
            </div>

            {/* Nearby Couriers Panel */}
            <div style={{ padding: '20px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Nearby Couriers</h3>

              {couriersLoading ? (
                <p style={{ color: '#666', fontSize: '14px' }}>Loading nearby couriers...</p>
              ) : couriers.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>
                  No online couriers found in this area.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                  {couriers.map((courier) => (
                    <div
                      key={courier.uid}
                      style={{
                        padding: '12px',
                        background: courier.eligible ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${courier.eligible ? '#86efac' : '#fecaca'}`,
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                            {courier.email}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {courier.transportMode === 'walk' && '🚶 Walk'}
                            {courier.transportMode === 'scooter' && '🛴 Scooter'}
                            {courier.transportMode === 'car' && '🚗 Car'}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '4px 8px',
                            background: courier.eligible ? '#16a34a' : '#dc2626',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '4px',
                          }}
                        >
                          {courier.eligible ? 'Eligible' : 'Not eligible'}
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        <div>📍 {courier.pickupMiles.toFixed(1)} mi to pickup</div>
                        <div>📦 {courier.jobMiles.toFixed(1)} mi job distance</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Estimated Fee:
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: courier.eligible ? '#16a34a' : '#dc2626' }}>
                          ${courier.estimatedFee.toFixed(2)}
                        </div>
                      </div>

                      {!courier.eligible && courier.reason && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626' }}>
                          {courier.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '12px', color: '#666' }}>
                ℹ️ These are couriers currently online in your pickup area. Fees are estimates and may change when a courier accepts.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

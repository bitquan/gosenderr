'use client';

import { useState, useEffect, FormEvent } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserRole } from '@/hooks/v2/useUserRole';
import { useCourierLocationWriter } from '@/hooks/v2/useCourierLocationWriter';
import { TransportMode } from '@/lib/v2/types';
import { calcFee, calcMiles, estimateMinutes } from '@/lib/v2/pricing';
import { useRouter } from 'next/navigation';

export default function V2CourierSetup() {
  const { uid, userDoc } = useUserRole();
  const { isTracking, permissionDenied } = useCourierLocationWriter();
  const router = useRouter();

  const [transportMode, setTransportMode] = useState<TransportMode>('car');
  const [baseFee, setBaseFee] = useState('5');
  const [perMile, setPerMile] = useState('1.5');
  const [minimumFee, setMinimumFee] = useState('');
  const [pickupPerMile, setPickupPerMile] = useState('');
  const [perMinute, setPerMinute] = useState('');
  const [maxPickupMiles, setMaxPickupMiles] = useState('');
  const [maxJobMiles, setMaxJobMiles] = useState('');
  const [maxRadiusMiles, setMaxRadiusMiles] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current settings
  useEffect(() => {
    if (userDoc?.courier) {
      setTransportMode(userDoc.courier.transportMode);
      setBaseFee(String(userDoc.courier.rateCard.baseFee));
      setPerMile(String(userDoc.courier.rateCard.perMile));
      setMinimumFee(userDoc.courier.rateCard.minimumFee ? String(userDoc.courier.rateCard.minimumFee) : '');
      setPickupPerMile(userDoc.courier.rateCard.pickupPerMile ? String(userDoc.courier.rateCard.pickupPerMile) : '');
      setPerMinute(userDoc.courier.rateCard.perMinute ? String(userDoc.courier.rateCard.perMinute) : '');
      setMaxPickupMiles(userDoc.courier.rateCard.maxPickupMiles ? String(userDoc.courier.rateCard.maxPickupMiles) : '');
      setMaxJobMiles(userDoc.courier.rateCard.maxJobMiles ? String(userDoc.courier.rateCard.maxJobMiles) : '');
      setMaxRadiusMiles(userDoc.courier.rateCard.maxRadiusMiles ? String(userDoc.courier.rateCard.maxRadiusMiles) : '');
      setIsOnline(userDoc.courier.isOnline);
    }
  }, [userDoc]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const rateCard: any = {
        baseFee: parseFloat(baseFee) || 0,
        perMile: parseFloat(perMile) || 0,
      };

      const minimumFeeVal = parseFloat(minimumFee);
      if (minimumFeeVal > 0) rateCard.minimumFee = minimumFeeVal;

      const pickupPerMileVal = parseFloat(pickupPerMile);
      if (pickupPerMileVal > 0) rateCard.pickupPerMile = pickupPerMileVal;

      const perMinVal = parseFloat(perMinute);
      if (perMinVal > 0) rateCard.perMinute = perMinVal;

      const maxPickupVal = parseFloat(maxPickupMiles);
      if (maxPickupVal > 0) rateCard.maxPickupMiles = maxPickupVal;

      const maxJobVal = parseFloat(maxJobMiles);
      if (maxJobVal > 0) rateCard.maxJobMiles = maxJobVal;

      const maxRadiusVal = parseFloat(maxRadiusMiles);
      if (maxRadiusVal > 0) rateCard.maxRadiusMiles = maxRadiusVal;

      await updateDoc(doc(db, 'users', uid), {
        'courier.transportMode': transportMode,
        'courier.rateCard': rateCard,
        'courier.isOnline': isOnline,
        updatedAt: serverTimestamp(),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save courier settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Sample preview calculations
  const getSampleFee = (jobMiles: number, pickupMiles?: number) => {
    const rateCard = {
      baseFee: parseFloat(baseFee) || 0,
      perMile: parseFloat(perMile) || 0,
      minimumFee: parseFloat(minimumFee) || undefined,
      pickupPerMile: parseFloat(pickupPerMile) || undefined,
      perMinute: parseFloat(perMinute) || undefined,
      maxPickupMiles: parseFloat(maxPickupMiles) || undefined,
      maxJobMiles: parseFloat(maxJobMiles) || undefined,
      maxRadiusMiles: parseFloat(maxRadiusMiles) || undefined,
    };

    return calcFee(rateCard, jobMiles, pickupMiles, transportMode).toFixed(2);
  };

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1>Courier Setup</h1>
        <p style={{ color: '#666', marginTop: '10px' }}>
          Configure your delivery settings and flexible pricing
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          {/* Transport Mode */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Transport Mode
            </label>
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value as TransportMode)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              <option value="walk">🚶 Walk (3 mph)</option>
              <option value="scooter">🛴 Scooter (10 mph)</option>
              <option value="car">🚗 Car (25 mph)</option>
            </select>
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>Base Pricing</h3>

          {/* Base Fee */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Base Fee ($) <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
              min="0"
              step="0.50"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Fixed fee charged for every delivery
            </p>
          </div>

          {/* Per Mile Rate */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Per Mile Rate ($) <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              value={perMile}
              onChange={(e) => setPerMile(e.target.value)}
              min="0"
              step="0.25"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Cost per mile from pickup to dropoff
            </p>
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>Additional Charges (Optional)</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Pickup Per Mile */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Pickup Per Mile ($)
              </label>
              <input
                type="number"
                value={pickupPerMile}
                onChange={(e) => setPickupPerMile(e.target.value)}
                min="0"
                step="0.25"
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Extra cost to reach pickup
              </p>
            </div>

            {/* Per Minute Rate */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Per Minute Rate ($)
              </label>
              <input
                type="number"
                value={perMinute}
                onChange={(e) => setPerMinute(e.target.value)}
                min="0"
                step="0.05"
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Time-based pricing
              </p>
            </div>
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>Limits (Optional)</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Minimum Fee */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Minimum Fee ($)
              </label>
              <input
                type="number"
                value={minimumFee}
                onChange={(e) => setMinimumFee(e.target.value)}
                min="0"
                step="0.50"
                placeholder="No minimum"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Max Pickup Miles */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Max Pickup Miles
              </label>
              <input
                type="number"
                value={maxPickupMiles}
                onChange={(e) => setMaxPickupMiles(e.target.value)}
                min="0"
                step="1"
                placeholder="No limit"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Max distance to pickup
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Max Job Miles
            </label>
            <input
              type="number"
              value={maxJobMiles}
              onChange={(e) => setMaxJobMiles(e.target.value)}
              min="0"
              step="1"
              placeholder="No limit"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Max pickup to dropoff distance
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Max Radius Miles
            </label>
            <input
              type="number"
              value={maxRadiusMiles}
              onChange={(e) => setMaxRadiusMiles(e.target.value)}
              min="0"
              step="1"
              placeholder="No limit"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Discovery radius - customers within this distance can see you
            </p>
          </div>

          {/* Online Toggle */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                style={{ marginRight: '12px', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: '600', fontSize: '16px' }}>
                Go Online
              </span>
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginLeft: '30px' }}>
              {isTracking && '🟢 Location tracking active'}
              {permissionDenied && '⚫ Location permission denied'}
              {!isTracking && !permissionDenied && '⚫ Location tracking inactive'}
            </p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: '12px',
              background: saving ? '#ccc' : '#6E56CF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {saveSuccess && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px',
                color: '#166534',
                textAlign: 'center',
              }}
            >
              ✅ Settings saved successfully!
            </div>
          )}
        </form>

        {/* Preview Panel */}
        <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
          <div style={{ padding: '20px', background: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Rate Preview</h3>
            
            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
              <strong>Transport:</strong> {transportMode} ({transportMode === 'walk' ? '3' : transportMode === 'scooter' ? '10' : '25'} mph)
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  1 mile job (no pickup distance)
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a' }}>
                  ${getSampleFee(1)}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  5 mile job (2 mi pickup)
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a' }}>
                  ${getSampleFee(5, 2)}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  10 mile job (3 mi pickup)
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a' }}>
                  ${getSampleFee(10, 3)}
                </div>
              </div>
            </div>

            {(parseFloat(minimumFee) > 0 || parseFloat(maxPickupMiles) > 0 || parseFloat(maxJobMiles) > 0 || parseFloat(maxRadiusMiles) > 0) && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Active Limits:</div>
                {parseFloat(minimumFee) > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    • Minimum fee: ${parseFloat(minimumFee).toFixed(2)}
                  </div>
                )}
                {parseFloat(maxPickupMiles) > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    • Max pickup: {maxPickupMiles} mi
                  </div>
                )}
                {parseFloat(maxJobMiles) > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    • Max job: {maxJobMiles} mi
                  </div>
                )}
                {parseFloat(maxRadiusMiles) > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    • Service radius: {maxRadiusMiles} mi
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

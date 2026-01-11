'use client';

import { useState, useEffect, FormEvent } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useUserRole } from '@/hooks/v2/useUserRole';
import { useCourierLocationWriter } from '@/hooks/v2/useCourierLocationWriter';
import { TransportMode } from '@/lib/v2/types';
import { useRouter } from 'next/navigation';

export default function V2CourierSetup() {
  const { uid, userDoc } = useUserRole();
  const { isTracking, permissionDenied } = useCourierLocationWriter();
  const router = useRouter();

  const [transportMode, setTransportMode] = useState<TransportMode>('car');
  const [baseFee, setBaseFee] = useState('5');
  const [perMile, setPerMile] = useState('1.5');
  const [perMinute, setPerMinute] = useState('0');
  const [minimumFee, setMinimumFee] = useState('');
  const [maximumFee, setMaximumFee] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current settings
  useEffect(() => {
    if (userDoc?.courier) {
      setTransportMode(userDoc.courier.transportMode);
      setBaseFee(String(userDoc.courier.rateCard.baseFee));
      setPerMile(String(userDoc.courier.rateCard.perMile));
      setPerMinute(String(userDoc.courier.rateCard.perMinute || 0));
      setMinimumFee(userDoc.courier.rateCard.minimumFee ? String(userDoc.courier.rateCard.minimumFee) : '');
      setMaximumFee(userDoc.courier.rateCard.maximumFee ? String(userDoc.courier.rateCard.maximumFee) : '');
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

      const perMin = parseFloat(perMinute);
      if (perMin > 0) {
        rateCard.perMinute = perMin;
      }

      const minFee = parseFloat(minimumFee);
      if (minFee > 0) {
        rateCard.minimumFee = minFee;
      }

      const maxFee = parseFloat(maximumFee);
      if (maxFee > 0) {
        rateCard.maximumFee = maxFee;
      }

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

  const calcPreview = (miles: number, minutes?: number) => {
    const base = parseFloat(baseFee) || 0;
    const perMi = parseFloat(perMile) || 0;
    const perMin = parseFloat(perMinute) || 0;
    
    let total = base + (miles * perMi);
    if (minutes && perMin > 0) {
      total += (minutes * perMin);
    }

    const minFee = parseFloat(minimumFee);
    if (minFee > 0 && total < minFee) {
      total = minFee;
    }

    const maxFee = parseFloat(maximumFee);
    if (maxFee > 0 && total > maxFee) {
      total = maxFee;
    }

    return total.toFixed(2);
  };

  return (
    <div style={{ padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1>Courier Setup</h1>
        <p style={{ color: '#666', marginTop: '10px' }}>
          Configure your delivery settings and rates
        </p>
      </div>

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
            <option value="walk">🚶 Walk</option>
            <option value="scooter">🛴 Scooter</option>
            <option value="car">🚗 Car</option>
          </select>
        </div>

        {/* Base Fee */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Base Fee ($)
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
            Fixed fee per delivery
          </p>
        </div>

        {/* Per Mile Rate */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Per Mile Rate ($)
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
            Additional cost per mile traveled
          </p>
        </div>

        {/* Per Minute Rate */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Per Minute Rate ($) <span style={{ color: '#999', fontWeight: 'normal' }}>(optional)</span>
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
            Time-based rate (e.g., $0.25/min for wait time)
          </p>
        </div>

        {/* Fee Limits */}
        <h3 style={{ marginBottom: '16px' }}>Fee Limits</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Maximum Fee ($)
            </label>
            <input
              type="number"
              value={maximumFee}
              onChange={(e) => setMaximumFee(e.target.value)}
              min="0"
              step="1"
              placeholder="No maximum"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Online Toggle */}
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #eee',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isOnline}
              onChange={(e) => setIsOnline(e.target.checked)}
              style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '600', fontSize: '16px' }}>
              {isOnline ? '🟢 Online' : '⚫ Offline'}
            </span>
          </label>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginLeft: '28px' }}>
            {isOnline
              ? 'You are visible to customers and can accept jobs'
              : 'You will not receive job requests'}
          </p>

          {/* Location Tracking Status */}
          {isOnline && (
            <div style={{ marginTop: '12px', marginLeft: '28px' }}>
              {isTracking && (
                <p style={{ fontSize: '12px', color: '#16a34a' }}>
                  📍 Location tracking active
                </p>
              )}
              {permissionDenied && (
                <p style={{ fontSize: '12px', color: '#dc2626' }}>
                  ⚠️ Location permission denied. Please enable location access in your browser settings.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              background: saving ? '#999' : '#6E56CF',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/v2/courier/dashboard')}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#6E56CF',
              border: '1px solid #6E56CF',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
        </div>

        {saveSuccess && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#d1fae5',
              border: '1px solid #6ee7b7',
              borderRadius: '6px',
              color: '#065f46',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            ✓ Settings saved successfully
          </div>
        )}
      </form>

      {/* Rate Preview */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Rate Preview</h3>
        <div style={{ fontSize: '14px', color: '#666' }}>
          <p style={{ margin: '6px 0' }}>
            1 mile delivery: <strong>${calcPreview(1)}</strong>
          </p>
          <p style={{ margin: '6px 0' }}>
            5 mile delivery: <strong>${calcPreview(5)}</strong>
          </p>
          <p style={{ margin: '6px 0' }}>
            10 mile delivery: <strong>${calcPreview(10)}</strong>
          </p>
          {parseFloat(perMinute) > 0 && (
            <p style={{ margin: '6px 0', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
              5 miles + 10 min wait: <strong>${calcPreview(5, 10)}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

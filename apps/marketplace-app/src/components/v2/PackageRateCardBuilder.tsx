
import { useState } from 'react';
import { PackageRateCard } from '@gosenderr/shared';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface PackageRateCardBuilderProps {
  currentRateCard?: PackageRateCard;
  onSave: (rateCard: PackageRateCard) => Promise<void>;
}

export function PackageRateCardBuilder({
  currentRateCard,
  onSave,
}: PackageRateCardBuilderProps) {
  const { settings: platformSettings } = usePlatformSettings();
  const [baseFare, setBaseFare] = useState(
    currentRateCard?.baseFare?.toString() || '8.00'
  );
  const [perMile, setPerMile] = useState(
    currentRateCard?.perMile?.toString() || '2.00'
  );
  const [perMinute, setPerMinute] = useState(
    currentRateCard?.perMinute?.toString() || '0.30'
  );
  const [optionalFees, setOptionalFees] = useState<Array<{ name: string; amount: number }>>(
    currentRateCard?.optionalFees || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Live preview calculation state
  const [previewMiles, setPreviewMiles] = useState('10');
  const [previewMinutes, setPreviewMinutes] = useState('20');

  const handleAddFee = () => {
    setOptionalFees([...optionalFees, { name: '', amount: 0 }]);
  };

  const handleRemoveFee = (index: number) => {
    setOptionalFees(optionalFees.filter((_, i) => i !== index));
  };

  const handleFeeChange = (index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...optionalFees];
    if (field === 'name') {
      updated[index].name = value;
    } else {
      updated[index].amount = parseFloat(value) || 0;
    }
    setOptionalFees(updated);
  };

  const calculatePreview = () => {
    const base = parseFloat(baseFare) || 0;
    const miles = parseFloat(previewMiles) || 0;
    const minutes = parseFloat(previewMinutes) || 0;
    const mileRate = parseFloat(perMile) || 0;
    const minuteRate = parseFloat(perMinute) || 0;

    const baseCharge = base;
    const mileCharge = miles * mileRate;
    const timeCharge = minutes * minuteRate;
    const feesTotal = optionalFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    const courierEarnings = baseCharge + mileCharge + timeCharge + feesTotal;
    const platformFee = platformSettings.platformFeePackage ?? 2.5;
    const customerPays = courierEarnings + platformFee;

    return {
      baseCharge,
      mileCharge,
      timeCharge,
      feesTotal,
      courierEarnings,
      platformFee,
      customerPays,
    };
  };

  const preview = calculatePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const baseFareValue = parseFloat(baseFare);
    const perMileValue = parseFloat(perMile);
    const perMinuteValue = parseFloat(perMinute);

    // Validate minimums
    if (baseFareValue < 3.0) {
      setError('Base fare must be at least $3.00');
      return;
    }
    if (perMileValue < 0.5) {
      setError('Per mile rate must be at least $0.50');
      return;
    }
    if (perMinuteValue < 0.1) {
      setError('Per minute rate must be at least $0.10');
      return;
    }

    // Validate optional fees
    for (const fee of optionalFees) {
      if (!fee.name.trim()) {
        setError('All optional fees must have a name');
        return;
      }
      if (fee.amount <= 0) {
        setError('All optional fees must have a positive amount');
        return;
      }
    }

    const rateCard: PackageRateCard = {
      baseFare: baseFareValue,
      perMile: perMileValue,
      perMinute: perMinuteValue,
      optionalFees: optionalFees.filter(fee => fee.name.trim() && fee.amount > 0),
    };

    setSaving(true);
    try {
      await onSave(rateCard);
    } catch (err) {
      setError('Failed to save rate card. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '600' }}>
        📦 Package Delivery Rate Card
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Base Rates */}
        <div style={{ marginBottom: '24px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Base Rates</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Base Fare (minimum $3.00)
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', fontSize: '18px' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="3.00"
                value={baseFare}
                onChange={(e) => setBaseFare(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '120px',
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Per Mile (minimum $0.50)
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', fontSize: '18px' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0.50"
                value={perMile}
                onChange={(e) => setPerMile(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '120px',
                }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Per Minute (minimum $0.10)
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', fontSize: '18px' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0.10"
                value={perMinute}
                onChange={(e) => setPerMinute(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '120px',
                }}
                required
              />
            </div>
          </div>
        </div>

        {/* Optional Fees */}
        <div style={{ marginBottom: '24px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Optional Fees</h3>
            <button
              type="button"
              onClick={handleAddFee}
              style={{
                padding: '8px 16px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              + Add Fee
            </button>
          </div>

          {optionalFees.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              No optional fees yet. Add fees for special services like heavy items, stairs, etc.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {optionalFees.map((fee, index) => (
                <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Fee name (e.g., Heavy Item)"
                    value={fee.name}
                    onChange={(e) => handleFeeChange(index, 'name', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', width: '140px' }}>
                    <span style={{ marginRight: '8px' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={fee.amount || ''}
                      onChange={(e) => handleFeeChange(index, 'amount', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFee(index)}
                    style={{
                      padding: '10px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div style={{ marginBottom: '24px', padding: '20px', background: '#fef3c7', borderRadius: '8px', border: '2px solid #fbbf24' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>💰 Live Earnings Preview</h3>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Example Miles
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={previewMiles}
                onChange={(e) => setPreviewMiles(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Example Minutes
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={previewMinutes}
                onChange={(e) => setPreviewMinutes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ background: 'white', padding: '16px', borderRadius: '6px', fontSize: '14px' }}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Base:</span>
              <span style={{ fontWeight: '600' }}>${preview.baseCharge.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Miles: {previewMiles} × ${perMile}</span>
              <span style={{ fontWeight: '600' }}>${preview.mileCharge.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Time: {previewMinutes} × ${perMinute}</span>
              <span style={{ fontWeight: '600' }}>${preview.timeCharge.toFixed(2)}</span>
            </div>
            {preview.feesTotal > 0 && (
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Optional Fees:</span>
                <span style={{ fontWeight: '600' }}>+${preview.feesTotal.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                <span style={{ fontWeight: '700', color: '#059669' }}>You Earn:</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>${preview.courierEarnings.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '13px' }}>
                <span>Customer Pays:</span>
                <span>${preview.customerPays.toFixed(2)} (+ ${preview.platformFee.toFixed(2)} platform fee)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            background: saving ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Rate Card'}
        </button>
      </form>
    </div>
  );
}

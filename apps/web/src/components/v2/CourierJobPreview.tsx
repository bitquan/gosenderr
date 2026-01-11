'use client';

import { Job, RateCard, TransportMode } from '@/lib/v2/types';
import { calcMiles, calcFee } from '@/lib/v2/pricing';
import { getEligibilityReason } from '@/lib/v2/eligibility';

interface CourierJobPreviewProps {
  job: Job;
  rateCard: RateCard;
  courierLocation?: { lat: number; lng: number } | null;
  transportMode: TransportMode;
  onAccept: (jobId: string, fee: number) => void;
  loading?: boolean;
}

export function CourierJobPreview({
  job,
  rateCard,
  courierLocation,
  transportMode,
  onAccept,
  loading = false,
}: CourierJobPreviewProps) {
  const jobMiles = calcMiles(job.pickup, job.dropoff);
  const pickupMiles = courierLocation ? calcMiles(courierLocation, job.pickup) : undefined;
  
  const eligibilityResult = pickupMiles !== undefined 
    ? getEligibilityReason(rateCard, jobMiles, pickupMiles)
    : { eligible: true };
  
  const eligible = eligibilityResult.eligible;
  const reason = eligibilityResult.reason;
  const fee = calcFee(rateCard, jobMiles, pickupMiles, transportMode);

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        border: eligible ? '1px solid #ddd' : '2px solid #dc2626',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Job Preview</h3>

      {!eligible && (
        <div style={{ 
          padding: '12px', 
          background: '#fee2e2', 
          border: '1px solid #fca5a5', 
          borderRadius: '6px', 
          marginBottom: '16px', 
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
            ⚠️ Not Eligible
          </div>
          {reason && (
            <div style={{ fontSize: '12px', color: '#991b1b' }}>
              {reason}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>📍 Pickup:</strong>
          <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
          </div>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>📍 Dropoff:</strong>
          <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '16px',
        }}
      >
        {pickupMiles !== undefined && (
          <div style={{ marginBottom: '8px', fontSize: '14px' }}>
            <strong>Distance to Pickup:</strong> {pickupMiles.toFixed(2)} mi
          </div>
        )}
        <div style={{ marginBottom: '8px', fontSize: '14px' }}>
          <strong>Job Distance:</strong> {jobMiles.toFixed(2)} mi
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          ${rateCard.baseFee.toFixed(2)} base + ${rateCard.perMile.toFixed(2)}/mi
          {rateCard.pickupPerMile && <span> + ${rateCard.pickupPerMile.toFixed(2)}/mi pickup</span>}
          {rateCard.perMinute && <span> + ${rateCard.perMinute.toFixed(2)}/min</span>}
        </div>
        {rateCard.minimumFee && (
          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
            Minimum: ${rateCard.minimumFee.toFixed(2)}
          </div>
        )}
        <div style={{ marginTop: '12px', fontSize: '20px', fontWeight: '600', color: '#16a34a' }}>
          ${fee.toFixed(2)}
        </div>
      </div>

      <button
        onClick={() => onAccept(job.id, fee)}
        disabled={loading || !eligible}
        title={!eligible ? 'You are not eligible for this job' : ''}
        style={{
          width: '100%',
          padding: '12px',
          background: loading || !eligible ? '#ccc' : '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading || !eligible ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Accepting...' : !eligible ? 'Cannot Accept' : 'Accept Job'}
      </button>
    </div>
  );
}

'use client';

import { calcMiles, calcFee } from '@/lib/v2/pricing';
import { getEligibilityReason } from '@/lib/v2/eligibility';
import { Job as LibJob, RateCard, TransportMode } from '@/lib/v2/types';
import { JobDetailsPanel } from '@/features/jobs/shared/JobDetailsPanel';
import { Job, JobViewer } from '@/features/jobs/shared/types';
import { getJobVisibility } from '@/features/jobs/shared/privacy';

interface CourierJobPreviewProps {
  job: LibJob;
  rateCard: RateCard;
  courierLocation?: { lat: number; lng: number } | null;
  transportMode: TransportMode;
  onAccept: (jobId: string, fee: number) => void;
  loading?: boolean;
}

// Convert lib Job to features Job (they're compatible)
function convertJob(libJob: LibJob): Job {
  return libJob as unknown as Job;
}

export function CourierJobPreview({
  job: libJob,
  rateCard,
  courierLocation,
  transportMode,
  onAccept,
  loading = false,
}: CourierJobPreviewProps) {
  const job = convertJob(libJob);
  const jobMiles = calcMiles(job.pickup, job.dropoff);
  const pickupMiles = courierLocation ? calcMiles(courierLocation, job.pickup) : undefined;
  
  const eligibilityResult = pickupMiles !== undefined 
    ? getEligibilityReason(rateCard, jobMiles, pickupMiles)
    : { eligible: true };
  
  const eligible = eligibilityResult.eligible;
  const reason = eligibilityResult.reason;
  const fee = calcFee(rateCard, jobMiles, pickupMiles, transportMode);

  // Courier viewing open job gets limited visibility
  const viewer: JobViewer = { uid: 'courier-preview', role: 'courier' };
  const visibility = getJobVisibility(job, viewer);

  return (
    <div>
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

      <JobDetailsPanel job={job} visibility={visibility} showStatus={false}>
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
      </JobDetailsPanel>
    </div>
  );
}

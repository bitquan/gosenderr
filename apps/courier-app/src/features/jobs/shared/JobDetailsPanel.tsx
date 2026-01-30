
import { Job, JobVisibility } from '../shared/types';
import { AddressBlock } from './AddressBlock';
import { PackageDetailsPanel } from './PackageDetailsPanel';
import { JobStatusPills } from './JobStatusPills';
import { formatCurrency, formatDate } from '@/lib/utils';

interface JobDetailsPanelProps {
  job: Job;
  visibility: JobVisibility;
  showStatus?: boolean;
  id?: string;
  children?: React.ReactNode; // For role-specific action buttons
}

export function JobDetailsPanel({ job, visibility, showStatus = true, id, children }: JobDetailsPanelProps) {
  return (
    <div
      id={id}
      style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Status */}
      {showStatus && (
        <div style={{ marginBottom: '16px' }}>
          <JobStatusPills status={job.status} />
        </div>
      )}

      {/* Pricing */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Price</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>
            {job.agreedFee ? formatCurrency(job.agreedFee) : (job as any).estimatedFee ? formatCurrency((job as any).estimatedFee) : '—'}
          </div>
        </div>
        {job.agreedFee && (
          <div style={{ fontSize: '12px', color: '#666' }}>Agreed Fee</div>
        )}
      </div>

      {/* Addresses */}
      <div style={{ marginBottom: '16px' }}>
        <AddressBlock
          label="Pickup"
          location={job.pickup}
          canSeeExact={visibility.canSeeExactAddresses}
        />
        <AddressBlock
          label="Dropoff"
          location={job.dropoff}
          canSeeExact={visibility.canSeeExactAddresses}
        />
      </div>

      {/* Package Details */}
      <div style={{ marginBottom: '16px' }}>
        <PackageDetailsPanel
          package={job.package || null}
          photos={job.photos || null}
          canSeePhotos={visibility.canSeePhotos}
        />
      </div>

      {/* Courier Info (if assigned) */}
      {job.courierSnapshot && job.courierUid && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>🚗 Courier:</strong>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {job.courierSnapshot.displayName || 'Courier'}
            {job.courierSnapshot.transportMode && (
              <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>
                ({job.courierSnapshot.transportMode})
              </span>
            )}
          </div>
          {job.agreedFee && (
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              <strong>Agreed Fee:</strong> ${job.agreedFee.toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Role-specific actions */}
      {children && <div style={{ marginTop: '16px' }}>{children}</div>}
    </div>
  );
}

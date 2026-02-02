
import { Job, JobVisibility } from '../shared/types';
import { AddressBlock } from './AddressBlock';
import { PackageDetailsPanel } from './PackageDetailsPanel';
import { JobStatusPills } from './JobStatusPills';

interface JobDetailsPanelProps {
  job: Job;
  visibility: JobVisibility;
  showStatus?: boolean;
  children?: React.ReactNode; // For role-specific action buttons
}

export function JobDetailsPanel({ job, visibility, showStatus = true, children }: JobDetailsPanelProps) {
  const effectiveStatus = (job as any).statusDetail ?? job.status;

  return (
    <div
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
          <JobStatusPills status={effectiveStatus} />
        </div>
      )}

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

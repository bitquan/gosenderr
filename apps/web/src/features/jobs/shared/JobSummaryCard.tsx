'use client';

import { Job } from '../shared/types';
import { PackageBadges } from './PackageBadges';
import { JobStatusPills } from './JobStatusPills';
import { getDisplayAddress } from '../shared/privacy';

interface JobSummaryCardProps {
  job: Job;
  canSeeExactAddresses: boolean;
  onClick?: () => void;
}

export function JobSummaryCard({ job, canSeeExactAddresses, onClick }: JobSummaryCardProps) {
  const pickupAddress = getDisplayAddress(
    job.pickup.label,
    job.pickup.lat,
    job.pickup.lng,
    canSeeExactAddresses
  );

  const dropoffAddress = getDisplayAddress(
    job.dropoff.label,
    job.dropoff.lat,
    job.dropoff.lng,
    canSeeExactAddresses
  );

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <JobStatusPills status={job.status} />
        {job.agreedFee && (
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>
            ${job.agreedFee.toFixed(2)}
          </div>
        )}
      </div>

      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>📍 Pickup:</strong> {pickupAddress}
        </div>
        <div>
          <strong>📍 Dropoff:</strong> {dropoffAddress}
        </div>
      </div>

      {/* Package Details */}
      {(() => {
        // Normalize package data for safe rendering
        const pkg = job.package ?? {
          size: undefined,
          flags: {},
          notes: undefined,
        };
        const photos = job.photos ?? [];

        return (
          <>
            {(pkg.size || Object.keys(pkg.flags || {}).length > 0) && (
              <div style={{ marginTop: '12px' }}>
                <PackageBadges size={pkg.size} flags={pkg.flags} showNotes={false} />
              </div>
            )}

            {photos.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                📷 {photos.length} photo{photos.length > 1 ? 's' : ''}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

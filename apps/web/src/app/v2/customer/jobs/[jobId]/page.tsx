'use client';

import { useParams } from 'next/navigation';
import { useJob } from '@/hooks/v2/useJob';
import { useCourierById } from '@/hooks/v2/useCourierById';
import { JobStatusPill } from '@/components/v2/JobStatusPill';
import { StatusTimeline } from '@/components/v2/StatusTimeline';
import { MapboxMap } from '@/components/v2/MapboxMap';
import Link from 'next/link';

export default function CustomerJobDetail() {
  const params = useParams();
  const jobId = params?.jobId as string;
  const { job, loading: jobLoading } = useJob(jobId);
  const { courier } = useCourierById(job?.courierUid || null);

  if (jobLoading) {
    return (
      <div style={{ padding: '30px' }}>
        <p>Loading job...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: '30px' }}>
        <p>Job not found</p>
        <Link href="/v2/customer/jobs" style={{ color: '#6E56CF' }}>
          ← Back to My Jobs
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/v2/customer/jobs" style={{ color: '#6E56CF', textDecoration: 'none' }}>
          ← Back to My Jobs
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Job Details</h1>
          <div style={{ color: '#666', fontSize: '14px' }}>
            Created: {job.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
          </div>
        </div>
        <JobStatusPill status={job.status} />
      </div>

      {/* Status Timeline */}
      <div style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
        <StatusTimeline currentStatus={job.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div>
          <h3>Locations</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <strong>📍 Pickup</strong>
              <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
              </div>
            </div>
            <div>
              <strong>📍 Dropoff</strong>
              <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3>Job Info</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {job.agreedFee && (
              <div>
                <strong>Delivery Fee</strong>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#16a34a', marginTop: '4px' }}>
                  ${job.agreedFee.toFixed(2)}
                </div>
              </div>
            )}
            {job.courierUid ? (
              <div>
                <strong>Courier</strong>
                <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  {courier?.courier?.isOnline ? (
                    <span style={{ color: '#16a34a' }}>🟢 Online & Assigned</span>
                  ) : (
                    <span style={{ color: '#666' }}>⚫ Assigned</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <strong>Status</strong>
                <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  Waiting for courier to accept...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3>Live Map</h3>
        <MapboxMap
          pickup={job.pickup}
          dropoff={job.dropoff}
          courierLocation={courier?.location || null}
          height="500px"
        />
        {job.courierUid && !courier?.location && (
          <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
            Waiting for courier location updates...
          </p>
        )}
      </div>
    </div>
  );
}

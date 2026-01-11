'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useJob } from '@/hooks/v2/useJob';
import { useUserDoc } from '@/hooks/v2/useUserDoc';
import { JobStatusPill } from '@/components/v2/JobStatusPill';
import { StatusTimeline } from '@/components/v2/StatusTimeline';
import { MapboxMap } from '@/components/v2/MapboxMap';
import { updateJobStatus } from '@/lib/v2/jobs';
import { JobStatus } from '@/lib/v2/types';
import Link from 'next/link';

const statusFlow: Record<JobStatus, JobStatus | null> = {
  open: null,
  assigned: 'enroute_pickup',
  enroute_pickup: 'picked_up',
  picked_up: 'enroute_dropoff',
  enroute_dropoff: 'delivered',
  delivered: null,
  cancelled: null,
};

const statusButtons: Record<JobStatus, string> = {
  assigned: 'Start Pickup',
  enroute_pickup: 'Mark Picked Up',
  picked_up: 'Start Delivery',
  enroute_dropoff: 'Mark Delivered',
  delivered: '',
  open: '',
  cancelled: '',
};

export default function CourierJobDetail() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;
  const { uid } = useAuthUser();
  const { job, loading: jobLoading } = useJob(jobId);
  const { userDoc } = useUserDoc();
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!job) return;
    const nextStatus = statusFlow[job.status];
    if (!nextStatus) return;

    setUpdating(true);
    try {
      await updateJobStatus(jobId, nextStatus);
      if (nextStatus === 'delivered') {
        // Redirect to dashboard after delivery
        setTimeout(() => router.push('/v2/courier/dashboard'), 1000);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

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
        <Link href="/v2/courier/dashboard" style={{ color: '#6E56CF' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (job.courierUid !== uid) {
    return (
      <div style={{ padding: '30px' }}>
        <p>This is not your job</p>
        <Link href="/v2/courier/dashboard" style={{ color: '#6E56CF' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const nextStatus = statusFlow[job.status];
  const pickupGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.pickup.lat},${job.pickup.lng}`;
  const dropoffGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.dropoff.lat},${job.dropoff.lng}`;

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/v2/courier/dashboard" style={{ color: '#6E56CF', textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Active Job</h1>
          <div style={{ color: '#666', fontSize: '14px' }}>
            Accepted: {job.updatedAt?.toDate?.()?.toLocaleString() || 'Just now'}
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
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong>📍 Pickup</strong>
                <a
                  href={pickupGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#6E56CF',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    background: '#f0f0ff',
                    borderRadius: '4px',
                  }}
                >
                  Navigate 🗺️
                </a>
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong>📍 Dropoff</strong>
                <a
                  href={dropoffGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#6E56CF',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    background: '#f0f0ff',
                    borderRadius: '4px',
                  }}
                >
                  Navigate 🗺️
                </a>
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3>Job Info</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <strong>Delivery Fee</strong>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a', marginTop: '4px' }}>
                ${job.agreedFee?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {nextStatus && (
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: updating ? '#ccc' : '#6E56CF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: updating ? 'not-allowed' : 'pointer',
                }}
              >
                {updating ? 'Updating...' : statusButtons[job.status]}
              </button>
            </div>
          )}

          {job.status === 'delivered' && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                color: '#166534',
                textAlign: 'center',
              }}
            >
              ✅ Job completed!
            </div>
          )}
        </div>
      </div>

      <div>
        <h3>Live Map</h3>
        <MapboxMap
          pickup={job.pickup}
          dropoff={job.dropoff}
          courierLocation={userDoc?.location || null}
          height="500px"
        />
        {!userDoc?.location && (
          <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
            Your location will appear when you're online
          </p>
        )}
      </div>
    </div>
  );
}

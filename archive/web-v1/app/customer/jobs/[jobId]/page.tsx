'use client';

import { useJob } from '@/hooks/useJob';
import { MapboxMap } from '@/components/MapboxMap';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { job, loading, error } = useJob(jobId);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'red' }}>Error loading job: {error?.toString() || 'Job not found'}</p>
        <Link href="/customer/jobs">
          <button style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}>Back to Jobs</button>
        </Link>
      </div>
    );
  }

  // Determine status color
  const getStatusColor = (status: string) => {
    if (status === 'completed') return '#4caf50';
    if (status === 'open' || status === 'idle') return '#ff9800';
    return '#2196f3';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/customer/jobs">
          <button style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd' }}>
            ← Back to Jobs
          </button>
        </Link>
      </div>

      <h1 style={{ marginBottom: '10px' }}>Job Details</h1>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
        🔴 Live • Updates automatically when job status changes
      </p>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <div style={{ marginBottom: '15px' }}>
          <strong>Status:</strong>{' '}
          <span
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '16px',
              background: getStatusColor(job.status),
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              marginLeft: '8px',
            }}
          >
            {job.status}
          </span>
        </div>

        <p style={{ marginBottom: '10px', color: '#555' }}>
          <strong>Job ID:</strong> {jobId}
        </p>

        <p style={{ marginBottom: '10px', color: '#555' }}>
          <strong>Created:</strong> {job.createdAt?.toDate().toLocaleString()}
        </p>

        {job.assignedDriverUid && (
          <p style={{ marginBottom: '10px', color: '#555' }}>
            <strong>Driver ID:</strong> {job.assignedDriverUid}
          </p>
        )}

        {job.updatedAt && (
          <p style={{ marginBottom: '10px', color: '#555' }}>
            <strong>Last Updated:</strong> {job.updatedAt.toDate().toLocaleString()}
          </p>
        )}

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            📍 Pickup Location
          </h3>
          <p style={{ marginLeft: '24px', color: '#333' }}>
            {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
          </p>
        </div>

        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            🎯 Dropoff Location
          </h3>
          <p style={{ marginLeft: '24px', color: '#333' }}>
            {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
          </p>
        </div>

        {job.pickupPhotoUrl && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>📷 Pickup Photo</h3>
            <img
              src={job.pickupPhotoUrl}
              alt="Pickup"
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginLeft: '24px', border: '1px solid #ddd' }}
            />
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>🗺️ Map View</h2>
      <MapboxMap
        pickup={job.pickup}
        dropoff={job.dropoff}
        driverLocation={job.driverLocation}
      />
    </div>
  );
}

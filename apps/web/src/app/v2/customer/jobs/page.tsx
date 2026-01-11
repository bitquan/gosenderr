'use client';

import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useMyJobs } from '@/hooks/v2/useMyJobs';
import { JobStatusPill } from '@/components/v2/JobStatusPill';
import Link from 'next/link';

export default function CustomerJobs() {
  const { uid } = useAuthUser();
  const { jobs, loading } = useMyJobs(uid || null);

  if (loading) {
    return (
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0 }}>My Jobs</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>My Jobs</h1>
        <Link
          href="/v2/customer/jobs/new"
          style={{
            padding: '10px 20px',
            background: '#6E56CF',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}
        >
          + Create New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No jobs yet. Create your first delivery job!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/v2/customer/jobs/${job.id}`}
              style={{
                display: 'block',
                padding: '20px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    {job.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                  </div>
                  <JobStatusPill status={job.status} />
                </div>
                {job.agreedFee && (
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#16a34a' }}>
                    ${job.agreedFee.toFixed(2)}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div>
                  <strong>📍 Pickup:</strong>{' '}
                  <span style={{ color: '#666' }}>
                    {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
                  </span>
                </div>
                <div>
                  <strong>📍 Dropoff:</strong>{' '}
                  <span style={{ color: '#666' }}>
                    {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

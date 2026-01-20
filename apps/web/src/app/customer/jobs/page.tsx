'use client';

import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useCustomerJobs } from '@/hooks/v2/useCustomerJobs';
import { JobSummaryCard } from '@/features/jobs/shared/JobSummaryCard';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerJobs() {
  const router = useRouter();
  const { uid } = useAuthUser();
  const { jobs, loading } = useCustomerJobs(uid || null);

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
          href="/customer/jobs/new"
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
            <JobSummaryCard
              key={job.id}
              job={job}
              canSeeExactAddresses={true}
              onClick={() => router.push(`/customer/jobs/${job.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

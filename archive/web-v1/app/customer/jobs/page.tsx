'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useJobs } from '@/hooks/useJobs';
import Link from 'next/link';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

export default function CustomerJobsPage() {
  const { user } = useAuthUser();
  const { jobs, loading, error } = useJobs(user?.uid);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'red' }}>Error loading jobs: {error.message}</p>
        {error.message.includes('index') && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
            <strong>Firestore Index Required:</strong>
            <p>Create composite index: collection=jobs, fields: createdByUid(Ascending), createdAt(Descending)</p>
            <p>Firebase Console → Firestore → Indexes</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>My Jobs</h1>
        <button onClick={handleSignOut} style={{ padding: '8px 16px' }}>
          Sign Out
        </button>
      </div>

      <Link href="/customer/jobs/new">
        <button style={{ padding: '10px 20px', marginBottom: '20px', fontSize: '16px' }}>
          + Create New Job
        </button>
      </Link>

      {jobs.length === 0 ? (
        <p style={{ color: '#666' }}>No jobs yet. Create your first delivery job!</p>
      ) : (
        <div>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/customer/jobs/${job.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  marginBottom: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  background: 'white',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>Job {job.id.substring(0, 8)}</strong>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: job.status === 'completed' ? '#4caf50' : job.status === 'open' ? '#ff9800' : '#2196f3',
                      color: 'white',
                    }}
                  >
                    {job.status}
                  </span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Pickup:</strong> {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Dropoff:</strong> {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
                </p>
                {job.assignedDriverUid && (
                  <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                    Driver: {job.assignedDriverUid.substring(0, 8)}...
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

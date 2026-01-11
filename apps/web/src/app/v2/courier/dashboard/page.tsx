'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserDoc } from '@/hooks/v2/useUserDoc';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useOpenJobs } from '@/hooks/v2/useOpenJobs';
import { CourierJobPreview } from '@/components/v2/CourierJobPreview';
import { MapboxMap } from '@/components/v2/MapboxMap';
import { claimJob } from '@/lib/v2/jobs';
import { Job } from '@/lib/v2/types';

export default function CourierDashboard() {
  const router = useRouter();
  const { uid } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const { jobs, loading: jobsLoading } = useOpenJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Redirect to setup if rate card not configured
  useEffect(() => {
    if (!userLoading && userDoc && !userDoc.courier?.rateCard) {
      router.push('/v2/courier/setup');
    }
  }, [userLoading, userDoc, router]);

  // Auto-select first job when jobs load
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs, selectedJob]);

  const handleAcceptJob = async (jobId: string, fee: number) => {
    if (!uid) return;

    setClaiming(true);
    try {
      await claimJob(jobId, uid, fee);
      router.push(`/v2/courier/jobs/${jobId}`);
    } catch (error: any) {
      console.error('Failed to claim job:', error);
      alert(error.message || 'Failed to claim job. It may have been claimed by another courier.');
      setClaiming(false);
      setSelectedJob(null);
    }
  };

  if (userLoading || jobsLoading) {
    return (
      <div style={{ padding: '30px' }}>
        <h1>Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userDoc?.courier?.rateCard) {
    return (
      <div style={{ padding: '30px' }}>
        <h1>Dashboard</h1>
        <p>Setting up...</p>
      </div>
    );
  }

  const rateCard = userDoc.courier.rateCard;

  return (
    <div style={{ padding: '30px' }}>
      <h1 style={{ marginBottom: '30px' }}>Available Jobs</h1>

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No open jobs available right now.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Check back soon or make sure you're online in your setup.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          {/* Left Column: Map + Jobs List */}
          <div>
            {/* Map */}
            {selectedJob && (
              <div style={{ marginBottom: '24px' }}>
                <MapboxMap
                  pickup={selectedJob.pickup}
                  dropoff={selectedJob.dropoff}
                  courierLocation={userDoc?.location || null}
                  height="400px"
                />
              </div>
            )}

            {/* Jobs List */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    padding: '20px',
                    background: selectedJob?.id === job.id ? '#f0f0ff' : 'white',
                    border: selectedJob?.id === job.id ? '2px solid #6E56CF' : '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedJob?.id !== job.id) {
                      e.currentTarget.style.background = '#f9f9f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedJob?.id !== job.id) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    Posted: {job.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
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
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Job Preview */}
          {selectedJob && (
            <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
              <CourierJobPreview
                job={selectedJob}
                rateCard={rateCard}
                courierLocation={userDoc?.location || null}
                transportMode={userDoc.courier.transportMode}
                onAccept={handleAcceptJob}
                loading={claiming}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

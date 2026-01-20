'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUserDoc } from '@/hooks/v2/useUserDoc';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useOpenJobs } from '@/hooks/v2/useOpenJobs';
import { CourierJobPreview } from '@/components/v2/CourierJobPreview';
import { MapboxMap } from '@/components/v2/MapboxMap';
import { claimJob } from '@/lib/v2/jobs';
import { Job } from '@/lib/v2/types';
import { calcMiles } from '@/lib/v2/pricing';
import { getEligibilityReason } from '@/lib/v2/eligibility';

export default function CourierDashboard() {
  const router = useRouter();
  const { uid } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const { jobs, loading: jobsLoading } = useOpenJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [hideIneligible, setHideIneligible] = useState(true);

  // Compute job eligibility for each job
  const jobsWithEligibility = useMemo(() => {
    if (!userDoc?.location || !userDoc?.courier?.rateCard) {
      return jobs.map(job => {
        const jobMiles = calcMiles(job.pickup, job.dropoff);
        return { 
          job, 
          eligible: true, 
          reason: undefined,
          pickupMiles: undefined,
          jobMiles,
        };
      });
    }

    const courierLocation = userDoc.location;
    const rateCard = userDoc.courier.rateCard;

    return jobs.map(job => {
      const pickupMiles = calcMiles(courierLocation, job.pickup);
      const jobMiles = calcMiles(job.pickup, job.dropoff);
      const eligibilityResult = getEligibilityReason(rateCard, jobMiles, pickupMiles);

      return {
        job,
        eligible: eligibilityResult.eligible,
        reason: eligibilityResult.reason,
        pickupMiles,
        jobMiles,
      };
    });
  }, [jobs, userDoc]);

  // Filter jobs based on toggle
  const filteredJobs = useMemo(() => {
    if (!hideIneligible) {
      return jobsWithEligibility;
    }
    return jobsWithEligibility.filter(item => item.eligible);
  }, [jobsWithEligibility, hideIneligible]);

  // Redirect to setup if rate card not configured
  useEffect(() => {
    if (!userLoading && userDoc && !userDoc.courier?.rateCard) {
      router.push('/courier/setup');
    }
  }, [userLoading, userDoc, router]);

  // Auto-select first job when jobs load
  useEffect(() => {
    if (filteredJobs.length > 0 && !selectedJob) {
      setSelectedJob(filteredJobs[0].job);
    } else if (filteredJobs.length === 0) {
      setSelectedJob(null);
    }
  }, [filteredJobs, selectedJob]);

  const handleAcceptJob = async (jobId: string, fee: number) => {
    if (!uid) return;

    setClaiming(true);
    try {
      await claimJob(jobId, uid, fee);
      router.push(`/courier/jobs/${jobId}`);
    } catch (error: any) {
      console.error('Failed to claim job:', error);
      
      // Show specific error message for eligibility failures
      if (error.message?.includes('not-eligible')) {
        alert('You are not eligible for this job. It may exceed your distance limits.');
      } else {
        alert(error.message || 'Failed to claim job. It may have been claimed by another courier.');
      }
      
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Available Jobs</h1>
        
        {/* Filter Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={hideIneligible}
            onChange={(e) => setHideIneligible(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>Hide ineligible jobs</span>
        </label>
      </div>

      {filteredJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {jobsWithEligibility.length === 0 ? (
            <>
              <p>No open jobs available right now.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Check back soon or make sure you're online in your setup.
              </p>
            </>
          ) : (
            <>
              <p>All available jobs are outside your service area.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                <button
                  onClick={() => setHideIneligible(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#6E56CF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Show all jobs
                </button>
              </p>
            </>
          )}
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
              {filteredJobs.map(({ job, eligible, reason, pickupMiles, jobMiles }) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    padding: '20px',
                    background: selectedJob?.id === job.id ? '#f0f0ff' : 'white',
                    border: selectedJob?.id === job.id 
                      ? '2px solid #6E56CF' 
                      : eligible 
                        ? '1px solid #ddd' 
                        : '2px solid #dc2626',
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
                  {/* Eligibility Badge */}
                  {!eligible && (
                    <div style={{ 
                      marginBottom: '12px', 
                      padding: '6px 10px', 
                      background: '#fee2e2', 
                      border: '1px solid #fecaca', 
                      borderRadius: '4px',
                      display: 'inline-block',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', marginBottom: '2px' }}>
                        ⚠️ Not eligible
                      </div>
                      {reason && (
                        <div style={{ fontSize: '10px', color: '#991b1b' }}>
                          {reason}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    Posted: {job.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div>
                      <strong>📍 Pickup:</strong>{' '}
                      <span style={{ color: '#666' }}>
                        {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
                      </span>
                      {pickupMiles && (
                        <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                          ({pickupMiles.toFixed(1)} mi away)
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>📍 Dropoff:</strong>{' '}
                      <span style={{ color: '#666' }}>
                        {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
                      </span>
                      {jobMiles && (
                        <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                          ({jobMiles.toFixed(1)} mi trip)
                        </span>
                      )}
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

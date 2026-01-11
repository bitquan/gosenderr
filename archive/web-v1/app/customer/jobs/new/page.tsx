'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/useAuthUser';
import { createJob } from '@/lib/firebase/firestore';
import { JobForm } from '@/components/JobForm';

export default function NewJobPage() {
  const { user } = useAuthUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    pickup: { lat: number; lng: number; label?: string };
    dropoff: { lat: number; lng: number; label?: string };
  }) => {
    if (!user) return;

    setLoading(true);
    try {
      const jobId = await createJob(user.uid, data.pickup, data.dropoff);
      router.push(`/customer/jobs/${jobId}`);
    } catch (error) {
      console.error('Failed to create job:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Create New Job</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Enter pickup and dropoff coordinates for your delivery
      </p>
      <JobForm onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
    </div>
  );
}

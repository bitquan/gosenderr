
import { Job } from '../shared/types';
import { cancelJob } from '@/lib/v2/jobs';

interface CustomerJobActionsProps {
  job: Job;
  uid: string;
  onJobUpdated?: () => void;
}

export function CustomerJobActions({ job, uid, onJobUpdated }: CustomerJobActionsProps) {
  const canCancel = job.status === 'open' || job.status === 'assigned';

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this job?')) {
      return;
    }

    try {
      await cancelJob(job.id, uid);
      alert('Job cancelled successfully');
      onJobUpdated?.();
    } catch (error) {
      console.error('Failed to cancel job:', error);
      alert('Failed to cancel job. Please try again.');
    }
  };

  if (!canCancel) {
    return null;
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        style={{
          width: '100%',
          padding: '12px',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Cancel Job
      </button>
    </div>
  );
}

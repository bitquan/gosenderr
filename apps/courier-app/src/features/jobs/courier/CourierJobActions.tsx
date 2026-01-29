
import { Job } from '../shared/types';
import { claimJob, updateJobStatus } from '@/lib/v2/jobs';
import type { JobStatus } from '../shared/types';

interface CourierJobActionsProps {
  job: Job;
  courierUid: string;
  estimatedFee?: number;
  onJobUpdated?: () => void;
}

export function CourierJobActions({ job, courierUid, estimatedFee, onJobUpdated }: CourierJobActionsProps) {
  const isAssignedToCourier = job.courierUid === courierUid;
  const canAccept = job.status === 'open' && !job.courierUid;
  
  // Define valid status transitions for courier
  const getNextStatus = (currentStatus: JobStatus): JobStatus | null => {
    const transitions: Record<JobStatus, JobStatus | null> = {
      open: null,
      assigned: 'enroute_pickup',
      enroute_pickup: 'arrived_pickup',
      arrived_pickup: 'picked_up',
      picked_up: 'enroute_dropoff',
      enroute_dropoff: 'arrived_dropoff',
      arrived_dropoff: 'completed',
      completed: null,
      cancelled: null,
      disputed: null,
      expired: null,
      failed: null,
    };
    return transitions[currentStatus];
  };

  const nextStatus = isAssignedToCourier ? getNextStatus(job.status) : null;

  const handleAccept = async () => {
    if (!estimatedFee) {
      alert('Cannot accept job: no fee calculated');
      return;
    }

    try {
      await claimJob(job.id, courierUid, estimatedFee);
      alert('Job accepted successfully!');
      onJobUpdated?.();
    } catch (error) {
      console.error('Failed to accept job:', error);
      alert('Failed to accept job. It may have been claimed by another courier.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    try {
      await updateJobStatus(job.id, nextStatus);
      onJobUpdated?.();
    } catch (error) {
      console.error('Failed to update job status:', error);
      alert('Failed to update job status. Please try again.');
    }
  };

  if (canAccept) {
    return (
      <button
        onClick={handleAccept}
        className="w-full py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all"
      >
        Accept Job {estimatedFee && `- $${estimatedFee.toFixed(2)}`}
      </button>
    );
  }

  if (nextStatus) {
    const statusLabels: Record<JobStatus, string> = {
      open: 'Open',
      assigned: '▶️ Start Heading to Pickup',
      enroute_pickup: '📍 Mark Arrived at Pickup',
      arrived_pickup: '📦 Mark Package Picked Up',
      picked_up: '🚗 Start Heading to Dropoff',
      enroute_dropoff: '🎯 Mark Arrived at Dropoff',
      arrived_dropoff: '✅ Mark Completed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      disputed: 'Disputed',
      expired: 'Expired',
      failed: 'Failed',
    };

    const buttonColors: Record<JobStatus, string> = {
      open: 'bg-gray-500',
      assigned: 'bg-blue-600',
      enroute_pickup: 'bg-orange-600',
      arrived_pickup: 'bg-purple-600',
      picked_up: 'bg-blue-600',
      enroute_dropoff: 'bg-orange-600',
      arrived_dropoff: 'bg-emerald-600',
      completed: 'bg-gray-500',
      cancelled: 'bg-gray-500',
      disputed: 'bg-gray-500',
      expired: 'bg-gray-500',
      failed: 'bg-gray-500',
    };

    return (
      <button
        onClick={handleUpdateStatus}
        className={`w-full py-4 ${buttonColors[nextStatus]} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all`}
      >
        {statusLabels[nextStatus]}
      </button>
    );
  }

  return null;
}

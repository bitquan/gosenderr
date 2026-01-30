
import { Job } from '../shared/types';
import { claimJob, updateJobStatus } from '@/lib/v2/jobs';
import { useClaimJob } from '@/hooks/v2/useClaimJob';
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

  const { claim, loading: claimLoading } = useClaimJob();

  const handleAccept = async () => {
    if (!estimatedFee) {
      alert('Cannot accept job: no fee calculated');
      return;
    }

    // Try claiming with the provided fee
    const result = await claim(job.id, courierUid, estimatedFee);

    if (result.success) {
      alert('Job accepted successfully!');
      onJobUpdated?.();
      return;
    }

    // Handle structured errors
    switch (result.type) {
      case 'price-mismatch': {
        const serverFee = result.serverFee;
        if (serverFee !== undefined) {
          const confirmMsg = `Server calculated fee is $${serverFee.toFixed(2)} (your price: $${estimatedFee.toFixed(2)}). Accept server price and claim job?`;
          if (window.confirm(confirmMsg)) {
            const retry = await claim(job.id, courierUid, serverFee);
            if (retry.success) {
              alert('Job accepted with server price.');
              onJobUpdated?.();
            } else {
              console.error('Failed to claim job with server price:', retry.message || retry);
              alert(retry.message || 'Failed to claim job with server price.');
            }
          }
        } else {
          alert('Price calculation error. Please refresh and try again.');
        }
        break;
      }

      case 'not-eligible':
        alert('You are not eligible for this job. It may exceed your distance limits.');
        break;

      case 'already-claimed':
        alert('This job was claimed by another courier.');
        break;

      case 'other':
      default:
        alert(result.message || 'Failed to accept job. It may have been claimed by another courier.');
        break;
    }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    // Ensure job is assigned to this courier before attempting a status update
    if (!isAssignedToCourier) {
      alert('Cannot update status — job is not assigned to you.');
      return;
    }

    try {
      await updateJobStatus(job.id, nextStatus, courierUid);
      onJobUpdated?.();
    } catch (error: any) {
      console.error('Failed to update job status:', error);
      alert(error?.message || 'Failed to update job status. Please try again.');
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

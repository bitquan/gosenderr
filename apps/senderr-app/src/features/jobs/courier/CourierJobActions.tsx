
import { Job } from '../shared/types';
import { claimJob, updateJobStatus } from '@/lib/v2/jobs';
import { captureGPSPhoto } from '@/lib/gpsPhoto';
import { calcMiles } from '@/lib/v2/pricing';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
  const MAX_DISTANCE_MILES = 0.2; // ~320 meters
  const MAX_ACCURACY_METERS = 100;
  
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

    if (job.paymentStatus !== 'authorized') {
      alert('Payment not authorized yet. Please wait for customer payment before starting this trip.');
      return;
    }

    try {
      if (nextStatus === 'picked_up') {
        await handleProofCapture('pickup');
      }

      if (nextStatus === 'completed') {
        await handleProofCapture('dropoff');
      }

      await updateJobStatus(job.id, nextStatus);
      onJobUpdated?.();
    } catch (error) {
      console.error('Failed to update job status:', error);
      const message = error instanceof Error ? error.message : 'Failed to update job status. Please try again.';
      alert(message);
    }
  };

  const handleProofCapture = async (type: 'pickup' | 'dropoff') => {
    const target = type === 'pickup' ? job.pickup : job.dropoff;

    const proof = await captureGPSPhoto(courierUid, job.id);
    if (proof.coordinates.accuracy > MAX_ACCURACY_METERS) {
      throw new Error('Location accuracy too low. Please try again.');
    }

    const distance = calcMiles(
      { lat: proof.coordinates.latitude, lng: proof.coordinates.longitude },
      { lat: target.lat, lng: target.lng },
    );

    if (distance > MAX_DISTANCE_MILES) {
      throw new Error('You must be at the delivery location to take this photo.');
    }

    const proofPayload = {
      url: proof.url,
      location: {
        lat: proof.coordinates.latitude,
        lng: proof.coordinates.longitude,
      },
      accuracy: proof.coordinates.accuracy,
      timestamp: Timestamp.fromDate(proof.timestamp),
    };

    await updateDoc(doc(db, 'jobs', job.id), {
      ...(type === 'pickup' ? { pickupProof: proofPayload } : { dropoffProof: proofPayload }),
      updatedAt: serverTimestamp(),
    });
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

import { useEffect, useState } from 'react';
import { Job } from '../shared/types';
import { claimJob, updateJobStatus } from '@/lib/v2/jobs';
import { captureGPSPhoto } from '@/lib/gpsPhoto';
import { calcMiles } from '@/lib/v2/pricing';
import { db } from '@/lib/firebase';
import { logCommandFailure } from '@/lib/commandFailureTelemetry';
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
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'accept' | 'status' | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  
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
    const fee =
      estimatedFee ??
      job.agreedFee ??
      (job as any)?.pricing?.courierRate ??
      (job as any)?.pricing?.totalAmount ??
      0;

    if (!fee || fee <= 0) {
      setActionError('Cannot accept job: no fee calculated for this offer.');
      return;
    }

    if (isOffline) {
      setActionError('You are offline. Reconnect to accept this job.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      setLastAction('accept');
      await claimJob(job.id, courierUid, fee);
      onJobUpdated?.();
    } catch (error) {
      console.error('Failed to accept job:', error);
      const message = error instanceof Error ? error.message : 'Failed to accept job. It may have been claimed by another courier.';
      void logCommandFailure({
        command: 'accept',
        jobId: job.id,
        message,
        code: (error as any)?.code,
        isOffline,
      });
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    if (isOffline) {
      setActionError('You are offline. Reconnect to update delivery status.');
      return;
    }

    if (job.paymentStatus !== 'authorized') {
      setActionError('Payment not authorized yet. Please wait for customer payment before starting this trip.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      setLastAction('status');
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
      void logCommandFailure({
        command: 'status',
        jobId: job.id,
        message,
        code: (error as any)?.code,
        isOffline,
      });
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastAction === 'accept') {
      void handleAccept();
      return;
    }
    if (lastAction === 'status') {
      void handleUpdateStatus();
    }
  };

  const buttonDisabled = actionLoading || isOffline;

  const statusErrorCard = actionError ? (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <div className="font-semibold">Action failed</div>
      <div className="mt-1">{actionError}</div>
      {lastAction && (
        <button
          onClick={handleRetry}
          disabled={buttonDisabled}
          className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-60"
        >
          Retry
        </button>
      )}
    </div>
  ) : null;

  const offlineCard = isOffline ? (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      You are offline. Lifecycle commands will resume once your connection is restored.
    </div>
  ) : null;

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
      <div>
        <button
          onClick={handleAccept}
          disabled={buttonDisabled}
          className="w-full py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {actionLoading
            ? 'Accepting...'
            : `Accept Job${estimatedFee ? ` - $${estimatedFee.toFixed(2)}` : ''}`}
        </button>
        {offlineCard}
        {statusErrorCard}
      </div>
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
      <div>
        <button
          onClick={handleUpdateStatus}
          disabled={buttonDisabled}
          className={`w-full py-4 ${buttonColors[nextStatus]} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {actionLoading ? 'Updating...' : statusLabels[nextStatus]}
        </button>
        {offlineCard}
        {statusErrorCard}
      </div>
    );
  }

  return null;
}

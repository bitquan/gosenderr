'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { StatusTimeline } from '@/components/v2/StatusTimeline';
import { MapboxMap } from '@/components/v2/MapboxMap';
import { JobDoc } from '@/lib/v2/types';
import Link from 'next/link';

export default function PublicPackageTracking() {
  const params = useParams();
  const trackingNumber = params?.trackingNumber as string;
  const [job, setJob] = useState<(JobDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    async function loadJob() {
      if (!trackingNumber) {
        setError('No tracking number provided');
        setLoading(false);
        return;
      }

      try {
        // Query jobs collection for a job with this tracking number
        // For now, we'll use the job ID as the tracking number
        // In a real implementation, you'd add a trackingNumber field to JobDoc
        const jobsRef = collection(db, 'jobs');
        const q = query(jobsRef, where('__name__', '==', trackingNumber));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('Package not found. Please check your tracking number.');
          setLoading(false);
          return;
        }

        const jobDoc = snapshot.docs[0];
        const jobData = jobDoc.data() as JobDoc;
        setJob({ ...jobData, id: jobDoc.id });

        // Set up real-time courier location updates if courier is assigned
        if (jobData.courierUid) {
          // Subscribe to courier location updates
          const courierRef = collection(db, 'users');
          const courierQuery = query(courierRef, where('__name__', '==', jobData.courierUid));
          const courierSnapshot = await getDocs(courierQuery);
          
          if (!courierSnapshot.empty) {
            const courierData = courierSnapshot.docs[0].data();
            if (courierData.location) {
              setCourierLocation({
                lat: courierData.location.lat,
                lng: courierData.location.lng,
              });
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading package:', err);
        setError('Failed to load package information');
        setLoading(false);
      }
    }

    loadJob();
  }, [trackingNumber]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading package information...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '500px', 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>❌</div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
            Package Not Found
          </h2>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
            {error || 'Please check your tracking number and try again.'}
          </p>
          <div style={{ 
            padding: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#4b5563',
            textAlign: 'left'
          }}>
            <p style={{ marginBottom: '8px' }}><strong>Tracking Number:</strong></p>
            <code style={{ 
              display: 'block',
              padding: '8px',
              backgroundColor: 'white',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              {trackingNumber}
            </code>
          </div>
        </div>
      </div>
    );
  }

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; emoji: string; color: string }> = {
      open: { label: 'Pending Pickup', emoji: '⏳', color: '#f59e0b' },
      assigned: { label: 'Courier Assigned', emoji: '👤', color: '#3b82f6' },
      enroute_pickup: { label: 'En Route to Pickup', emoji: '🚗', color: '#3b82f6' },
      arrived_pickup: { label: 'Arrived at Pickup', emoji: '📍', color: '#8b5cf6' },
      picked_up: { label: 'Package Picked Up', emoji: '📦', color: '#8b5cf6' },
      enroute_dropoff: { label: 'Out for Delivery', emoji: '🚚', color: '#06b6d4' },
      arrived_dropoff: { label: 'Arrived at Destination', emoji: '🏠', color: '#10b981' },
      completed: { label: 'Delivered', emoji: '✅', color: '#10b981' },
      cancelled: { label: 'Cancelled', emoji: '🚫', color: '#ef4444' },
      disputed: { label: 'Under Review', emoji: '⚠️', color: '#f59e0b' },
    };

    return statusMap[status] || { label: status, emoji: '📦', color: '#6b7280' };
  };

  const statusInfo = getStatusDisplay(job.status);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{statusInfo.emoji}</div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: '#111827'
            }}>
              Track Your Package
            </h1>
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: statusInfo.color + '20',
              color: statusInfo.color,
              borderRadius: '20px',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {statusInfo.label}
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginTop: '24px'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              <strong>Tracking Number:</strong>
            </p>
            <code style={{
              display: 'block',
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827'
            }}>
              {trackingNumber}
            </code>
          </div>
        </div>

        {/* Status Timeline */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '24px',
            color: '#111827'
          }}>
            Delivery Progress
          </h2>
          <StatusTimeline currentStatus={job.status} />
        </div>

        {/* Package Details */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '24px',
            color: '#111827'
          }}>
            Package Details
          </h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                📍 <strong>Pickup Location</strong>
              </div>
              <div style={{ fontSize: '16px', color: '#111827', paddingLeft: '24px' }}>
                {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                🏠 <strong>Delivery Location</strong>
              </div>
              <div style={{ fontSize: '16px', color: '#111827', paddingLeft: '24px' }}>
                {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
              </div>
            </div>

            {job.agreedFee && (
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  💰 <strong>Delivery Fee</strong>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', paddingLeft: '24px' }}>
                  ${job.agreedFee.toFixed(2)}
                </div>
              </div>
            )}

            {job.createdAt && (
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  📅 <strong>Order Placed</strong>
                </div>
                <div style={{ fontSize: '16px', color: '#111827', paddingLeft: '24px' }}>
                  {job.createdAt.toDate?.()?.toLocaleString() || 'Just now'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Map */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '24px',
            color: '#111827'
          }}>
            Live Map
          </h2>
          <MapboxMap
            pickup={job.pickup}
            dropoff={job.dropoff}
            courierLocation={courierLocation}
            height="500px"
          />
          {job.courierUid && !courierLocation && (
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              marginTop: '12px',
              textAlign: 'center'
            }}>
              Waiting for courier location updates...
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          padding: '24px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p>Need help? Contact support at support@gosenderr.com</p>
          <p style={{ marginTop: '8px' }}>
            Powered by <strong style={{ color: '#2563eb' }}>GoSenderr</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { JobDoc } from '@/lib/v2/types';
import Link from 'next/link';

export default function ShipmentConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params?.packageId as string;
  const [job, setJob] = useState<(JobDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPackage() {
      if (!packageId) {
        setLoading(false);
        return;
      }

      try {
        const jobRef = doc(db, 'jobs', packageId);
        const jobSnap = await getDoc(jobRef);

        if (jobSnap.exists()) {
          const jobData = jobSnap.data() as JobDoc;
          setJob({ ...jobData, id: jobSnap.id });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading package:', err);
        setLoading(false);
      }
    }

    loadPackage();
  }, [packageId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>❌</div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
            Package Not Found
          </h2>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
            We couldn't find this package.
          </p>
          <button
            onClick={() => router.push('/ship')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Ship Another Package
          </button>
        </div>
      </div>
    );
  }

  const trackingNumber = packageId;
  const trackingUrl = `/track/package/${trackingNumber}`;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Success Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>✅</div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '12px',
            color: '#111827',
          }}>
            Shipment Created Successfully!
          </h1>
          <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '32px' }}>
            Your package is ready to be picked up by a courier.
          </p>

          {/* Tracking Number */}
          <div style={{
            padding: '24px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '24px',
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
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
            }}>
              {trackingNumber}
            </code>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={trackingUrl}
              style={{
                padding: '14px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Track Package
            </Link>
            <button
              onClick={() => router.push('/ship')}
              style={{
                padding: '14px 24px',
                backgroundColor: '#f3f4f6',
                color: '#111827',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Ship Another Package
            </button>
          </div>
        </div>

        {/* Shipment Details */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '24px',
            color: '#111827',
          }}>
            Shipment Details
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
                  💰 <strong>Total Cost</strong>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', paddingLeft: '24px' }}>
                  ${job.agreedFee.toFixed(2)}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                📅 <strong>Created</strong>
              </div>
              <div style={{ fontSize: '16px', color: '#111827', paddingLeft: '24px' }}>
                {job.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                📦 <strong>Status</strong>
              </div>
              <div style={{ paddingLeft: '24px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#f59e0b20',
                  color: '#f59e0b',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  Pending Pickup
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          padding: '24px',
          border: '2px solid #3b82f6',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1e40af',
          }}>
            📝 Next Steps
          </h3>
          <ul style={{
            fontSize: '14px',
            color: '#1e40af',
            paddingLeft: '20px',
            display: 'grid',
            gap: '8px',
          }}>
            <li>A courier will be assigned to pick up your package soon</li>
            <li>You'll receive notifications when your package is picked up</li>
            <li>Track your package in real-time using the tracking number above</li>
            <li>Payment will be captured after successful delivery</li>
            <li>Confirmation emails and SMS have been sent to provided contacts</li>
          </ul>
        </div>

        {/* Support Info */}
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280',
          fontSize: '14px',
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

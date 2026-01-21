'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { JobDoc, JobStatus } from '@/lib/v2/types';
import { GPSPhotoCapture } from '@/components/v2/GPSPhotoCapture';
import { MapboxMap } from '@/components/v2/MapboxMap';
import { StatusTimeline } from '@/components/v2/StatusTimeline';
import { uploadJobPhoto } from '@/lib/storage/uploadJobPhoto';
import { PhotoMetadata } from '@gosenderr/shared';
import { useToast } from '@/components/ui/Toast';

export default function ActiveRoutePage() {
  const router = useRouter();
  const { uid } = useAuthUser();
  const { showToast, ToastContainer } = useToast();
  const [job, setJob] = useState<(JobDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active job
  useEffect(() => {
    async function loadActiveJob() {
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const jobsRef = collection(db, 'jobs');
        const q = query(
          jobsRef,
          where('courierUid', '==', uid),
          where('status', 'in', ['assigned', 'enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'])
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const jobDoc = snapshot.docs[0];
          const jobData = jobDoc.data() as JobDoc;
          setJob({ ...jobData, id: jobDoc.id });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading active job:', err);
        setError('Failed to load active job');
        setLoading(false);
      }
    }

    loadActiveJob();
  }, [uid]);

  const handlePickupPhotoCapture = async (file: File, metadata: PhotoMetadata) => {
    if (!job || !uid) return;

    setUploading(true);
    setError(null);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);

      // Upload photo to Firebase Storage
      const uploadResult = await uploadJobPhoto(compressedFile, job.id, uid);

      // Update job with pickup photo
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        pickupPhoto: {
          url: uploadResult.url,
          metadata: {
            ...metadata,
            storagePath: uploadResult.path,
          },
        },
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setJob({
        ...job,
        pickupPhoto: {
          url: uploadResult.url,
          metadata: {
            ...metadata,
            storagePath: uploadResult.path,
          },
        },
      } as any);

      showToast('Pickup photo captured successfully!', 'success');
      setUploading(false);
    } catch (err: any) {
      console.error('Error capturing pickup photo:', err);
      setError(err.message || 'Failed to capture pickup photo');
      setUploading(false);
    }
  };

  const handleDropoffPhotoCapture = async (file: File, metadata: PhotoMetadata) => {
    if (!job || !uid) return;

    setUploading(true);
    setError(null);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);

      // Upload photo to Firebase Storage
      const uploadResult = await uploadJobPhoto(compressedFile, job.id, uid);

      // Update job with dropoff photo
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        dropoffPhoto: {
          url: uploadResult.url,
          metadata: {
            ...metadata,
            storagePath: uploadResult.path,
          },
        },
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setJob({
        ...job,
        dropoffPhoto: {
          url: uploadResult.url,
          metadata: {
            ...metadata,
            storagePath: uploadResult.path,
          },
        },
      } as any);

      showToast('Dropoff photo captured successfully!', 'success');
      setUploading(false);
    } catch (err: any) {
      console.error('Error capturing dropoff photo:', err);
      setError(err.message || 'Failed to capture dropoff photo');
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: JobStatus) => {
    if (!job) return;

    try {
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      setJob({ ...job, status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Failed to update status', 'error');
    }
  };

  // Helper function to compress image
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(file); // Return original if canvas not supported
            return;
          }

          // Calculate new dimensions (max 1920x1920)
          let width = img.width;
          let height = img.height;
          const maxSize = 1920;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw compressed image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };

        img.onerror = () => {
          resolve(file); // Return original on error
        };
      };

      reader.onerror = () => {
        resolve(file); // Return original on error
      };
    });
  }

  if (!uid) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Authentication Required
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          Please log in to access your active route.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading active route...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          No Active Route
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
          You don't have any active deliveries at the moment.
        </p>
        <button
          onClick={() => router.push('/courier/dashboard')}
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
          Go to Dashboard
        </button>
      </div>
    );
  }

  const needsPickupPhoto = ['arrived_pickup'].includes(job.status);
  const needsDropoffPhoto = ['arrived_dropoff'].includes(job.status);

  return (
    <>
      <ToastContainer />
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Active Route
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Job ID: {job.id}
        </p>
      </div>

      {/* Status Timeline */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Delivery Progress
        </h2>
        <StatusTimeline currentStatus={job.status} />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* GPS Photo Capture for Pickup */}
      {needsPickupPhoto && (
        <div style={{ marginBottom: '24px' }}>
          <GPSPhotoCapture
            expectedLocation={{ lat: job.pickup.lat, lng: job.pickup.lng }}
            maxDistanceMeters={100}
            onPhotoCapture={handlePickupPhotoCapture}
            label="Pickup"
            disabled={uploading}
          />
        </div>
      )}

      {/* GPS Photo Capture for Dropoff */}
      {needsDropoffPhoto && (
        <div style={{ marginBottom: '24px' }}>
          <GPSPhotoCapture
            expectedLocation={{ lat: job.dropoff.lat, lng: job.dropoff.lng }}
            maxDistanceMeters={100}
            onPhotoCapture={handleDropoffPhotoCapture}
            label="Dropoff"
            disabled={uploading}
          />
        </div>
      )}

      {/* Job Details */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Job Details
        </h2>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              📍 Pickup Location
            </div>
            <div style={{ fontSize: '16px', color: '#111827' }}>
              {job.pickup.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              🏠 Dropoff Location
            </div>
            <div style={{ fontSize: '16px', color: '#111827' }}>
              {job.dropoff.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
            </div>
          </div>

          {job.agreedFee && (
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                💰 Agreed Fee
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                ${job.agreedFee.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Buttons */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {job.status === 'assigned' && (
          <button
            onClick={() => handleStatusUpdate('enroute_pickup')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Start Route to Pickup
          </button>
        )}

        {job.status === 'enroute_pickup' && (
          <button
            onClick={() => handleStatusUpdate('arrived_pickup')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Mark Arrived at Pickup
          </button>
        )}

        {job.status === 'picked_up' && (
          <button
            onClick={() => handleStatusUpdate('enroute_dropoff')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Start Route to Dropoff
          </button>
        )}

        {job.status === 'enroute_dropoff' && (
          <button
            onClick={() => handleStatusUpdate('arrived_dropoff')}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Mark Arrived at Dropoff
          </button>
        )}
      </div>

      {/* Map */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e5e7eb',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Route Map
        </h2>
        <MapboxMap
          pickup={job.pickup}
          dropoff={job.dropoff}
          courierLocation={null}
          height="500px"
        />
      </div>
    </div>
    </>
  );
}

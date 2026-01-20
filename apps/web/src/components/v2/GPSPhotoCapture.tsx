'use client';

import { useState, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';

interface GPSLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface PhotoMetadata {
  gpsVerified: boolean;
  accuracy: number;
  timestamp: Timestamp;
  location: { lat: number; lng: number };
}

interface GPSPhotoCaptureProps {
  expectedLocation: { lat: number; lng: number };
  maxDistanceMeters?: number; // Default 100m
  onPhotoCapture: (file: File, metadata: PhotoMetadata) => Promise<void>;
  label: string; // "Pickup" or "Dropoff"
  disabled?: boolean;
}

export function GPSPhotoCapture({
  expectedLocation,
  maxDistanceMeters = 100,
  onPhotoCapture,
  label,
  disabled = false,
}: GPSPhotoCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'verified' | 'failed' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate distance between two GPS coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Get current GPS location
  const getCurrentLocation = useCallback((): Promise<GPSLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your device'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(new Error(`GPS Error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Handle photo capture
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCapturing(true);
    setError(null);
    setGpsStatus('checking');

    try {
      // Get current GPS location
      const currentLocation = await getCurrentLocation();

      // Calculate distance from expected location
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        expectedLocation.lat,
        expectedLocation.lng
      );

      // Verify GPS location is within acceptable range
      if (distance > maxDistanceMeters) {
        setGpsStatus('failed');
        setError(
          `GPS verification failed: You are ${Math.round(distance)}m away from the ${label.toLowerCase()} location. Please get within ${maxDistanceMeters}m.`
        );
        setCapturing(false);
        return;
      }

      setGpsStatus('verified');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Create photo metadata
      const metadata: PhotoMetadata = {
        gpsVerified: true,
        accuracy: currentLocation.accuracy,
        timestamp: Timestamp.now(),
        location: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        },
      };

      // Upload photo
      await onPhotoCapture(file, metadata);
      setCapturing(false);
    } catch (err) {
      setGpsStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to capture photo with GPS');
      setCapturing(false);
    }
  };

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        📸 {label} Photo Required
      </h3>

      <div
        style={{
          background: '#eff6ff',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1e40af',
          marginBottom: '16px',
        }}
      >
        ℹ️ GPS verification required. Please be within {maxDistanceMeters}m of the{' '}
        {label.toLowerCase()} location to take a photo.
      </div>

      {preview && (
        <div style={{ marginBottom: '16px' }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '8px',
              border: '2px solid ' + (gpsStatus === 'verified' ? '#16a34a' : '#f59e0b'),
            }}
          />
          <div
            style={{
              marginTop: '8px',
              fontSize: '14px',
              color: gpsStatus === 'verified' ? '#16a34a' : '#f59e0b',
            }}
          >
            {gpsStatus === 'verified' && '✅ GPS Verified'}
            {gpsStatus === 'failed' && '⚠️ GPS Verification Failed'}
            {gpsStatus === 'checking' && '🔄 Verifying GPS...'}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || capturing}
      />

      <button
        onClick={handleButtonClick}
        disabled={disabled || capturing}
        style={{
          width: '100%',
          padding: '16px',
          background: disabled || capturing ? '#9ca3af' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: disabled || capturing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {capturing ? (
          <>
            <span>🔄</span>
            Processing...
          </>
        ) : (
          <>
            📷 Take {label} Photo
          </>
        )}
      </button>

      {gpsStatus === 'checking' && (
        <div style={{ marginTop: '12px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          Getting GPS location...
        </div>
      )}
    </div>
  );
}

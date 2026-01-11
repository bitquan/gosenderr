'use client';

import { useState, FormEvent } from 'react';

interface JobFormProps {
  onSubmit: (data: {
    pickup: { lat: number; lng: number; label?: string };
    dropoff: { lat: number; lng: number; label?: string };
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function JobForm({ onSubmit, onCancel, loading }: JobFormProps) {
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [pickupLabel, setPickupLabel] = useState('');

  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [dropoffLabel, setDropoffLabel] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const pickup = {
        lat: parseFloat(pickupLat),
        lng: parseFloat(pickupLng),
        ...(pickupLabel && { label: pickupLabel }),
      };

      const dropoff = {
        lat: parseFloat(dropoffLat),
        lng: parseFloat(dropoffLng),
        ...(dropoffLabel && { label: dropoffLabel }),
      };

      // Validate coordinates
      if (
        isNaN(pickup.lat) ||
        isNaN(pickup.lng) ||
        isNaN(dropoff.lat) ||
        isNaN(dropoff.lng)
      ) {
        throw new Error('Invalid coordinates - must be numbers');
      }

      if (
        pickup.lat < -90 ||
        pickup.lat > 90 ||
        pickup.lng < -180 ||
        pickup.lng > 180 ||
        dropoff.lat < -90 ||
        dropoff.lat > 90 ||
        dropoff.lng < -180 ||
        dropoff.lng > 180
      ) {
        throw new Error('Coordinates out of valid range (lat: -90 to 90, lng: -180 to 180)');
      }

      await onSubmit({ pickup, dropoff });
    } catch (err: any) {
      setError(err.message || 'Failed to submit form');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ padding: '12px', marginBottom: '20px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <fieldset style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
        <legend><strong>Pickup Location</strong></legend>

        <div style={{ marginBottom: '10px' }}>
          <label>Latitude *</label>
          <input
            type="text"
            value={pickupLat}
            onChange={(e) => setPickupLat(e.target.value)}
            placeholder="37.7749"
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Longitude *</label>
          <input
            type="text"
            value={pickupLng}
            onChange={(e) => setPickupLng(e.target.value)}
            placeholder="-122.4194"
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Label (optional)</label>
          <input
            type="text"
            value={pickupLabel}
            onChange={(e) => setPickupLabel(e.target.value)}
            placeholder="e.g., Home, Office"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
      </fieldset>

      <fieldset style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
        <legend><strong>Dropoff Location</strong></legend>

        <div style={{ marginBottom: '10px' }}>
          <label>Latitude *</label>
          <input
            type="text"
            value={dropoffLat}
            onChange={(e) => setDropoffLat(e.target.value)}
            placeholder="37.8044"
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Longitude *</label>
          <input
            type="text"
            value={dropoffLng}
            onChange={(e) => setDropoffLng(e.target.value)}
            placeholder="-122.2712"
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Label (optional)</label>
          <input
            type="text"
            value={dropoffLabel}
            onChange={(e) => setDropoffLabel(e.target.value)}
            placeholder="e.g., Client Office"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
      </fieldset>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="submit"
          disabled={loading}
          style={{ flex: 1, padding: '12px', fontSize: '16px' }}
        >
          {loading ? 'Creating...' : 'Create Job'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ flex: 1, padding: '12px', fontSize: '16px', background: '#eee' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

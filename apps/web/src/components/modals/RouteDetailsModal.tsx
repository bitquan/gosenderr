'use client';

import { useEffect, useRef } from 'react';
import { MapboxMap } from '../v2/MapboxMap';

export interface RouteStop {
  id: string;
  type: 'pickup' | 'dropoff';
  location: {
    lat: number;
    lng: number;
    label?: string;
  };
  itemTitle?: string;
  estimatedTime?: string;
  status: 'pending' | 'completed';
  sequence: number;
}

export interface RouteDetails {
  id: string;
  name: string;
  totalStops: number;
  completedStops: number;
  estimatedDuration: number;
  totalDistance: number;
  stops: RouteStop[];
}

interface RouteDetailsModalProps {
  route: RouteDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RouteDetailsModal({ route, isOpen, onClose }: RouteDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !route) return null;

  const getStopIcon = (stop: RouteStop) => {
    if (stop.status === 'completed') {
      return '✅';
    }
    return stop.type === 'pickup' ? '📦' : '��';
  };

  const getStopColor = (stop: RouteStop) => {
    if (stop.status === 'completed') {
      return '#10b981';
    }
    return stop.type === 'pickup' ? '#3b82f6' : '#8b5cf6';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', color: '#111827' }}>
              {route.name}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {route.completedStops} of {route.totalStops} stops completed
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f3f4f6',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Route Stats */}
        <div
          style={{
            padding: '24px',
            backgroundColor: '#f9fafb',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Total Distance
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {route.totalDistance.toFixed(1)} mi
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Estimated Duration
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {route.estimatedDuration} min
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Progress
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {Math.round((route.completedStops / route.totalStops) * 100)}%
            </div>
          </div>
        </div>

        {/* Map Preview */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            Route Map
          </h3>
          {route.stops.length >= 2 && (
            <MapboxMap
              pickup={route.stops[0].location}
              dropoff={route.stops[route.stops.length - 1].location}
              courierLocation={null}
              height="300px"
            />
          )}
        </div>

        {/* Stop-by-Stop Breakdown */}
        <div style={{ padding: '24px', paddingTop: '0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            Stop-by-Stop Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {route.stops.map((stop, index) => (
              <div
                key={stop.id}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: stop.status === 'completed' ? '#f0fdf4' : 'white',
                  border: `2px solid ${stop.status === 'completed' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  position: 'relative',
                }}
              >
                {/* Connection Line */}
                {index < route.stops.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '27px',
                      top: '56px',
                      width: '2px',
                      height: '24px',
                      backgroundColor: '#e5e7eb',
                    }}
                  />
                )}

                {/* Stop Number Badge */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: getStopColor(stop),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {stop.sequence}
                </div>

                {/* Stop Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '20px' }}>{getStopIcon(stop)}</span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        textTransform: 'capitalize',
                      }}
                    >
                      {stop.type}
                    </span>
                    {stop.status === 'completed' && (
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}
                      >
                        Completed
                      </span>
                    )}
                  </div>

                  {stop.itemTitle && (
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                      {stop.itemTitle}
                    </div>
                  )}

                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                    {stop.location.label || `${stop.location.lat.toFixed(4)}, ${stop.location.lng.toFixed(4)}`}
                  </div>

                  {stop.estimatedTime && (
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Est. arrival: {stop.estimatedTime}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

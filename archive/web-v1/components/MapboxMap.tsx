'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoPoint, DriverLocation } from '@gosenderr/shared';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  driverLocation?: DriverLocation | null;
}

export function MapboxMap({ pickup, dropoff, driverLocation }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not configured');
      return;
    }

    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate center point between pickup and dropoff
    const centerLat = (pickup.lat + dropoff.lat) / 2;
    const centerLng = (pickup.lng + dropoff.lng) / 2;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 12,
    });

    // Add pickup marker
    pickupMarker.current = new mapboxgl.Marker({ color: '#4CAF50' })
      .setLngLat([pickup.lng, pickup.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<strong>Pickup</strong><br/>${pickup.label || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`}`
        )
      )
      .addTo(map.current);

    // Add dropoff marker
    dropoffMarker.current = new mapboxgl.Marker({ color: '#F44336' })
      .setLngLat([dropoff.lng, dropoff.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<strong>Dropoff</strong><br/>${dropoff.label || `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`}`
        )
      )
      .addTo(map.current);

    // Fit bounds to show both markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([pickup.lng, pickup.lat]);
    bounds.extend([dropoff.lng, dropoff.lat]);
    
    if (driverLocation) {
      bounds.extend([driverLocation.lng, driverLocation.lat]);
    }
    
    map.current.fitBounds(bounds, { padding: 80, maxZoom: 15 });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  // Update driver marker when driver location changes
  useEffect(() => {
    if (!map.current) return;

    if (driverLocation) {
      if (driverMarker.current) {
        // Update existing marker position
        driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
      } else {
        // Create new driver marker
        driverMarker.current = new mapboxgl.Marker({ color: '#2196F3' })
          .setLngLat([driverLocation.lng, driverLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>Driver</strong>')
          )
          .addTo(map.current);
      }
    } else {
      // Remove driver marker if no location
      if (driverMarker.current) {
        driverMarker.current.remove();
        driverMarker.current = null;
      }
    }
  }, [driverLocation?.lat, driverLocation?.lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
        <strong>Map Error:</strong> Mapbox token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '4px',
        border: '1px solid #ddd',
      }}
    />
  );
}


import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";
import type { RouteSegment } from "@/lib/navigation/types";

interface MapboxMapProps {
  pickup?: GeoPoint;
  dropoff?: GeoPoint;
  courierLocation?: CourierLocation | null;
  height?: string;
  routeSegments?: RouteSegment[];
  onMapLoad?: (map: any) => void;
  showLabels?: boolean;
  showPopups?: boolean;
}

export interface MapboxMapHandle {
  getMap: () => any | null;
}

export const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(({
  pickup,
  dropoff,
  courierLocation,
  height = "400px",
  routeSegments = [],
  onMapLoad,
  showLabels = true,
  showPopups = true,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ pickup?: any; dropoff?: any; courier?: any }>({});
  const [mapReady, setMapReady] = useState(false);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
  }), []);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.warn("Mapbox token not found");
      return;
    }

    if (typeof window === "undefined") return;

    const loadMapbox = async () => {
      if (!window.mapboxgl) {
        const mapboxglModule = await import("mapbox-gl");
        window.mapboxgl = mapboxglModule.default as any;
      }

      const mapboxgl = window.mapboxgl;
      (mapboxgl as any).accessToken = token;

      if (!mapRef.current && mapContainer.current) {
        // Use courier location or pickup as initial center
        const initialCenter = courierLocation 
          ? [courierLocation.lng, courierLocation.lat]
          : pickup 
          ? [pickup.lng, pickup.lat]
          : [-77.4182, 38.9493]; // Default to DC area
          
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCenter as [number, number],
          zoom: 12,
        });

        mapRef.current = map;

        map.on("load", () => {
          // Only create pickup/dropoff markers if they exist
          if (pickup && dropoff) {
            markersRef.current.pickup = new mapboxgl.Marker({ color: "#16a34a" })
              .setLngLat([pickup.lng, pickup.lat])
              .setPopup(
                new mapboxgl.Popup().setHTML(
                  `<strong>Pickup</strong>${pickup.label ? `<br/>${pickup.label}` : ""}`,
                ),
              )
              .addTo(map);

            markersRef.current.dropoff = new mapboxgl.Marker({ color: "#dc2626" })
              .setLngLat([dropoff.lng, dropoff.lat])
              .setPopup(
                new mapboxgl.Popup().setHTML(
                  `<strong>Dropoff</strong>${dropoff.label ? `<br/>${dropoff.label}` : ""}`,
                ),
              )
              .addTo(map);

            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([pickup.lng, pickup.lat]);
            bounds.extend([dropoff.lng, dropoff.lat]);
            map.fitBounds(bounds, { padding: 50 });
          }

          setMapReady(true);

          if (onMapLoad) {
            onMapLoad(map);
          }
        });
      }
    };

    loadMapbox();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapLoad]);

  useEffect(() => {
    console.log('🔵 Courier marker effect - courierLocation:', courierLocation, 'mapReady:', mapReady);
    if (!mapReady || !mapRef.current) {
      console.log('🔵 Map not ready yet');
      return;
    }

    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) {
      console.log('🔵 No mapboxgl');
      return;
    }

    if (courierLocation && courierLocation.lat && courierLocation.lng) {
      console.log('🔵 Has location, creating/updating marker');
      // Check if marker exists and is the old type (remove it to force recreation)
      if (markersRef.current.courier) {
        const element = markersRef.current.courier.getElement();
        // If it doesn't have our custom class, it's the old default marker - remove it
        if (!element.classList.contains('courier-location-marker')) {
          console.log('🔵 Removing old default marker');
          markersRef.current.courier.remove();
          markersRef.current.courier = null;
        }
      }
      
      if (markersRef.current.courier) {
        console.log('🔵 Updating existing marker position');
        markersRef.current.courier.setLngLat([courierLocation.lng, courierLocation.lat]);
      } else {
        console.log('🔵 Creating new custom marker');
        // Create custom pulsing marker element
        const el = document.createElement('div');
        el.className = 'courier-location-marker';
        el.style.cssText = `
          width: 50px;
          height: 50px;
          position: relative;
        `;
        
        // Inner blue dot
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.8), 0 3px 6px rgba(0, 0, 0, 0.3);
          z-index: 10000;
        `;
        
        // Pulsing halo
        const halo = document.createElement('div');
        halo.style.cssText = `
          width: 100%;
          height: 100%;
          background: rgba(59, 130, 246, 0.4);
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          animation: pulse-halo 2s ease-out infinite;
          z-index: 9999;
        `;
        
        // Add keyframe animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse-halo {
            0% {
              transform: scale(0.8);
              opacity: 1;
            }
            100% {
              transform: scale(2.5);
              opacity: 0;
            }
          }
        `;
        
        if (!document.querySelector('#courier-marker-styles')) {
          style.id = 'courier-marker-styles';
          document.head.appendChild(style);
        }
        
        el.appendChild(halo);
        el.appendChild(dot);
        
        console.log('🔵 Adding marker to map with element:', el);
        markersRef.current.courier = new mapboxgl.Marker({ 
          element: el,
          anchor: 'center'
        })
          .setLngLat([courierLocation.lng, courierLocation.lat])
          .addTo(mapRef.current);
        console.log('🔵 Courier marker added successfully:', markersRef.current.courier);
      }
    } else {
      console.log('🔵 No courierLocation, removing marker if exists');
      if (markersRef.current.courier) {
        markersRef.current.courier.remove();
        markersRef.current.courier = null;
      }
    }
  }, [courierLocation, mapReady]);

  // Update pickup/dropoff markers when they change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    // Remove existing pickup/dropoff markers
    if (markersRef.current.pickup) {
      markersRef.current.pickup.remove();
      markersRef.current.pickup = null;
    }
    if (markersRef.current.dropoff) {
      markersRef.current.dropoff.remove();
      markersRef.current.dropoff = null;
    }

    // Only create markers if both pickup and dropoff exist
    if (pickup && dropoff) {
      const pickupMarker = new mapboxgl.Marker({ color: "#16a34a" })
        .setLngLat([pickup.lng, pickup.lat]);

      const dropoffMarker = new mapboxgl.Marker({ color: "#dc2626" })
        .setLngLat([dropoff.lng, dropoff.lat]);

      if (showPopups) {
        pickupMarker.setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>Pickup</strong>${showLabels && pickup.label ? `<br/>${pickup.label}` : ""}`,
          ),
        );
        dropoffMarker.setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>Dropoff</strong>${showLabels && dropoff.label ? `<br/>${dropoff.label}` : ""}`,
          ),
        );
      }

      markersRef.current.pickup = pickupMarker.addTo(mapRef.current);
      markersRef.current.dropoff = dropoffMarker.addTo(mapRef.current);
    }
  }, [pickup, dropoff, mapReady, showLabels, showPopups]);

  // Update route segments
  useEffect(() => {
    console.log('🗺️ MapboxMap route effect triggered:', {
      hasMap: !!mapRef.current,
      styleLoaded: mapRef.current?.isStyleLoaded(),
      mapReady,
      numSegments: routeSegments.length,
      segments: routeSegments.map(s => ({
        type: s.type,
        numCoords: s.coordinates.length
      }))
    });

    if (!mapRef.current || !mapReady) {
      console.log('⏳ Map not ready yet, waiting...');
      return;
    }

    const map = mapRef.current;
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    // Remove all existing route layers and sources
    const routeLayerIds = ['route-to-pickup', 'route-pickup-to-dropoff', 'route-navigation'];
    routeLayerIds.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    });

    // Only add routes if we have segments
    if (routeSegments.length === 0) {
      console.log('🗺️ No route segments to display');
      return;
    }

    console.log('🗺️ Adding route segments to map:', routeSegments.length);

    routeSegments.forEach((segment) => {
        const sourceId = `route-${segment.type}`;
        const layerId = `route-${segment.type}`;
      
      console.log('  Adding route layer:', layerId, 'with', segment.coordinates.length, 'coordinates');
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: segment.coordinates,
          },
        },
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': segment.color,
          'line-width': 6,
          'line-opacity': 0.9,
        },
      });
    });
  }, [routeSegments, mapReady]);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div style={{ height, background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "8px" }}>Map unavailable</p>
          <p style={{ fontSize: "12px" }}>Set VITE_MAPBOX_TOKEN in .env.local</p>
          <div style={{ marginTop: "16px", fontSize: "14px", textAlign: "left" }}>
              {pickup && (
                <p>
                  📍 Pickup: {showLabels && pickup.label ? pickup.label : 'Approximate location'}
                </p>
              )}
              {dropoff && (
                <p>
                  🎯 Dropoff: {showLabels && dropoff.label ? dropoff.label : 'Approximate location'}
                </p>
              )}
            {courierLocation && (
              <p>🚗 Courier: {courierLocation.lat}, {courierLocation.lng}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} style={{ height, borderRadius: "8px" }} />;
});

MapboxMap.displayName = 'MapboxMap';

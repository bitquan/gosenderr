
import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";
import type { RouteSegment } from "@/lib/navigation/types";
import type { Map as MapboxMapInstance, Marker as MapboxMarker } from "mapbox-gl";

declare global {
  interface Window {
    mapboxgl?: typeof import("mapbox-gl") | undefined;
  }
}

interface MapboxMapProps {
  pickup?: GeoPoint;
  dropoff?: GeoPoint;
  courierLocation?: CourierLocation | null;
  height?: string;
  routeSegments?: RouteSegment[];
  onMapLoad?: (map: MapboxMapInstance) => void;
  showLabels?: boolean;
  showPopups?: boolean;
  interactive?: boolean;
}

export interface MapboxMapHandle {
  getMap: () => MapboxMapInstance | null;
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
  interactive = true,
}, ref) => {
  const isValidLngLat = (lng?: number, lat?: number) =>
    Number.isFinite(lng) && Number.isFinite(lat);
  const isValidCoord = (coord: [number, number]) =>
    Array.isArray(coord) &&
    coord.length === 2 &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const fitRetryCountRef = useRef(0);
  const fitRetryTimeoutRef = useRef<number | null>(null);
  const markersRef = useRef<{
    pickup?: MapboxMarker | null;
    dropoff?: MapboxMarker | null;
    courier?: MapboxMarker | null;
  }>({});
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
        window.mapboxgl = mapboxglModule.default;
      }

      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) return;
      mapboxgl.accessToken = token;

      if (!mapRef.current && mapContainer.current) {
        // Use courier location or pickup as initial center
        const initialCenter = isValidLngLat(courierLocation?.lng, courierLocation?.lat)
          ? [courierLocation!.lng, courierLocation!.lat]
          : isValidLngLat(pickup?.lng, pickup?.lat)
          ? [pickup!.lng, pickup!.lat]
          : [-77.4182, 38.9493]; // Default to DC area
          
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCenter as [number, number],
          zoom: 12,
        });

        if (!interactive) {
          map.scrollZoom.disable();
          map.boxZoom.disable();
          map.dragRotate.disable();
          map.dragPan.disable();
          map.keyboard.disable();
          map.doubleClickZoom.disable();
          map.touchZoomRotate.disable();
        }

        mapRef.current = map;

        map.on("load", () => {
          // Only create pickup/dropoff markers if they exist
          if (
            pickup &&
            dropoff &&
            isValidLngLat(pickup.lng, pickup.lat) &&
            isValidLngLat(dropoff.lng, dropoff.lat)
          ) {
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
      if (fitRetryTimeoutRef.current) {
        window.clearTimeout(fitRetryTimeoutRef.current);
        fitRetryTimeoutRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapLoad]);

  const fitMapToRoute = () => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    const routeCoordinates = routeSegments
      .flatMap((segment) => segment.coordinates || [])
      .filter(isValidCoord);

    const coordinates = [
      ...routeCoordinates,
      ...(pickup && isValidLngLat(pickup.lng, pickup.lat)
        ? [[pickup.lng, pickup.lat] as [number, number]]
        : []),
      ...(dropoff && isValidLngLat(dropoff.lng, dropoff.lat)
        ? [[dropoff.lng, dropoff.lat] as [number, number]]
        : []),
    ];

    if (coordinates.length < 2) return;

    const seed = coordinates.find(isValidCoord);
    if (!seed) return;

    const bounds = new mapboxgl.LngLatBounds(seed, seed);
    coordinates.forEach((coord) => {
      if (isValidCoord(coord)) {
        bounds.extend(coord);
      }
    });

    const container = map.getContainer();
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
      if (fitRetryCountRef.current < 3 && !fitRetryTimeoutRef.current) {
        fitRetryCountRef.current += 1;
        fitRetryTimeoutRef.current = window.setTimeout(() => {
          fitRetryTimeoutRef.current = null;
          fitMapToRoute();
        }, 150);
      }
      return;
    }

    try {
      map.resize();
      const minSide = Math.min(container.clientWidth, container.clientHeight);
      const paddingValue = Math.min(60, Math.max(12, Math.floor(minSide * 0.2)));
      map.fitBounds(bounds, {
        padding: { top: paddingValue, right: paddingValue, bottom: paddingValue, left: paddingValue },
        maxZoom: 15,
        duration: interactive ? 800 : 0,
      });
    } catch (error) {
      console.warn("Failed to fit map bounds", error);
      return;
    }

    map.once("moveend", () => {
      const minZoom = 11;
      if (interactive && map.getZoom() < minZoom) {
        map.setZoom(minZoom);
      }
    });
  };

  useEffect(() => {
    fitMapToRoute();
  }, [mapReady, pickup, dropoff, routeSegments]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    if (courierLocation && isValidLngLat(courierLocation.lng, courierLocation.lat)) {
      // Check if marker exists and is the old type (remove it to force recreation)
      if (markersRef.current.courier) {
        const element = markersRef.current.courier.getElement();
        // If it doesn't have our custom class, it's the old default marker - remove it
        if (!element.classList.contains('courier-location-marker')) {
          markersRef.current.courier.remove();
          markersRef.current.courier = null;
        }
      }
      
      if (markersRef.current.courier) {
        markersRef.current.courier.setLngLat([courierLocation.lng, courierLocation.lat]);
      } else {
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
        
        markersRef.current.courier = new mapboxgl.Marker({ 
          element: el,
          anchor: 'center'
        })
          .setLngLat([courierLocation.lng, courierLocation.lat])
          .addTo(mapRef.current);
      }
    } else {
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
      markersRef.current.pickup = undefined;
    }
    if (markersRef.current.dropoff) {
      markersRef.current.dropoff.remove();
      markersRef.current.dropoff = undefined;
    }

    // Only create markers if both pickup and dropoff exist
    if (
      pickup &&
      dropoff &&
      isValidLngLat(pickup.lng, pickup.lat) &&
      isValidLngLat(dropoff.lng, dropoff.lat)
    ) {
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
    if (!mapRef.current || !mapReady) {
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
    if (routeSegments.length === 0) return;

    routeSegments.forEach((segment) => {
      const validCoordinates = (segment.coordinates || []).filter(isValidCoord);
      if (validCoordinates.length < 2) return;

      const sourceId = `route-${segment.type}`;
      const layerId = `route-${segment.type}`;

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: validCoordinates,
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

  return (
    <div
      ref={mapContainer}
      style={{
        height,
        borderRadius: "8px",
        pointerEvents: interactive ? "auto" : "none",
      }}
    />
  );
});

MapboxMap.displayName = 'MapboxMap';

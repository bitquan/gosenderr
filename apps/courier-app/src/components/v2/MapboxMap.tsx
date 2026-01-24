
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";
import type { RouteSegment } from "@/lib/navigation/types";

interface MapboxMapProps {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  courierLocation?: CourierLocation | null;
  height?: string;
  routeSegments?: RouteSegment[];
  onMapLoad?: (map: any) => void;
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
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ pickup?: any; dropoff?: any; courier?: any }>({});

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
        const mapboxgl = await import("mapbox-gl");
        window.mapboxgl = mapboxgl.default;
      }

      const mapboxgl = window.mapboxgl;
      mapboxgl.accessToken = token;

      if (!mapRef.current && mapContainer.current) {
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [pickup.lng, pickup.lat],
          zoom: 12,
        });

        mapRef.current = map;

        map.on("load", () => {
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
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, pickup.label, dropoff.label, onMapLoad]);

  useEffect(() => {
    if (!mapRef.current) return;

    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    if (courierLocation && courierLocation.lat && courierLocation.lng) {
      if (markersRef.current.courier) {
        markersRef.current.courier.setLngLat([courierLocation.lng, courierLocation.lat]);
      } else {
        markersRef.current.courier = new mapboxgl.Marker({ color: "#2563eb" })
          .setLngLat([courierLocation.lng, courierLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML("<strong>Senderr</strong>"))
          .addTo(mapRef.current);
      }
    } else {
      if (markersRef.current.courier) {
        markersRef.current.courier.remove();
        markersRef.current.courier = null;
      }
    }
  }, [courierLocation?.lat, courierLocation?.lng]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    const map = mapRef.current;
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    if (map.getLayer('route-to-pickup')) map.removeLayer('route-to-pickup');
    if (map.getSource('route-to-pickup')) map.removeSource('route-to-pickup');
    if (map.getLayer('route-pickup-to-dropoff')) map.removeLayer('route-pickup-to-dropoff');
    if (map.getSource('route-pickup-to-dropoff')) map.removeSource('route-pickup-to-dropoff');

    routeSegments.forEach((segment) => {
        const sourceId = `route-${segment.type}`;
        const layerId = `route-${segment.type}`;
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
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });
    });
  }, [routeSegments]);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div style={{ height, background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "8px" }}>Map unavailable</p>
          <p style={{ fontSize: "12px" }}>Set VITE_MAPBOX_TOKEN in .env.local</p>
          <div style={{ marginTop: "16px", fontSize: "14px", textAlign: "left" }}>
              <p>📍 Pickup: {pickup.label || `${pickup.lat}, ${pickup.lng}`}</p>
              <p>🎯 Dropoff: {dropoff.label || `${dropoff.lat}, ${dropoff.lng}`}</p>
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

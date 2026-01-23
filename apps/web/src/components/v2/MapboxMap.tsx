"use client";

import { useEffect, useRef } from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";

interface MapboxMapProps {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  courierLocation?: CourierLocation | null;
  height?: string;
}

export function MapboxMap({
  pickup,
  dropoff,
  courierLocation,
  height = "400px",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ pickup?: any; dropoff?: any; courier?: any }>({});

  useEffect(() => {
    // Check if mapbox token is available
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("Mapbox token not found");
      return;
    }

    // Load mapbox-gl dynamically
    if (typeof window === "undefined") return;

    const loadMapbox = async () => {
      // @ts-ignore
      if (!window.mapboxgl) {
        const mapboxgl = await import("mapbox-gl");
        // @ts-ignore
        window.mapboxgl = mapboxgl.default;
      }

      // @ts-ignore
      const mapboxgl = window.mapboxgl;
      // @ts-ignore
      mapboxgl.accessToken = token;

      if (!mapRef.current && mapContainer.current) {
        // Create map
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [pickup.lng, pickup.lat],
          zoom: 12,
        });

        mapRef.current = map;

        map.on("load", () => {
          // Add pickup marker (green)
          markersRef.current.pickup = new mapboxgl.Marker({ color: "#16a34a" })
            .setLngLat([pickup.lng, pickup.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>Pickup</strong>${pickup.label ? `<br/>${pickup.label}` : ""}`,
              ),
            )
            .addTo(map);

          // Add dropoff marker (red)
          markersRef.current.dropoff = new mapboxgl.Marker({ color: "#dc2626" })
            .setLngLat([dropoff.lng, dropoff.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>Dropoff</strong>${dropoff.label ? `<br/>${dropoff.label}` : ""}`,
              ),
            )
            .addTo(map);

          // Fit bounds to show both markers
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([pickup.lng, pickup.lat]);
          bounds.extend([dropoff.lng, dropoff.lat]);
          map.fitBounds(bounds, { padding: 50 });
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
  }, [
    pickup.lat,
    pickup.lng,
    dropoff.lat,
    dropoff.lng,
    pickup.label,
    dropoff.label,
  ]);

  // Update courier marker
  useEffect(() => {
    if (!mapRef.current) return;

    // @ts-ignore
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    if (courierLocation && courierLocation.lat && courierLocation.lng) {
      if (markersRef.current.courier) {
        // Update existing marker position
        markersRef.current.courier.setLngLat([
          courierLocation.lng,
          courierLocation.lat,
        ]);
      } else {
        // Create new courier marker (blue)
        markersRef.current.courier = new mapboxgl.Marker({ color: "#2563eb" })
          .setLngLat([courierLocation.lng, courierLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML("<strong>Senderr</strong>"))
          .addTo(mapRef.current);
      }
    } else {
      // Remove courier marker if no location
      if (markersRef.current.courier) {
        markersRef.current.courier.remove();
        markersRef.current.courier = null;
      }
    }
  }, [courierLocation?.lat, courierLocation?.lng]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div
        style={{
          height,
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "8px" }}>Map unavailable</p>
          <p style={{ fontSize: "12px" }}>
            Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
          </p>
          <div
            style={{ marginTop: "16px", fontSize: "14px", textAlign: "left" }}
          >
            <p>📍 Pickup: {pickup.label || `${pickup.lat}, ${pickup.lng}`}</p>
            <p>
              📍 Dropoff: {dropoff.label || `${dropoff.lat}, ${dropoff.lng}`}
            </p>
            {courierLocation && (
              <p>
                🚗 Courier: {courierLocation.lat}, {courierLocation.lng}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} style={{ height, borderRadius: "8px" }} />;
}

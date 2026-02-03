
import { useEffect, useRef, useState } from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapProps {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  courierLocation?: CourierLocation | null;
  pickupProof?: { url: string; location?: { lat: number; lng: number } | null } | null;
  dropoffProof?: { url: string; location?: { lat: number; lng: number } | null } | null;
  height?: string;
}

export function MapboxMap({
  pickup,
  dropoff,
  courierLocation,
  pickupProof,
  dropoffProof,
  height = "400px",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ pickup?: any; dropoff?: any; courier?: any; pickupProof?: any; dropoffProof?: any }>({});
  const [webglSupported, setWebglSupported] = useState(true);
  const [staticMapError, setStaticMapError] = useState(false);

  useEffect(() => {
    // Check if mapbox token is available
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
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

      // @ts-ignore
      if (typeof mapboxgl.supported === "function" && !mapboxgl.supported()) {
        setWebglSupported(false);
        return;
      }

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
          const createPhotoMarker = (url: string) => {
            const el = document.createElement("div");
            el.style.width = "48px";
            el.style.height = "48px";
            el.style.borderRadius = "12px";
            el.style.border = "2px solid #ffffff";
            el.style.backgroundImage = `url(${url})`;
            el.style.backgroundSize = "cover";
            el.style.backgroundPosition = "center";
            el.style.boxShadow = "0 6px 14px rgba(0,0,0,0.2)";
            return el;
          };

          // Add pickup marker (green)
          markersRef.current.pickup = new mapboxgl.Marker({ color: "#16a34a" })
            .setLngLat([pickup.lng, pickup.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>Pickup</strong>${pickup.label ? `<br/>${pickup.label}` : ""}`,
              ),
            )
            .addTo(map);

          if (pickupProof?.location) {
            markersRef.current.pickupProof = new mapboxgl.Marker({ element: createPhotoMarker(pickupProof.url) })
              .setLngLat([pickupProof.location.lng, pickupProof.location.lat])
              .setPopup(new mapboxgl.Popup().setHTML("<strong>Pickup photo</strong>"))
              .addTo(map);
          }

          // Add dropoff marker (red)
          markersRef.current.dropoff = new mapboxgl.Marker({ color: "#dc2626" })
            .setLngLat([dropoff.lng, dropoff.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>Dropoff</strong>${dropoff.label ? `<br/>${dropoff.label}` : ""}`,
              ),
            )
            .addTo(map);

          if (dropoffProof?.location) {
            markersRef.current.dropoffProof = new mapboxgl.Marker({ element: createPhotoMarker(dropoffProof.url) })
              .setLngLat([dropoffProof.location.lng, dropoffProof.location.lat])
              .setPopup(new mapboxgl.Popup().setHTML("<strong>Dropoff photo</strong>"))
              .addTo(map);
          }

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
    pickupProof?.url,
    pickupProof?.location?.lat,
    pickupProof?.location?.lng,
    dropoffProof?.url,
    dropoffProof?.location?.lat,
    dropoffProof?.location?.lng,
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

  useEffect(() => {
    if (!mapRef.current) return;

    // @ts-ignore
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    const createPhotoMarker = (url: string) => {
      const el = document.createElement("div");
      el.style.width = "48px";
      el.style.height = "48px";
      el.style.borderRadius = "12px";
      el.style.border = "2px solid #ffffff";
      el.style.backgroundImage = `url(${url})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.boxShadow = "0 6px 14px rgba(0,0,0,0.2)";
      return el;
    };

    if (pickupProof?.location) {
      if (markersRef.current.pickupProof) {
        markersRef.current.pickupProof.setLngLat([
          pickupProof.location.lng,
          pickupProof.location.lat,
        ]);
      } else {
        markersRef.current.pickupProof = new mapboxgl.Marker({ element: createPhotoMarker(pickupProof.url) })
          .setLngLat([pickupProof.location.lng, pickupProof.location.lat])
          .setPopup(new mapboxgl.Popup().setHTML("<strong>Pickup photo</strong>"))
          .addTo(mapRef.current);
      }
    } else if (markersRef.current.pickupProof) {
      markersRef.current.pickupProof.remove();
      markersRef.current.pickupProof = null;
    }

    if (dropoffProof?.location) {
      if (markersRef.current.dropoffProof) {
        markersRef.current.dropoffProof.setLngLat([
          dropoffProof.location.lng,
          dropoffProof.location.lat,
        ]);
      } else {
        markersRef.current.dropoffProof = new mapboxgl.Marker({ element: createPhotoMarker(dropoffProof.url) })
          .setLngLat([dropoffProof.location.lng, dropoffProof.location.lat])
          .setPopup(new mapboxgl.Popup().setHTML("<strong>Dropoff photo</strong>"))
          .addTo(mapRef.current);
      }
    } else if (markersRef.current.dropoffProof) {
      markersRef.current.dropoffProof.remove();
      markersRef.current.dropoffProof = null;
    }
  }, [
    pickupProof?.url,
    pickupProof?.location?.lat,
    pickupProof?.location?.lng,
    dropoffProof?.url,
    dropoffProof?.location?.lat,
    dropoffProof?.location?.lng,
  ]);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  const buildStaticMapUrl = () => {
    if (!token) return '';
    const markers: string[] = [];
    const addMarker = (color: string, lat?: number, lng?: number) => {
      if (lat == null || lng == null) return;
      markers.push(`pin-s+${color}(${lng},${lat})`);
    };

    addMarker('16a34a', pickup.lat, pickup.lng);
    addMarker('dc2626', dropoff.lat, dropoff.lng);
    addMarker('2563eb', courierLocation?.lat, courierLocation?.lng);

    const overlay = markers.join(',');
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/auto/900x400?access_token=${token}&logo=false&attribution=false`;
  };

  if (!token || !webglSupported) {
    const staticUrl = token && !webglSupported && !staticMapError ? buildStaticMapUrl() : '';
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
        {staticUrl ? (
          <img
            src={staticUrl}
            alt="Trip map"
            style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
            onError={() => setStaticMapError(true)}
          />
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "8px" }}>Map unavailable</p>
            {!token && (
              <p style={{ fontSize: "12px" }}>
                Set VITE_MAPBOX_TOKEN in .env.local
              </p>
            )}
            {token && staticMapError && (
              <p style={{ fontSize: "12px" }}>Failed to load static map image.</p>
            )}
            {token && !webglSupported && (
              <p style={{ fontSize: "12px" }}>WebGL not available in this renderer.</p>
            )}
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
        )}
      </div>
    );
  }

  return <div ref={mapContainer} style={{ height, borderRadius: "8px" }} />;
}

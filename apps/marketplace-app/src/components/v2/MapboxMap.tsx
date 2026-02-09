
import { useEffect, useRef, useState } from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";
import { getMapboxToken } from "@/lib/mapbox/mapbox";

interface ProofMarkerData {
  url: string;
  location?: { lat: number; lng: number } | null;
}

interface MapboxMapProps {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  courierLocation?: CourierLocation | null;
  pickupProof?: ProofMarkerData | null;
  dropoffProof?: ProofMarkerData | null;
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
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const hasCourierLocation =
    !!courierLocation &&
    typeof courierLocation.lat === "number" &&
    typeof courierLocation.lng === "number";
  const useMovingPickupProofMarker =
    !!pickupProof?.url && !dropoffProof?.url && hasCourierLocation;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;

    const loadMapbox = async () => {
      const token = await getMapboxToken();
      if (!isMounted) return;

      setHasToken(!!token);
      if (!token) return;

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

          // Add dropoff marker (red)
          markersRef.current.dropoff = new mapboxgl.Marker({ color: "#dc2626" })
            .setLngLat([dropoff.lng, dropoff.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>Dropoff</strong>${dropoff.label ? `<br/>${dropoff.label}` : ""}`,
              ),
            )
            .addTo(map);

          // Fetch actual route from Mapbox Directions API
          const fetchRoute = async () => {
            try {
              const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&access_token=${token}`;
              const response = await fetch(url);
              const data = await response.json();

              if (data.routes && data.routes[0]) {
                const routeGeometry = data.routes[0].geometry;

                // Add route source and layer
                map.addSource("route", {
                  type: "geojson",
                  data: {
                    type: "Feature",
                    properties: {},
                    geometry: routeGeometry,
                  },
                });

                map.addLayer({
                  id: "route",
                  type: "line",
                  source: "route",
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#3b82f6",
                    "line-width": 4,
                    "line-opacity": 0.75,
                  },
                });
              }

              if (pickupProof?.url && pickupProof?.location) {
                markersRef.current.pickupProof = new mapboxgl.Marker({
                  element: createPhotoMarker(pickupProof.url),
                })
                  .setLngLat([pickupProof.location.lng, pickupProof.location.lat])
                  .setPopup(new mapboxgl.Popup().setHTML("<strong>Pickup photo</strong>"))
                  .addTo(map);
              }

              if (dropoffProof?.url && dropoffProof?.location) {
                markersRef.current.dropoffProof = new mapboxgl.Marker({
                  element: createPhotoMarker(dropoffProof.url),
                })
                  .setLngLat([dropoffProof.location.lng, dropoffProof.location.lat])
                  .setPopup(new mapboxgl.Popup().setHTML("<strong>Dropoff photo</strong>"))
                  .addTo(map);
              }
            } catch (error) {
              console.error("Error fetching route:", error);
              // Fallback to straight line if API fails
              map.addSource("route", {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [pickup.lng, pickup.lat],
                      [dropoff.lng, dropoff.lat],
                    ],
                  },
                },
              });

              map.addLayer({
                id: "route",
                type: "line",
                source: "route",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#3b82f6",
                  "line-width": 4,
                  "line-opacity": 0.75,
                },
              });
            }
          };

          fetchRoute();

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
      isMounted = false;
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

    if (useMovingPickupProofMarker) {
      if (markersRef.current.courier) {
        markersRef.current.courier.remove();
        markersRef.current.courier = null;
      }
      return;
    }

    if (hasCourierLocation && courierLocation) {
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
  }, [
    courierLocation?.lat,
    courierLocation?.lng,
    hasCourierLocation,
    useMovingPickupProofMarker,
  ]);

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

    const pickupMarkerLocation = useMovingPickupProofMarker
      ? {
          lat: courierLocation!.lat,
          lng: courierLocation!.lng,
        }
      : pickupProof?.location;

    if (pickupProof?.url && pickupMarkerLocation) {
      const popupText = useMovingPickupProofMarker
        ? "<strong>Package in transit</strong><br/>Live with your senderr"
        : "<strong>Pickup photo</strong>";

      if (markersRef.current.pickupProof) {
        markersRef.current.pickupProof.setLngLat([
          pickupMarkerLocation.lng,
          pickupMarkerLocation.lat,
        ]);
      } else {
        markersRef.current.pickupProof = new mapboxgl.Marker({ element: createPhotoMarker(pickupProof.url) })
          .setLngLat([pickupMarkerLocation.lng, pickupMarkerLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML(popupText))
          .addTo(mapRef.current);
      }
      markersRef.current.pickupProof.setPopup(
        new mapboxgl.Popup().setHTML(popupText),
      );
    } else if (markersRef.current.pickupProof) {
      markersRef.current.pickupProof.remove();
      markersRef.current.pickupProof = null;
    }

    if (dropoffProof?.url && dropoffProof?.location) {
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
    courierLocation?.lat,
    courierLocation?.lng,
    useMovingPickupProofMarker,
  ]);

  if (hasToken === false) {
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
            Set VITE_MAPBOX_TOKEN or configure public config.
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

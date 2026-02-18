import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { GeoPoint, CourierLocation } from "@/lib/v2/types";
import type { RouteSegment } from "@/lib/navigation/types";
import { fetchDirections } from "@/lib/navigation/directions";
import type {
  Map as MapboxMapInstance,
  Marker as MapboxMarker,
} from "mapbox-gl";

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
  jobMarkers?: Array<{
    id: string;
    location: { lat: number; lng: number };
    label?: string;
    isSelected?: boolean;
  }>;
  onJobMarkerClick?: (jobId: string) => void;
  onMapLoad?: (map: MapboxMapInstance) => void;
  showLabels?: boolean;
  showPopups?: boolean;
  interactive?: boolean;
  autoFit?: boolean;
}

export interface MapboxMapHandle {
  getMap: () => MapboxMapInstance | null;
}

export const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(
  (
    {
      pickup,
      dropoff,
      courierLocation,
      height = "400px",
      routeSegments = [],
      jobMarkers = [],
      onJobMarkerClick,
      onMapLoad,
      showLabels = true,
      showPopups = true,
      interactive = true,
      autoFit = true,
    },
    ref,
  ) => {
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
    const routeAnimationFrameRef = useRef<number | null>(null);
    const lastFitSignatureRef = useRef<string>("");
    const markersRef = useRef<{
      pickup?: MapboxMarker | null;
      dropoff?: MapboxMarker | null;
      courier?: MapboxMarker | null;
      jobs?: Record<string, MapboxMarker>;
    }>({});
    const [mapReady, setMapReady] = useState(false);
    const [fallbackRouteCoordinates, setFallbackRouteCoordinates] = useState<
      [number, number][]
    >([]);

    const PURPLE_ROUTE_COLOR = "#7C3AED";
  const ROUTE_SOURCE_ID = "route-navigation";
  const ROUTE_BASE_LAYER_ID = "route-navigation-base";
  const ROUTE_ANIMATED_LAYER_ID = "route-navigation-animated";

    useImperativeHandle(
      ref,
      () => ({
        getMap: () => mapRef.current,
      }),
      [],
    );

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
          // Treat runtime value as the expected mapbox-gl types
          window.mapboxgl =
            mapboxglModule.default as unknown as typeof import("mapbox-gl");
        }

        const mapboxgl = window.mapboxgl as
          | typeof import("mapbox-gl")
          | undefined;
        if (!mapboxgl || !mapContainer.current) return;

        // Assign token and create the map instance if not already created
        (mapboxgl as unknown as { accessToken?: string }).accessToken =
          token as string;

        if (!mapRef.current) {
          // Use courier location or pickup as initial center
          const initialCenter = isValidLngLat(
            courierLocation?.lng,
            courierLocation?.lat,
          )
            ? [courierLocation!.lng, courierLocation!.lat]
            : isValidLngLat(pickup?.lng, pickup?.lat)
            ? [pickup!.lng, pickup!.lat]
            : [-77.4182, 38.9493]; // Default to DC area

          const mapStyle =
            import.meta.env.VITE_MAPBOX_STYLE_URL ||
            "mapbox://styles/mapbox/dark-v11";

          const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle,
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
              markersRef.current.pickup = new mapboxgl.Marker({
                color: "#16a34a",
              })
                .setLngLat([pickup.lng, pickup.lat])
                .setPopup(
                  new mapboxgl.Popup().setHTML(
                    `<strong>Pickup</strong>${
                      pickup.label ? `<br/>${pickup.label}` : ""
                    }`,
                  ),
                )
                .addTo(map);

              markersRef.current.dropoff = new mapboxgl.Marker({
                color: "#dc2626",
              })
                .setLngLat([dropoff.lng, dropoff.lat])
                .setPopup(
                  new mapboxgl.Popup().setHTML(
                    `<strong>Dropoff</strong>${
                      dropoff.label ? `<br/>${dropoff.label}` : ""
                    }`,
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
        if (routeAnimationFrameRef.current) {
          window.cancelAnimationFrame(routeAnimationFrameRef.current);
          routeAnimationFrameRef.current = null;
        }
        if (markersRef.current.jobs) {
          Object.values(markersRef.current.jobs).forEach((marker) => marker.remove());
          markersRef.current.jobs = {};
        }
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

    useEffect(() => {
      if (routeSegments.length > 0) {
        setFallbackRouteCoordinates([]);
        return;
      }

      if (
        !pickup ||
        !dropoff ||
        !isValidLngLat(pickup.lng, pickup.lat) ||
        !isValidLngLat(dropoff.lng, dropoff.lat)
      ) {
        setFallbackRouteCoordinates([]);
        return;
      }

      let cancelled = false;

      const loadFallbackRoute = async () => {
        try {
          const response = await fetchDirections(
            [
              [pickup.lng, pickup.lat],
              [dropoff.lng, dropoff.lat],
            ],
            {
              profile: "driving-traffic",
              geometries: "geojson",
              overview: "full",
              steps: false,
              bannerInstructions: false,
              voiceInstructions: false,
            },
          );

          const routeCoords =
            response.routes?.[0]?.geometry?.coordinates?.filter(isValidCoord) ||
            [];

          if (!cancelled) {
            if (routeCoords.length >= 2) {
              setFallbackRouteCoordinates(routeCoords);
            } else {
              setFallbackRouteCoordinates([
                [pickup.lng, pickup.lat],
                [dropoff.lng, dropoff.lat],
              ]);
            }
          }
        } catch (error) {
          console.warn("Failed to load fallback route; using straight line", error);
          if (!cancelled) {
            setFallbackRouteCoordinates([
              [pickup.lng, pickup.lat],
              [dropoff.lng, dropoff.lat],
            ]);
          }
        }
      };

      loadFallbackRoute();

      return () => {
        cancelled = true;
      };
    }, [pickup?.lng, pickup?.lat, dropoff?.lng, dropoff?.lat, routeSegments]);

    const fitMapToRoute = () => {
      if (!autoFit || !mapReady || !mapRef.current) return;

      const map = mapRef.current;
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) return;

      const directLineCoordinates: [number, number][] =
        pickup &&
        dropoff &&
        isValidLngLat(pickup.lng, pickup.lat) &&
        isValidLngLat(dropoff.lng, dropoff.lat)
          ? [
              [pickup.lng, pickup.lat],
              [dropoff.lng, dropoff.lat],
            ]
          : [];

      const routeCoordinates =
        routeSegments.length > 0
          ? routeSegments.flatMap((segment) => segment.coordinates || [])
          : fallbackRouteCoordinates.length >= 2
            ? fallbackRouteCoordinates
            : directLineCoordinates;

      const validRouteCoordinates = routeCoordinates.filter(isValidCoord);

      const coordinates = [
        ...validRouteCoordinates,
        ...(pickup && isValidLngLat(pickup.lng, pickup.lat)
          ? [[pickup.lng, pickup.lat] as [number, number]]
          : []),
        ...(dropoff && isValidLngLat(dropoff.lng, dropoff.lat)
          ? [[dropoff.lng, dropoff.lat] as [number, number]]
          : []),
      ];

      if (coordinates.length < 2) return;

      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      const fitSignature = `${coordinates.length}:${first?.[0]?.toFixed(5)},${first?.[1]?.toFixed(5)}:${last?.[0]?.toFixed(5)},${last?.[1]?.toFixed(5)}`;
      if (lastFitSignatureRef.current === fitSignature) {
        return;
      }
      lastFitSignatureRef.current = fitSignature;

      const seed = coordinates.find(isValidCoord);
      if (!seed) return;

      const bounds = new mapboxgl.LngLatBounds(seed, seed);
      coordinates.forEach((coord) => {
        if (isValidCoord(coord)) {
          bounds.extend(coord);
        }
      });

      const container = map.getContainer();
      if (
        !container ||
        container.clientWidth === 0 ||
        container.clientHeight === 0
      ) {
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
        const paddingValue = Math.min(
          60,
          Math.max(12, Math.floor(minSide * 0.2)),
        );
        map.fitBounds(bounds, {
          padding: {
            top: paddingValue,
            right: paddingValue,
            bottom: paddingValue,
            left: paddingValue,
          },
          maxZoom: 15,
          duration: interactive ? 350 : 0,
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
    }, [autoFit, mapReady, pickup, dropoff, routeSegments, fallbackRouteCoordinates]);

    useEffect(() => {
      if (!mapReady || !mapRef.current) {
        return;
      }

      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) return;

      if (
        courierLocation &&
        isValidLngLat(courierLocation.lng, courierLocation.lat)
      ) {
        // Check if marker exists and is the old type (remove it to force recreation)
        if (markersRef.current.courier) {
          const element = markersRef.current.courier.getElement();
          // If it doesn't have our custom class, it's the old default marker - remove it
          if (!element.classList.contains("courier-location-marker")) {
            markersRef.current.courier.remove();
            markersRef.current.courier = null;
          }
        }

        if (markersRef.current.courier) {
          markersRef.current.courier.setLngLat([
            courierLocation.lng,
            courierLocation.lat,
          ]);
        } else {
          // Create custom pulsing marker element
          const el = document.createElement("div");
          el.className = "courier-location-marker";
          el.style.cssText = `
          width: 50px;
          height: 50px;
          position: relative;
        `;

          // Inner blue dot
          const dot = document.createElement("div");
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
          const halo = document.createElement("div");
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
          const style = document.createElement("style");
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

          if (!document.querySelector("#courier-marker-styles")) {
            style.id = "courier-marker-styles";
            document.head.appendChild(style);
          }

          el.appendChild(halo);
          el.appendChild(dot);

          markersRef.current.courier = new mapboxgl.Marker({
            element: el,
            anchor: "center",
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

    useEffect(() => {
      if (!mapReady || !mapRef.current) return;

      const map = mapRef.current;
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) return;

      const existingMarkers = markersRef.current.jobs || {};
      const nextById = new Map(jobMarkers.map((marker) => [marker.id, marker]));

      Object.entries(existingMarkers).forEach(([jobId, marker]) => {
        if (!nextById.has(jobId)) {
          marker.remove();
          delete existingMarkers[jobId];
        }
      });

      jobMarkers.forEach((jobMarker) => {
        if (!isValidLngLat(jobMarker.location.lng, jobMarker.location.lat)) return;

        const existing = existingMarkers[jobMarker.id];
        if (existing) {
          existing.setLngLat([jobMarker.location.lng, jobMarker.location.lat]);
          const el = existing.getElement() as HTMLElement;
          el.style.background = jobMarker.isSelected ? "#a78bfa" : "#7c3aed";
          el.style.width = jobMarker.isSelected ? "20px" : "16px";
          el.style.height = jobMarker.isSelected ? "20px" : "16px";
          el.style.boxShadow = jobMarker.isSelected
            ? "0 0 0 5px rgba(124,58,237,0.35), 0 6px 10px rgba(0,0,0,0.4)"
            : "0 0 0 4px rgba(124,58,237,0.25), 0 4px 8px rgba(0,0,0,0.35)";
          return;
        }

        const el = document.createElement("button");
        el.type = "button";
        el.className = "mapshell-job-pin";
        el.style.cssText = `
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          border: 2px solid rgba(255,255,255,0.95);
          background: ${jobMarker.isSelected ? "#a78bfa" : "#7c3aed"};
          box-shadow: ${jobMarker.isSelected ? "0 0 0 5px rgba(124,58,237,0.35), 0 6px 10px rgba(0,0,0,0.4)" : "0 0 0 4px rgba(124,58,237,0.25), 0 4px 8px rgba(0,0,0,0.35)"};
          transition: box-shadow 120ms ease, background 120ms ease, width 120ms ease, height 120ms ease;
          cursor: pointer;
        `;
        el.title = jobMarker.label || "Open offer";
        el.onclick = (event) => {
          event.stopPropagation();
          onJobMarkerClick?.(jobMarker.id);
        };

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([jobMarker.location.lng, jobMarker.location.lat])
          .addTo(map);

        existingMarkers[jobMarker.id] = marker;
      });

      markersRef.current.jobs = existingMarkers;
    }, [jobMarkers, mapReady, onJobMarkerClick]);

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
        const pickupMarker = new mapboxgl.Marker({
          color: "#16a34a",
        }).setLngLat([pickup.lng, pickup.lat]);

        const dropoffMarker = new mapboxgl.Marker({
          color: "#dc2626",
        }).setLngLat([dropoff.lng, dropoff.lat]);

        if (showPopups) {
          pickupMarker.setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>Pickup</strong>${
                showLabels && pickup.label ? `<br/>${pickup.label}` : ""
              }`,
            ),
          );
          dropoffMarker.setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>Dropoff</strong>${
                showLabels && dropoff.label ? `<br/>${dropoff.label}` : ""
              }`,
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

      const directLineCoordinates: [number, number][] =
        pickup &&
        dropoff &&
        isValidLngLat(pickup.lng, pickup.lat) &&
        isValidLngLat(dropoff.lng, dropoff.lat)
          ? [
              [pickup.lng, pickup.lat],
              [dropoff.lng, dropoff.lat],
            ]
          : [];

      const segmentsToRender =
        routeSegments.length > 0
          ? routeSegments
          : fallbackRouteCoordinates.length >= 2
            ? [
                {
                  type: "navigation" as const,
                  color: PURPLE_ROUTE_COLOR,
                  coordinates: fallbackRouteCoordinates,
                },
              ]
            : directLineCoordinates.length >= 2
              ? [
                  {
                    type: "navigation" as const,
                    color: PURPLE_ROUTE_COLOR,
                    coordinates: directLineCoordinates,
                  },
                ]
            : [];

      const flattenedCoordinates = segmentsToRender
        .flatMap((segment) => segment.coordinates || [])
        .filter(isValidCoord);

      const visibleCoordinates =
        flattenedCoordinates.length >= 2
          ? flattenedCoordinates
          : directLineCoordinates;

      const routeFeature = {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates:
            visibleCoordinates.length >= 2
              ? visibleCoordinates
              : [[0, 0], [0, 0]],
        },
      };

      try {
        const existingSource = map.getSource(ROUTE_SOURCE_ID) as
          | import("mapbox-gl").GeoJSONSource
          | undefined;

        if (existingSource) {
          existingSource.setData(routeFeature);
        } else {
          map.addSource(ROUTE_SOURCE_ID, {
            type: "geojson",
            lineMetrics: true,
            data: routeFeature,
          });
        }

        if (!map.getLayer(ROUTE_BASE_LAYER_ID)) {
          map.addLayer({
            id: ROUTE_BASE_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": PURPLE_ROUTE_COLOR,
              "line-width": 6,
              "line-opacity": 0.42,
            },
          });
        }

        if (!map.getLayer(ROUTE_ANIMATED_LAYER_ID)) {
          map.addLayer({
            id: ROUTE_ANIMATED_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-width": 7,
              "line-opacity": 0.95,
              "line-gradient": [
                "interpolate",
                ["linear"],
                ["line-progress"],
                0,
                "rgba(124,58,237,0.16)",
                0.45,
                "rgba(124,58,237,0.16)",
                0.5,
                "rgba(196,181,253,1)",
                0.55,
                "rgba(124,58,237,0.16)",
                1,
                "rgba(124,58,237,0.16)",
              ],
            },
          });
        }

        const visibleOpacity = visibleCoordinates.length >= 2 ? 1 : 0;
        map.setPaintProperty(
          ROUTE_BASE_LAYER_ID,
          "line-opacity",
          visibleOpacity === 1 ? 0.42 : 0,
        );
        map.setPaintProperty(
          ROUTE_ANIMATED_LAYER_ID,
          "line-opacity",
          visibleOpacity === 1 ? 0.95 : 0,
        );
      } catch (error) {
        console.warn("Failed to render route", error);
      }

      const animateRouteFlow = () => {
        const activeMap = mapRef.current;
        if (!activeMap) return;

        if (!activeMap.getLayer(ROUTE_ANIMATED_LAYER_ID)) {
          routeAnimationFrameRef.current = null;
          return;
        }

        const t = performance.now();
        const progress = (t % 3200) / 3200;
        const start = Math.max(0, progress - 0.2);
        const end = Math.min(1, progress + 0.2);

        const gradientStops: Array<[number, string]> = [
          [0, "rgba(124,58,237,0.16)"],
          [start, "rgba(124,58,237,0.16)"],
          [progress, "rgba(196,181,253,1)"],
          [end, "rgba(124,58,237,0.16)"],
          [1, "rgba(124,58,237,0.16)"],
        ];

        const strictAscendingStops = gradientStops.reduce(
          (accumulator, [input, output]) => {
            const clampedInput = Math.min(1, Math.max(0, input));
            const lastInput = accumulator[accumulator.length - 1]?.[0];

            if (lastInput === undefined || clampedInput > lastInput + 1e-6) {
              accumulator.push([clampedInput, output]);
            }

            return accumulator;
          },
          [] as Array<[number, string]>,
        );

        const lineGradient: Array<number | string | unknown[]> = [
          "interpolate",
          ["linear"],
          ["line-progress"],
        ];

        strictAscendingStops.forEach(([input, output]) => {
          lineGradient.push(input, output);
        });

        activeMap.setPaintProperty(
          ROUTE_ANIMATED_LAYER_ID,
          "line-gradient",
          lineGradient,
        );

        routeAnimationFrameRef.current = window.requestAnimationFrame(
          animateRouteFlow,
        );
      };

      if (!routeAnimationFrameRef.current) {
        routeAnimationFrameRef.current = window.requestAnimationFrame(
          animateRouteFlow,
        );
      }

      return () => {
        if (routeAnimationFrameRef.current) {
          window.cancelAnimationFrame(routeAnimationFrameRef.current);
          routeAnimationFrameRef.current = null;
        }
      };
    }, [routeSegments, mapReady, fallbackRouteCoordinates, pickup, dropoff]);

    const token = import.meta.env.VITE_MAPBOX_TOKEN;

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
              Set VITE_MAPBOX_TOKEN in .env.local
            </p>
            <div
              style={{ marginTop: "16px", fontSize: "14px", textAlign: "left" }}
            >
              {pickup && (
                <p>
                  📍 Pickup:{" "}
                  {showLabels && pickup.label
                    ? pickup.label
                    : "Approximate location"}
                </p>
              )}
              {dropoff && (
                <p>
                  🎯 Dropoff:{" "}
                  {showLabels && dropoff.label
                    ? dropoff.label
                    : "Approximate location"}
                </p>
              )}
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

    return (
      <div
        ref={mapContainer}
        style={{
          height,
          borderRadius: "8px",
          pointerEvents: interactive ? "auto" : "none",
          touchAction: interactive ? "none" : "auto",
          cursor: interactive ? "grab" : "default",
        }}
      />
    );
  },
);

MapboxMap.displayName = "MapboxMap";

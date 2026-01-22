"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapboxMap } from "@/components/v2/MapboxMap";
import type { RouteDoc } from "@gosenderr/shared";

interface RouteDetailsModalProps {
  route: RouteDoc;
  onClose: () => void;
}

export function RouteDetailsModal({ route, onClose }: RouteDetailsModalProps) {
  // Get first and last stops for map
  const pickup = route.optimizedStops[0]?.location || { lat: 0, lng: 0 };
  const dropoff = route.optimizedStops[route.optimizedStops.length - 1]
    ?.location || { lat: 0, lng: 0 };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "24px",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                Route Details
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                {route.routeId}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#f3f4f6",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
            {/* Summary Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#15803d",
                    fontWeight: 500,
                  }}
                >
                  Earnings
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#15803d",
                  }}
                >
                  ${route.pricing.courierEarnings.toFixed(2)}
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#eff6ff",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#1e40af",
                    fontWeight: 500,
                  }}
                >
                  Total Stops
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#1e40af",
                  }}
                >
                  {route.totalJobs}
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "8px",
                  border: "1px solid #fde68a",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#92400e",
                    fontWeight: 500,
                  }}
                >
                  Distance
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#92400e",
                  }}
                >
                  {route.totalDistance.toFixed(1)} mi
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#fce7f3",
                  borderRadius: "8px",
                  border: "1px solid #fbcfe8",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#9f1239",
                    fontWeight: 500,
                  }}
                >
                  Est. Time
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#9f1239",
                  }}
                >
                  {Math.ceil(route.estimatedDuration / 60)} min
                </div>
              </div>
            </div>

            {/* Map */}
            <div
              style={{
                height: "300px",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              <MapboxMap pickup={pickup} dropoff={dropoff} height="300px" />
            </div>

            {/* Stop-by-Stop Breakdown */}
            <div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "16px",
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                Stop-by-Stop Breakdown
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {route.optimizedStops.map((stop, index) => (
                  <div
                    key={stop.jobId}
                    style={{
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "start",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor:
                            index === 0
                              ? "#10b981"
                              : index === route.optimizedStops.length - 1
                                ? "#ef4444"
                                : "#3b82f6",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                          {stop.jobType === "package"
                            ? "📦 Package"
                            : "🍔 Food"}
                        </div>
                        <div style={{ fontSize: "14px", color: "#4b5563" }}>
                          {stop.location.address}
                        </div>
                        {stop.specialRequirements &&
                          stop.specialRequirements.length > 0 && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#9ca3af",
                                marginTop: "4px",
                                fontStyle: "italic",
                              }}
                            >
                              Requirements:{" "}
                              {stop.specialRequirements.join(", ")}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "24px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "12px 24px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "white",
                color: "#374151",
                fontSize: "16px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

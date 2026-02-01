
import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { MapboxMap } from "./MapboxMap";

interface CourierInfo {
  displayName?: string;
  vehicleType?: string;
  vehicleDetails?: {
    make: string;
    model: string;
    color: string;
  };
  averageRating?: number;
}

interface CourierLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt: Timestamp;
}

interface DeliveryPhoto {
  url: string;
  timestamp: Timestamp;
  gpsVerified: boolean;
  accuracy?: number;
  location?: { lat: number; lng: number };
}

interface LiveTripStatusProps {
  jobId: string;
  status: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  courierInfo?: CourierInfo;
  courierLocation?: CourierLocation;
  pickupPhoto?: DeliveryPhoto;
  dropoffPhoto?: DeliveryPhoto;
  estimatedArrivalMinutes?: number;
  onCallCourier?: () => void;
  onMessageCourier?: () => void;
}

export function LiveTripStatus({
  jobId: _jobId,
  status,
  pickup,
  dropoff,
  courierInfo,
  courierLocation,
  pickupPhoto,
  dropoffPhoto,
  estimatedArrivalMinutes,
  onCallCourier,
  onMessageCourier,
}: LiveTripStatusProps) {
  const [lastUpdateSeconds, setLastUpdateSeconds] = useState(0);

  // Calculate time since last location update
  useEffect(() => {
    if (!courierLocation?.updatedAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const lastUpdate = courierLocation.updatedAt.toMillis();
      const seconds = Math.floor((now - lastUpdate) / 1000);
      setLastUpdateSeconds(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [courierLocation?.updatedAt]);

  const getStatusEmoji = () => {
    switch (status) {
      case "open":
        return "🔍";
      case "assigned":
        return "👍";
      case "enroute_pickup":
        return "🚗";
      case "picked_up":
      case "enroute_dropoff":
        return "📦";
      case "completed":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📍";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "open":
        return "Finding Senderr";
      case "assigned":
        return "Senderr Assigned";
      case "enroute_pickup":
        return "Heading to Pickup";
      case "arrived_pickup":
        return "Arrived at Pickup";
      case "picked_up":
        return "Item Picked Up";
      case "enroute_dropoff":
        return "In Transit";
      case "arrived_dropoff":
        return "Arrived at Dropoff";
      case "completed":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "#16a34a";
      case "cancelled":
        return "#dc2626";
      case "enroute_dropoff":
      case "picked_up":
        return "#2563eb";
      default:
        return "#ea580c";
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Status Header */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "32px" }}>{getStatusEmoji()}</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: getStatusColor(),
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {getStatusText()}
            </div>
            {estimatedArrivalMinutes !== undefined &&
              status !== "completed" && (
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                    marginTop: "4px",
                  }}
                >
                  Estimated arrival: {estimatedArrivalMinutes} minutes
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Live Map */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "20px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <MapboxMap
          pickup={pickup}
          dropoff={dropoff}
          courierLocation={courierLocation || null}
          height="400px"
        />
      </div>

      {/* Courier Info */}
      {courierInfo && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "20px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📦 YOUR COURIER
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                {courierInfo.displayName || "Senderr"}
              </div>
              {courierInfo.averageRating && (
                <div style={{ color: "#f59e0b", fontSize: "14px" }}>
                  ⭐ {courierInfo.averageRating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
          {courierInfo.vehicleDetails && (
            <div
              style={{
                background: "#f9fafb",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              🚗 {courierInfo.vehicleDetails.color}{" "}
              {courierInfo.vehicleDetails.make}{" "}
              {courierInfo.vehicleDetails.model}
            </div>
          )}
          {courierLocation && (
            <div
              style={{
                background: "#eff6ff",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#1e40af",
                marginBottom: "16px",
              }}
            >
              📍 Last updated:{" "}
              {lastUpdateSeconds < 60
                ? `${lastUpdateSeconds} seconds ago`
                : `${Math.floor(lastUpdateSeconds / 60)} minutes ago`}
            </div>
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            {onCallCourier && (
              <button
                onClick={onCallCourier}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                📞 Call
              </button>
            )}
            {onMessageCourier && (
              <button
                onClick={onMessageCourier}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                💬 Message
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delivery Progress */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "18px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          📋 DELIVERY PROGRESS
        </h3>

        {/* Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Order Placed */}
          <TimelineItem
            icon="✅"
            title="Order Placed"
            completed={true}
            current={status === "open"}
          />

          {/* Senderr Assigned */}
          <TimelineItem
            icon="✅"
            title="Senderr Assigned"
            completed={status !== "open"}
            current={status === "assigned"}
          />

          {/* Picked Up */}
          <TimelineItem
            icon={
              pickupPhoto
                ? "📸"
                : status === "picked_up" ||
                    status === "enroute_dropoff" ||
                    status === "arrived_dropoff" ||
                    status === "completed"
                  ? "✅"
                  : "⏳"
            }
            title="Picked Up"
            subtitle={pickupPhoto ? "View Pickup Photo" : undefined}
            completed={
              status === "picked_up" ||
              status === "enroute_dropoff" ||
              status === "arrived_dropoff" ||
              status === "completed"
            }
            current={status === "enroute_pickup" || status === "arrived_pickup"}
            photoUrl={pickupPhoto?.url}
            gpsVerified={pickupPhoto?.gpsVerified}
          />

          {/* In Transit */}
          <TimelineItem
            icon={
              status === "enroute_dropoff" ||
              status === "arrived_dropoff" ||
              status === "completed"
                ? "🔵"
                : "⏳"
            }
            title="In Transit"
            subtitle={
              estimatedArrivalMinutes !== undefined &&
              status === "enroute_dropoff"
                ? `${estimatedArrivalMinutes} min away`
                : undefined
            }
            completed={status === "completed"}
            current={
              status === "enroute_dropoff" || status === "arrived_dropoff"
            }
            lastUpdate={
              courierLocation
                ? `Last updated: ${lastUpdateSeconds}s ago`
                : undefined
            }
          />

          {/* Delivered */}
          <TimelineItem
            icon={dropoffPhoto ? "📸" : status === "completed" ? "✅" : "⏳"}
            title="Delivery"
            subtitle={dropoffPhoto ? "View Delivery Photo" : undefined}
            completed={status === "completed"}
            current={false}
            photoUrl={dropoffPhoto?.url}
            gpsVerified={dropoffPhoto?.gpsVerified}
          />
        </div>
      </div>

      {/* Proof Photos */}
      {(pickupPhoto || dropoffPhoto) && status === "completed" && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "20px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            📸 DELIVERY PROOF
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {pickupPhoto && (
              <ProofPhotoCard
                title="Pickup Photo"
                photo={pickupPhoto}
                address={pickup.address}
              />
            )}
            {dropoffPhoto && (
              <ProofPhotoCard
                title="Dropoff Photo"
                photo={dropoffPhoto}
                address={dropoff.address}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  completed: boolean;
  current: boolean;
  photoUrl?: string;
  gpsVerified?: boolean;
  lastUpdate?: string;
}

function TimelineItem({
  icon,
  title,
  subtitle,
  completed,
  current,
  photoUrl,
  gpsVerified,
  lastUpdate,
}: TimelineItemProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: completed ? "#dcfce7" : current ? "#dbeafe" : "#f3f4f6",
          color: completed ? "#16a34a" : current ? "#2563eb" : "#9ca3af",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: completed ? "#000" : current ? "#2563eb" : "#9ca3af",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "2px" }}>
            {subtitle}
          </div>
        )}
        {lastUpdate && (
          <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "2px" }}>
            {lastUpdate}
          </div>
        )}
        {photoUrl && (
          <div style={{ marginTop: "8px" }}>
            <img
              src={photoUrl}
              alt={title}
              style={{
                width: "100%",
                maxWidth: "200px",
                borderRadius: "8px",
                border: "2px solid " + (gpsVerified ? "#16a34a" : "#f59e0b"),
              }}
            />
            {gpsVerified !== undefined && (
              <div
                style={{
                  fontSize: "12px",
                  color: gpsVerified ? "#16a34a" : "#f59e0b",
                  marginTop: "4px",
                }}
              >
                {gpsVerified ? "✅ GPS Verified" : "⚠️ GPS Not Verified"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProofPhotoCardProps {
  title: string;
  photo: DeliveryPhoto;
  address: string;
}

function ProofPhotoCard({ title, photo, address }: ProofPhotoCardProps) {
  return (
    <div>
      <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>
        {title}
      </div>
      <div
        style={{
          position: "relative",
          borderRadius: "8px",
          overflow: "hidden",
          border: "2px solid " + (photo.gpsVerified ? "#16a34a" : "#f59e0b"),
        }}
      >
        <img
          src={photo.url}
          alt={title}
          style={{
            width: "100%",
            display: "block",
            aspectRatio: "4/3",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "8px",
            fontSize: "12px",
          }}
        >
          <div>{photo.timestamp.toDate().toLocaleTimeString()}</div>
          <div style={{ opacity: 0.8 }}>
            {photo.gpsVerified ? "📍 GPS ✅" : "📍 GPS ⚠️"}
            {photo.accuracy && ` (±${Math.round(photo.accuracy)}m)`}
          </div>
        </div>
      </div>
      <button
        style={{
          marginTop: "8px",
          width: "100%",
          padding: "8px",
          background: "#f3f4f6",
          border: "none",
          borderRadius: "6px",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        View Full Size
      </button>
    </div>
  );
}

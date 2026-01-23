"use client";

import { FormEvent, useState } from "react";
import { GeoPoint } from "@/lib/v2/types";

interface JobFormProps {
  onSubmit: (payload: {
    pickup: GeoPoint;
    dropoff: GeoPoint;
  }) => void | Promise<void>;
  loading?: boolean;
  onPickupDropoffChange?: (pickup: any, dropoff: any) => void;
}

export function JobForm({
  onSubmit,
  loading = false,
  onPickupDropoffChange,
}: JobFormProps) {
  const [pickupLabel, setPickupLabel] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");
  const [error, setError] = useState("");

  // Notify parent of coordinate changes for nearby courier query
  const notifyChange = () => {
    if (onPickupDropoffChange) {
      const pLat = parseFloat(pickupLat);
      const pLng = parseFloat(pickupLng);
      const dLat = parseFloat(dropoffLat);
      const dLng = parseFloat(dropoffLng);

      const pickup =
        !isNaN(pLat) && !isNaN(pLng) ? { lat: pLat, lng: pLng } : null;
      const dropoff =
        !isNaN(dLat) && !isNaN(dLng) ? { lat: dLat, lng: dLng } : null;

      onPickupDropoffChange(pickup, dropoff);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropoffLat);
    const dLng = parseFloat(dropoffLng);

    // Validation
    if (isNaN(pLat) || pLat < -90 || pLat > 90) {
      setError("Pickup latitude must be between -90 and 90");
      return;
    }
    if (isNaN(pLng) || pLng < -180 || pLng > 180) {
      setError("Pickup longitude must be between -180 and 180");
      return;
    }
    if (isNaN(dLat) || dLat < -90 || dLat > 90) {
      setError("Dropoff latitude must be between -90 and 90");
      return;
    }
    if (isNaN(dLng) || dLng < -180 || dLng > 180) {
      setError("Dropoff longitude must be between -180 and 180");
      return;
    }

    const payload = {
      pickup: {
        lat: pLat,
        lng: pLng,
        ...(pickupLabel && { label: pickupLabel }),
      },
      dropoff: {
        lat: dLat,
        lng: dLng,
        ...(dropoffLabel && { label: dropoffLabel }),
      },
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "500px" }}>
      <h3 style={{ marginBottom: "20px" }}>Pickup Location</h3>
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}
        >
          Label (optional)
        </label>
        <input
          type="text"
          value={pickupLabel}
          onChange={(e) => setPickupLabel(e.target.value)}
          placeholder="e.g., Home, Office"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}
          >
            Latitude *
          </label>
          <input
            type="number"
            step="any"
            value={pickupLat}
            onChange={(e) => {
              setPickupLat(e.target.value);
              setTimeout(notifyChange, 300);
            }}
            placeholder="37.7749"
            required
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}
          >
            Longitude *
          </label>
          <input
            type="number"
            step="any"
            value={pickupLng}
            onChange={(e) => {
              setPickupLng(e.target.value);
              setTimeout(notifyChange, 300);
            }}
            placeholder="-122.4194"
            required
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>
      </div>

      <h3 style={{ marginBottom: "20px" }}>Dropoff Location</h3>
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}
        >
          Label (optional)
        </label>
        <input
          type="text"
          value={dropoffLabel}
          onChange={(e) => setDropoffLabel(e.target.value)}
          placeholder="e.g., Restaurant, Store"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}
          >
            Latitude *
          </label>
          <input
            type="number"
            step="any"
            value={dropoffLat}
            onChange={(e) => {
              setDropoffLat(e.target.value);
              setTimeout(notifyChange, 300);
            }}
            placeholder="37.7849"
            required
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}
          >
            Longitude *
          </label>
          <input
            type="number"
            step="any"
            value={dropoffLng}
            onChange={(e) => {
              setDropoffLng(e.target.value);
              setTimeout(notifyChange, 300);
            }}
            placeholder="-122.4094"
            required
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px",
            background: "#fee",
            color: "#c00",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "12px 24px",
          background: loading ? "#ccc" : "#6E56CF",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Creating..." : "Create Send"}
      </button>
    </form>
  );
}

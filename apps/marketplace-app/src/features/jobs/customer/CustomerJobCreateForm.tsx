
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { PackageDetailsForm } from "@/components/v2/PackageDetailsForm";
import { PhotoUploader, PhotoFile } from "@/components/v2/PhotoUploader";
import { useNearbyCouriers } from "@/hooks/v2/useNearbyCouriers";
import { EquipmentBadges } from "@/components/v2/EquipmentBadges";
import { createJob } from "@/lib/v2/jobs";
import { calcMiles, calcFee } from "@/lib/v2/pricing";
import { FLOOR_RATE_CARD } from "@/lib/v2/floorRateCard";
import { GeoPoint, PackageSize, PackageFlags } from "@/lib/v2/types";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const createTempJobId = () => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return `temp_${Date.now()}_${cryptoObj.randomUUID()}`;
  }
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Secure random generator unavailable");
  }
  const bytes = new Uint32Array(2);
  cryptoObj.getRandomValues(bytes);
  const suffix = Array.from(bytes, (value) => value.toString(36)).join("");
  return `temp_${Date.now()}_${suffix}`;
};

interface CustomerJobCreateFormProps {
  uid: string;
}

export function CustomerJobCreateForm({ uid }: CustomerJobCreateFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [packageSize, setPackageSize] = useState<PackageSize | null>(null);
  const [packageFlags, setPackageFlags] = useState<PackageFlags>({});
  const [packageNotes, setPackageNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const { settings: platformSettings } = usePlatformSettings();

  // Generate a stable temporary job ID for this session
  const [tempJobId] = useState(createTempJobId);

  const { couriers, loading: couriersLoading } = useNearbyCouriers(
    pickup,
    dropoff,
  );

  // Calculate minimum estimate
  const { jobMiles, minEstimate, estimateSource } = useMemo(() => {
    if (!pickup || !dropoff) {
      return { jobMiles: 0, minEstimate: 0, estimateSource: "none" };
    }

    const miles = calcMiles(pickup, dropoff);
    const eligibleCouriers = couriers.filter((c) => c.eligible);

    if (eligibleCouriers.length > 0) {
      // Use lowest fee from eligible couriers
      const minFee = Math.min(...eligibleCouriers.map((c) => c.estimatedFee));
      return {
        jobMiles: miles,
        minEstimate: minFee,
        estimateSource: "couriers" as const,
      };
    } else {
      // Use floor rate card
      const floorFee = calcFee(FLOOR_RATE_CARD, miles, undefined, "car");
      return {
        jobMiles: miles,
        minEstimate: floorFee,
        estimateSource: "floor" as const,
      };
    }
  }, [pickup, dropoff, couriers]);

  const eligibleCouriers = useMemo(
    () => couriers.filter((c) => c.eligible),
    [couriers],
  );

  const selectedCourier = useMemo(() => {
    if (!selectedCourierId) return null;
    return eligibleCouriers.find((courier) => courier.uid === selectedCourierId) || null;
  }, [eligibleCouriers, selectedCourierId]);

  const vehicleIcons: Record<string, string> = {
    foot: "🚶",
    bike: "🚴",
    scooter: "🛴",
    motorcycle: "🏍️",
    car: "🚗",
    van: "🚐",
    truck: "🚚",
  };

  const canSubmit = pickup && dropoff && packageSize !== null && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const eligibleQueue = eligibleCouriers.map((courier) => courier.uid);
      const defaultCourierId = eligibleQueue[0] || null;
      const preferredCourierUid = selectedCourierId || defaultCourierId;
      const offerQueue = preferredCourierUid
        ? [preferredCourierUid, ...eligibleQueue.filter((id) => id !== preferredCourierUid)]
        : [];
      const offerExpiresAt = preferredCourierUid
        ? Timestamp.fromDate(new Date(Date.now() + 90 * 1000))
        : null;

      const courierRate = selectedCourier?.estimatedFee ?? minEstimate;
      const platformFee = platformSettings.platformFeePackage ?? 2.5;
      const totalAmount = courierRate + platformFee;

      const jobId = await createJob(uid, {
        pickup,
        dropoff,
        package: {
          size: packageSize,
          flags: packageFlags,
          ...(packageNotes && { notes: packageNotes }),
        },
        photos: photos
          .filter((p) => p.url)
          .map((p) => ({
            url: p.url!,
            path: p.path!,
            uploadedAt: Timestamp.now(),
            uploadedBy: uid,
          })),
        preferredCourierUid,
        offerCourierUid: preferredCourierUid,
        offerQueue,
        offerStatus: preferredCourierUid ? "pending" : "open",
        offerExpiresAt,
        pricing: {
          courierRate,
          platformFee,
          totalAmount,
        },
        paymentStatus: "pending",
      });

      navigate(`/jobs/${jobId}`);
    } catch (error) {
      console.error("Failed to create job:", error);
      alert("Failed to create job. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}
        >
          Create New Delivery
        </h1>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Fill in the details to request a courier
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          padding: "24px",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <AddressAutocomplete
            label="Pickup Address"
            placeholder="Enter pickup address"
            onSelect={(result) => {
              setPickup({
                lat: result.lat,
                lng: result.lng,
                label: result.address,
              });
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <AddressAutocomplete
            label="Dropoff Address"
            placeholder="Enter dropoff address"
            onSelect={(result) => {
              setDropoff({
                lat: result.lat,
                lng: result.lng,
                label: result.address,
              });
            }}
          />
        </div>

        {/* Package Details Form */}
        <div style={{ marginBottom: "24px" }}>
          <PackageDetailsForm
            size={packageSize}
            flags={packageFlags}
            notes={packageNotes}
            onSizeChange={setPackageSize}
            onFlagsChange={setPackageFlags}
            onNotesChange={setPackageNotes}
          />
        </div>

        {/* Photo Upload */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Package Photos (Optional)
          </label>
          <PhotoUploader
            jobId={tempJobId}
            userId={uid}
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
          />
        </div>

        {/* Estimate Section */}
        {pickup && dropoff && (
          <div
            style={{
              padding: "16px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <div style={{ fontSize: "14px", marginBottom: "8px" }}>
              <strong>Distance:</strong> {jobMiles.toFixed(2)} miles
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: "600", color: "#16a34a" }}
            >
              Estimated from ${minEstimate.toFixed(2)}
            </div>
            {estimateSource === "floor" && (
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
              >
                Based on floor rate (no couriers nearby)
              </div>
            )}
            {estimateSource === "couriers" && (
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
              >
                {eligibleCouriers.length} eligible courier(s) nearby
              </div>
            )}
            {couriersLoading && (
              <div
                style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}
              >
                Searching for nearby couriers...
              </div>
            )}
            {couriers.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <style>
                  {`@keyframes courier-pop {0%{opacity:0;transform:translateY(6px) scale(0.98);}100%{opacity:1;transform:translateY(0) scale(1);}}`}
                </style>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#14532d",
                    marginBottom: "8px",
                  }}
                >
                  Nearby couriers
                </div>
                <div style={{ display: "grid", gap: "10px" }}>
                  {couriers.map((courier, index) => (
                    <div
                      key={courier.uid}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        border:
                          selectedCourierId === courier.uid
                            ? "2px solid #16a34a"
                            : "1px solid #d1fae5",
                        background:
                          selectedCourierId === courier.uid
                            ? "#ecfdf5"
                            : "white",
                        animation: "courier-pop 0.35s ease",
                        animationDelay: `${index * 40}ms`,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedCourierId(courier.uid)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "8px" }}>
                          <div style={{ fontSize: "18px" }}>
                            {vehicleIcons[courier.transportMode] || "🚗"}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600 }}>
                              {courier.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {courier.pickupMiles.toFixed(1)} mi to pickup
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>
                            ${courier.estimatedFee.toFixed(2)}
                          </div>
                          <div style={{ fontSize: "11px", color: courier.eligible ? "#16a34a" : "#dc2626" }}>
                            {courier.eligible ? "Eligible" : "Not eligible"}
                          </div>
                        </div>
                      </div>
                      {selectedCourierId === courier.uid && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>
                          Selected courier (hybrid match)
                        </div>
                      )}
                      {courier.equipmentBadges.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <EquipmentBadges equipment={courier.equipmentBadges} size="sm" />
                        </div>
                      )}
                      {!courier.eligible && courier.reason && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "#dc2626" }}>
                          {courier.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "14px",
            background: canSubmit ? "#16a34a" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Creating Send..." : "Create Send"}
        </button>
      </form>
    </div>
  );
}


import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { PackageDetailsForm } from "@/components/v2/PackageDetailsForm";
import { PhotoUploader, PhotoFile } from "@/components/v2/PhotoUploader";
import { useNearbyCouriers } from "@/hooks/v2/useNearbyCouriers";
import { createJob } from "@/lib/v2/jobs";
import { calcMiles, calcFee } from "@/lib/v2/pricing";
import { FLOOR_RATE_CARD } from "@/lib/v2/floorRateCard";
import { GeoPoint, PackageSize, PackageFlags } from "@/lib/v2/types";

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

  const canSubmit = pickup && dropoff && packageSize !== null && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
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
      });

      navigate(`/customer/jobs/${jobId}`);
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
                {couriers.filter((c) => c.eligible).length} eligible courier(s)
                nearby
              </div>
            )}
            {couriersLoading && (
              <div
                style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}
              >
                Searching for nearby couriers...
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

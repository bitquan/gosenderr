
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
import { createFoodPickupRestaurantFromMarketplace, markFoodPickupRestaurantUsed } from "@/lib/foodPickup";

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
  contributorName?: string;
  initialPickup?: GeoPoint | null;
  initialPickupLabel?: string;
  initialRestaurantName?: string;
  initialRestaurantId?: string;
}

export function CustomerJobCreateForm({
  uid,
  contributorName = "Customer",
  initialPickup = null,
  initialPickupLabel = "",
  initialRestaurantName = "",
  initialRestaurantId = "",
}: CustomerJobCreateFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState<GeoPoint | null>(initialPickup);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [packageSize, setPackageSize] = useState<PackageSize | null>(null);
  const [packageFlags, setPackageFlags] = useState<PackageFlags>({});
  const [packageNotes, setPackageNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const { settings: platformSettings } = usePlatformSettings();

  const [pickupLabel, setPickupLabel] = useState(
    initialPickup?.label || initialPickupLabel || "",
  );
  const [restaurantContext, setRestaurantContext] = useState(
    initialRestaurantName,
  );
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId);
  const [showPickupPicker, setShowPickupPicker] = useState(!initialPickup);
  const [showQuickRestaurantForm, setShowQuickRestaurantForm] = useState(false);
  const [quickRestaurantName, setQuickRestaurantName] = useState("");
  const [quickRestaurantAddress, setQuickRestaurantAddress] = useState("");
  const [quickRestaurantLat, setQuickRestaurantLat] = useState<number | null>(null);
  const [quickRestaurantLng, setQuickRestaurantLng] = useState<number | null>(null);
  const [quickRestaurantTags, setQuickRestaurantTags] = useState("");
  const [quickRestaurantHours, setQuickRestaurantHours] = useState("");
  const [quickRestaurantNotes, setQuickRestaurantNotes] = useState("");
  const [quickRestaurantSaving, setQuickRestaurantSaving] = useState(false);
  const [quickRestaurantMessage, setQuickRestaurantMessage] = useState("");

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
  const canSaveQuickRestaurant =
    !!quickRestaurantName.trim() &&
    !!quickRestaurantAddress.trim() &&
    quickRestaurantLat !== null &&
    quickRestaurantLng !== null &&
    !quickRestaurantSaving;

  const handleQuickRestaurantSave = async () => {
    if (!canSaveQuickRestaurant) return;

    setQuickRestaurantSaving(true);
    setQuickRestaurantMessage("");
    try {
      const newRestaurantId = await createFoodPickupRestaurantFromMarketplace(
        uid,
        contributorName,
        {
          restaurantName: quickRestaurantName,
          address: quickRestaurantAddress,
          lat: quickRestaurantLat!,
          lng: quickRestaurantLng!,
          cuisineTags: quickRestaurantTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          pickupHours: quickRestaurantHours,
          notes: quickRestaurantNotes,
        },
      );

      setPickup({
        lat: quickRestaurantLat!,
        lng: quickRestaurantLng!,
        label: quickRestaurantAddress,
      });
      setPickupLabel(quickRestaurantAddress);
      setRestaurantContext(quickRestaurantName.trim());
      setRestaurantId(newRestaurantId);
      setShowPickupPicker(false);
      setShowQuickRestaurantForm(false);
      setQuickRestaurantName("");
      setQuickRestaurantAddress("");
      setQuickRestaurantLat(null);
      setQuickRestaurantLng(null);
      setQuickRestaurantTags("");
      setQuickRestaurantHours("");
      setQuickRestaurantNotes("");
      setQuickRestaurantMessage("Restaurant added and selected for this order.");
    } catch (error) {
      console.error("Failed to quick-add restaurant:", error);
      setQuickRestaurantMessage("Could not add restaurant right now.");
    } finally {
      setQuickRestaurantSaving(false);
    }
  };

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
        foodPickupRestaurantId: restaurantId || null,
        foodPickupRestaurantName: restaurantContext || null,
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

      if (restaurantId) {
        markFoodPickupRestaurantUsed(restaurantId, uid).catch((usageError) => {
          console.warn("Unable to record food pickup restaurant usage:", usageError);
        });
      }

      navigate(`/jobs/${jobId}`);
    } catch (error) {
      console.error("Failed to create job:", error);
      alert("Failed to create job. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "640px", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}
        >
          Create New Delivery
        </h1>
        <p style={{ fontSize: "14px", color: "#cbd5e1" }}>
          Fill in the details to request a courier
        </p>
        {restaurantContext && (
          <p style={{ fontSize: "13px", color: "#d8b4fe" }}>
            Ordering for pickup at <strong>{restaurantContext}</strong>
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "linear-gradient(160deg, rgba(55, 24, 115, 0.88), rgba(37, 16, 90, 0.92))",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid rgba(196, 181, 253, 0.4)",
          color: "#f8fafc",
        }}
      >
      {!pickup || showPickupPicker ? (
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
              setPickupLabel(result.address);
              setRestaurantContext("");
              setRestaurantId("");
              setShowPickupPicker(false);
            }}
            value={pickupLabel}
          />
          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => setShowQuickRestaurantForm((current) => !current)}
              style={{
                border: "none",
                background: "transparent",
                color: "#c4b5fd",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showQuickRestaurantForm
                ? "Close quick add"
                : "Can't find the restaurant? Add it now"}
            </button>
            {quickRestaurantMessage && (
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                {quickRestaurantMessage}
              </div>
            )}
          </div>
          {showQuickRestaurantForm && (
            <div
              style={{
                marginTop: "12px",
                border: "1px solid rgba(196, 181, 253, 0.45)",
                borderRadius: "12px",
                background: "rgba(30, 41, 59, 0.5)",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", color: "#e9d5ff" }}>
                Quick add restaurant
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px" }}>
                  Restaurant name *
                </label>
                <input
                  type="text"
                  value={quickRestaurantName}
                  onChange={(event) => setQuickRestaurantName(event.target.value)}
                  placeholder="Example: Northside Deli"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(196, 181, 253, 0.5)",
                    background: "rgba(15, 23, 42, 0.5)",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
              </div>
              <AddressAutocomplete
                label="Restaurant pickup address"
                placeholder="Enter restaurant address"
                onSelect={(result) => {
                  setQuickRestaurantAddress(result.address);
                  setQuickRestaurantLat(result.lat);
                  setQuickRestaurantLng(result.lng);
                }}
                value={quickRestaurantAddress}
                required
              />
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px" }}>
                  Tags (optional)
                </label>
                <input
                  type="text"
                  value={quickRestaurantTags}
                  onChange={(event) => setQuickRestaurantTags(event.target.value)}
                  placeholder="burgers, vegan, halal"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(196, 181, 253, 0.5)",
                    background: "rgba(15, 23, 42, 0.5)",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px" }}>
                  Pickup hours (optional)
                </label>
                <input
                  type="text"
                  value={quickRestaurantHours}
                  onChange={(event) => setQuickRestaurantHours(event.target.value)}
                  placeholder="Mon-Fri 11am-9pm"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(196, 181, 253, 0.5)",
                    background: "rgba(15, 23, 42, 0.5)",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px" }}>
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={quickRestaurantNotes}
                  onChange={(event) => setQuickRestaurantNotes(event.target.value)}
                  placeholder="Pickup counter details"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(196, 181, 253, 0.5)",
                    background: "rgba(15, 23, 42, 0.5)",
                    color: "#fff",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleQuickRestaurantSave}
                disabled={!canSaveQuickRestaurant}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "none",
                  borderRadius: "8px",
                  background: canSaveQuickRestaurant ? "#22c55e" : "#64748b",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: canSaveQuickRestaurant ? "pointer" : "not-allowed",
                }}
              >
                {quickRestaurantSaving ? "Adding restaurant..." : "Add and use this restaurant"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            marginBottom: "24px",
            borderRadius: "16px",
            border: "1px solid #d1d5db",
            padding: "16px",
            background: "rgba(30, 41, 59, 0.6)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#cbd5e1" }}>
                Pickup location
              </p>
              <p style={{ fontSize: "18px", fontWeight: 600, margin: "4px 0" }}>
                {restaurantContext || pickupLabel || "Selected restaurant"}
              </p>
              <p style={{ fontSize: "14px", color: "#e2e8f0" }}>
                {pickupLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPickupPicker(true);
                setPickup(null);
                setPickupLabel("");
                setRestaurantContext("");
                setRestaurantId("");
              }}
              style={{
                color: "#7c3aed",
                fontWeight: 600,
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Change
            </button>
          </div>
        </div>
      )}

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
              background: "rgba(16, 185, 129, 0.16)",
              border: "1px solid rgba(52, 211, 153, 0.5)",
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
                style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}
              >
                Based on floor rate (no couriers nearby)
              </div>
            )}
            {estimateSource === "couriers" && (
              <div
                style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}
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

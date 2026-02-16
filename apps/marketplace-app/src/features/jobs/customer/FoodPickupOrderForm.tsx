import { FormEvent, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FoodPickupRestaurantDoc, FoodTemperature } from "@gosenderr/shared";

import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { EquipmentBadges } from "@/components/v2/EquipmentBadges";
import { PhotoUploader, PhotoFile } from "@/components/v2/PhotoUploader";
import { useNearbyCouriers } from "@/hooks/v2/useNearbyCouriers";
import { toCityZipLabel } from "@/lib/foodPickup";
import { createJob } from "@/lib/v2/jobs";
import { GeoPoint } from "@/lib/v2/types";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface FoodPickupOrderFormProps {
  uid: string;
  restaurant: FoodPickupRestaurantDoc;
}

const vehicleIcons: Record<string, string> = {
  foot: "🚶",
  bike: "🚴",
  scooter: "🛴",
  motorcycle: "🏍️",
  car: "🚗",
  van: "🚐",
  truck: "🚚",
};

const createTempJobId = () => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return `temp_food_${Date.now()}_${cryptoObj.randomUUID()}`;
  }
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Secure random generator unavailable");
  }
  const bytes = new Uint32Array(2);
  cryptoObj.getRandomValues(bytes);
  const suffix = Array.from(bytes, (value) => value.toString(36)).join("");
  return `temp_food_${Date.now()}_${suffix}`;
};

export function FoodPickupOrderForm({ uid, restaurant }: FoodPickupOrderFormProps) {
  const navigate = useNavigate();
  const { settings: platformSettings } = usePlatformSettings();

  const [loading, setLoading] = useState(false);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<FoodTemperature>("hot");
  const [customerNotes, setCustomerNotes] = useState("");
  const [confirmationName, setConfirmationName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [confirmationPhotos, setConfirmationPhotos] = useState<PhotoFile[]>([]);
  const [tempJobId] = useState(createTempJobId);

  const pickupPoint: GeoPoint = useMemo(
    () => ({
      lat: restaurant.location.lat,
      lng: restaurant.location.lng,
      label: restaurant.location.address,
    }),
    [restaurant.location.address, restaurant.location.lat, restaurant.location.lng],
  );
  const pickupCityZip = useMemo(() => toCityZipLabel(restaurant), [restaurant]);

  const { couriers, loading: couriersLoading } = useNearbyCouriers(
    pickupPoint,
    dropoff,
    { jobType: "food" },
  );

  const eligibleCouriers = useMemo(
    () => couriers.filter((courier) => courier.eligible),
    [couriers],
  );

  const selectedCourier = useMemo(
    () => couriers.find((courier) => courier.uid === selectedCourierId) ?? null,
    [couriers, selectedCourierId],
  );

  const minEstimate = useMemo(() => {
    if (!eligibleCouriers.length) return null;
    return Math.min(...eligibleCouriers.map((courier) => courier.estimatedFee));
  }, [eligibleCouriers]);

  const uploadedConfirmationPhotos = useMemo(
    () =>
      confirmationPhotos
        .filter((photo): photo is PhotoFile & { url: string; path: string } => Boolean(photo.uploaded && photo.url && photo.path))
        .map((photo) => ({
          url: photo.url,
          path: photo.path,
        })),
    [confirmationPhotos],
  );

  const hasUploadingConfirmationPhotos = useMemo(
    () => confirmationPhotos.some((photo) => photo.uploading),
    [confirmationPhotos],
  );

  const canSubmit =
    !!dropoff &&
    !!selectedCourier &&
    selectedCourier.eligible &&
    confirmationName.trim().length > 0 &&
    uploadedConfirmationPhotos.length > 0 &&
    !hasUploadingConfirmationPhotos &&
    !loading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !selectedCourier || !dropoff) return;

    setLoading(true);
    try {
      const eligibleQueue = eligibleCouriers.map((courier) => courier.uid);
      const preferredCourierUid = selectedCourier.uid;
      const offerQueue = [
        preferredCourierUid,
        ...eligibleQueue.filter((id) => id !== preferredCourierUid),
      ];
      const offerExpiresAt = Timestamp.fromDate(new Date(Date.now() + 90 * 1000));

      const courierRate = selectedCourier.estimatedFee;
      const platformFee = platformSettings.platformFeeFood ?? 1.5;
      const totalAmount = courierRate + platformFee;
      const cleanedCustomerNotes = customerNotes.trim();
      const cleanedConfirmationName = confirmationName.trim();
      const cleanedOrderNumber = orderNumber.trim();
      const cleanedPickupCode = pickupCode.trim();
      const cleanedPickupInstructions = pickupInstructions.trim();

      const noteParts = [
        `Food pickup from ${restaurant.restaurantName}`,
        `Confirmation name: ${cleanedConfirmationName}`,
      ];
      if (cleanedOrderNumber) {
        noteParts.push(`Order #: ${cleanedOrderNumber}`);
      }
      if (cleanedPickupCode) {
        noteParts.push(`Pickup code: ${cleanedPickupCode}`);
      }
      if (cleanedPickupInstructions) {
        noteParts.push(`Pickup instructions: ${cleanedPickupInstructions}`);
      }
      if (cleanedCustomerNotes) {
        noteParts.push(`Customer notes: ${cleanedCustomerNotes}`);
      }

      const jobId = await createJob(uid, {
        jobType: "food",
        foodDetails: {
          restaurantId: restaurant.id,
          restaurantName: restaurant.restaurantName,
          temperature,
          customerNotes: cleanedCustomerNotes || null,
          confirmationName: cleanedConfirmationName,
          orderNumber: cleanedOrderNumber || null,
          pickupCode: cleanedPickupCode || null,
          pickupInstructions: cleanedPickupInstructions || null,
          confirmationPhotoUrls: uploadedConfirmationPhotos.map((photo) => photo.url),
          requiresHotBag: temperature === "hot",
          requiresCooler: temperature === "cold" || temperature === "frozen",
        },
        pickup: pickupPoint,
        dropoff,
        package: {
          size: "small",
          notes: noteParts.join(" • "),
        },
        photos: uploadedConfirmationPhotos.map((photo) => ({
          url: photo.url,
          path: photo.path,
          uploadedAt: Timestamp.now(),
          uploadedBy: uid,
        })),
        preferredCourierUid,
        offerCourierUid: preferredCourierUid,
        offerQueue,
        offerStatus: "pending",
        offerExpiresAt,
        pricing: {
          courierRate,
          platformFee,
          totalAmount,
        },
        paymentStatus: "pending",
      });

      navigate(`/jobs/${jobId}`);
    } catch (submitError) {
      console.error("Failed to create food pickup job:", submitError);
      alert("Could not create food pickup request. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", paddingBottom: "48px" }}>
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/food-pickups")}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "999px",
            padding: "8px 14px",
            fontSize: "13px",
            marginBottom: "14px",
            background: "white",
            cursor: "pointer",
          }}
        >
          ← Back to food pickup map
        </button>
        <h1 style={{ fontSize: "30px", fontWeight: "700", marginBottom: "6px" }}>
          Request Food Pickup
        </h1>
        <p style={{ color: "#4b5563", fontSize: "15px" }}>
          {restaurant.restaurantName} · {pickupCityZip}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          padding: "20px",
          display: "grid",
          gap: "18px",
        }}
      >
        <div
          style={{
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <div style={{ fontWeight: 600, color: "#1e3a8a", marginBottom: "4px" }}>
            Pickup spot
          </div>
          <div style={{ color: "#1f2937", fontSize: "14px" }}>{pickupCityZip}</div>
          <div style={{ color: "#475569", fontSize: "12px", marginTop: "4px" }}>
            Exact address is shared with assigned courier during fulfillment.
          </div>
        </div>

        <AddressAutocomplete
          label="Dropoff address"
          placeholder="Enter where food should be delivered"
          required
          onSelect={(result) => {
            setDropoff({
              lat: result.lat,
              lng: result.lng,
              label: result.address,
            });
          }}
        />

        <div style={{ display: "grid", gap: "10px" }}>
          <label style={{ fontSize: "14px", fontWeight: 600 }}>Food temperature</label>
          <select
            value={temperature}
            onChange={(event) => setTemperature(event.target.value as FoodTemperature)}
            style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px" }}
          >
            <option value="hot">Hot</option>
            <option value="cold">Cold</option>
            <option value="frozen">Frozen</option>
            <option value="room_temp">Room Temp</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <label style={{ fontSize: "14px", fontWeight: 600 }}>Customer notes</label>
          <textarea
            value={customerNotes}
            onChange={(event) => setCustomerNotes(event.target.value)}
            rows={3}
            placeholder="Order details, gate code, handoff instructions..."
            style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px" }}
          />
        </div>

        <div
          style={{
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            borderRadius: "12px",
            padding: "12px",
            display: "grid",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "#1e3a8a", marginBottom: "4px" }}>
              Order confirmation for courier
            </div>
            <div style={{ color: "#1e40af", fontSize: "13px" }}>
              Add confirmation details and at least 1 photo so courier can verify pickup.
            </div>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>
              Confirmation name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              placeholder="Name on the order"
              required
              style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px" }}
            />
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Order number (optional)</label>
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="e.g. #A1234"
              style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px" }}
            />
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Pickup code (optional)</label>
            <input
              value={pickupCode}
              onChange={(event) => setPickupCode(event.target.value)}
              placeholder="If restaurant requires a code"
              style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px" }}
            />
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Courier pickup instructions (optional)</label>
            <textarea
              value={pickupInstructions}
              onChange={(event) => setPickupInstructions(event.target.value)}
              rows={2}
              placeholder="Counter location, ask for manager, etc."
              style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px" }}
            />
          </div>

          <div>
            <PhotoUploader
              jobId={tempJobId}
              userId={uid}
              photos={confirmationPhotos}
              onPhotosChange={setConfirmationPhotos}
              maxPhotos={4}
              label="Order confirmation photos (required)"
              helperText="Upload at least 1 photo of receipt/order confirmation. JPG, PNG, WEBP. Max 10MB each."
            />
            <div style={{ marginTop: "8px", fontSize: "13px", color: uploadedConfirmationPhotos.length > 0 ? "#166534" : "#b45309" }}>
              {hasUploadingConfirmationPhotos
                ? "Uploading confirmation photos..."
                : `${uploadedConfirmationPhotos.length} confirmation photo(s) ready.`}
            </div>
          </div>
        </div>

        {dropoff && (
          <div
            style={{
              border: "1px solid #dcfce7",
              background: "#f0fdf4",
              borderRadius: "12px",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#166534", marginBottom: "6px" }}>
              Courier matching
            </div>
            {couriersLoading ? (
              <div style={{ fontSize: "13px", color: "#166534" }}>Finding food-enabled couriers...</div>
            ) : (
              <div style={{ fontSize: "13px", color: "#166534" }}>
                {eligibleCouriers.length} eligible courier(s)
                {minEstimate != null ? ` · Starts around $${minEstimate.toFixed(2)}` : ""}
              </div>
            )}
          </div>
        )}

        {dropoff && couriers.length > 0 && (
          <div style={{ display: "grid", gap: "10px" }}>
            {couriers.map((courier) => (
              <button
                type="button"
                key={courier.uid}
                onClick={() => setSelectedCourierId(courier.uid)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: "12px",
                  border: selectedCourierId === courier.uid ? "2px solid #16a34a" : "1px solid #d1d5db",
                  background: selectedCourierId === courier.uid ? "#ecfdf5" : "white",
                  padding: "12px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ fontSize: "18px" }}>{vehicleIcons[courier.transportMode] || "🚗"}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{courier.name}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {courier.pickupMiles.toFixed(1)} mi to pickup
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#166534" }}>
                      ${courier.estimatedFee.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "12px", color: courier.eligible ? "#166534" : "#dc2626" }}>
                      {courier.eligible ? "Eligible" : "Not eligible"}
                    </div>
                  </div>
                </div>
                {courier.equipmentBadges.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <EquipmentBadges equipment={courier.equipmentBadges} size="sm" />
                  </div>
                )}
                {!courier.eligible && courier.reason && (
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#dc2626" }}>
                    {courier.reason}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "16px",
            fontWeight: 700,
            background: canSubmit ? "#16a34a" : "#9ca3af",
            color: "white",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading
            ? "Creating food request..."
            : hasUploadingConfirmationPhotos
              ? "Finish photo upload to continue"
              : "Request Food Pickup"}
        </button>
      </form>
    </div>
  );
}

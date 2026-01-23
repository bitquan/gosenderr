"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserRole } from "@/hooks/v2/useUserRole";
import { db, storage } from "@/lib/firebase/client";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { geocodeAddress, GeocodedAddress } from "@/lib/mapbox/geocode";
import type {
  ItemCategory,
  ItemCondition,
  FoodTemperature,
} from "@/lib/v2/types";

const CATEGORIES: Array<{ value: ItemCategory; label: string }> = [
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
];

const CONDITIONS: Array<{ value: ItemCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const TEMPERATURES: Array<{ value: FoodTemperature; label: string }> = [
  { value: "hot", label: "Hot" },
  { value: "cold", label: "Cold" },
  { value: "frozen", label: "Frozen" },
  { value: "room_temp", label: "Room Temperature" },
];

export default function CreateItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ItemCategory>("other");
  const [condition, setCondition] = useState<ItemCondition>("good");
  const [deliveryMethods, setDeliveryMethods] = useState<
    Array<"delivery" | "pickup">
  >(["delivery"]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);

  // Location
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    GeocodedAddress[]
  >([]);
  const [selectedAddress, setSelectedAddress] =
    useState<GeocodedAddress | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Food-specific fields
  const [temperature, setTemperature] = useState<FoodTemperature>("room_temp");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [pickupPhoto, setPickupPhoto] = useState<File | null>(null);
  const [pickupPhotoPreview, setPickupPhotoPreview] = useState<string | null>(
    null,
  );
  const [requiresCooler, setRequiresCooler] = useState(false);
  const [requiresHotBag, setRequiresHotBag] = useState(false);
  const [requiresDrinkCarrier, setRequiresDrinkCarrier] = useState(false);

  const [error, setError] = useState("");

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      photosPreviews.forEach((url) => URL.revokeObjectURL(url));
      if (pickupPhotoPreview) {
        URL.revokeObjectURL(pickupPhotoPreview);
      }
    };
  }, [photosPreviews, pickupPhotoPreview]);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/marketplace/create");
    }
  }, [user, authLoading, router]);

  // Geocode address
  useEffect(() => {
    if (addressQuery.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const results = await geocodeAddress(addressQuery);
      setAddressSuggestions(results);
    }, 300);

    return () => clearTimeout(timeout);
  }, [addressQuery]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      setError("Maximum 5 photos allowed");
      return;
    }

    setPhotos([...photos, ...files]);

    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotosPreviews([...photosPreviews, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    // Revoke the URL to prevent memory leak
    URL.revokeObjectURL(photosPreviews[index]);

    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photosPreviews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotosPreviews(newPreviews);
  };

  const handlePickupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPickupPhoto(file);
    setPickupPhotoPreview(URL.createObjectURL(file));
  };

  const selectAddress = (address: GeocodedAddress) => {
    setSelectedAddress(address);
    setAddressQuery(address.address);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!user) {
      setError("You must be logged in");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError("Valid price is required");
      return;
    }

    if (!selectedAddress) {
      setError("Please select a pickup location");
      return;
    }

    if (deliveryMethods.length === 0) {
      setError("Please select at least one delivery option");
      return;
    }

    if (category === "food" && !pickupInstructions.trim()) {
      setError("Pickup instructions are required for food items");
      return;
    }

    setLoading(true);

    try {
      // Create item ID
      const itemId = doc(collection(db, "items")).id;

      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const storageRef = ref(
          storage,
          `items/${user.uid}/photo-${itemId}-${i}.jpg`,
        );
        await uploadBytes(storageRef, photo);
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }

      // Upload pickup reference photo if food item
      let pickupPhotoUrl: string | null = null;
      if (category === "food" && pickupPhoto) {
        const pickupRef = ref(
          storage,
          `items/${user.uid}/pickup-${itemId}.jpg`,
        );
        await uploadBytes(pickupRef, pickupPhoto);
        pickupPhotoUrl = await getDownloadURL(pickupRef);
      }

      // Create item document
      const itemData = {
        sellerId: user.uid,
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        condition,
        deliveryMethods,
        photos: photoUrls,
        pickupLocation: {
          address: selectedAddress.address,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
        },
        itemDetails: {
          requiresHelp: false,
        },
        isFoodItem: category === "food",
        ...(category === "food" && {
          foodDetails: {
            temperature,
            pickupInstructions: pickupInstructions.trim(),
            ...(pickupPhotoUrl && { pickupPhotoUrl }),
            requiresCooler,
            requiresHotBag,
            requiresDrinkCarrier,
          },
        }),
        status: "available",
        createdAt: Timestamp.now(),
      };

      // Save to Firestore
      await setDoc(doc(db, "items", itemId), itemData);

      // Redirect to item page
      router.push(`/marketplace/${itemId}`);
    } catch (err: any) {
      console.error("Failed to create item:", err);
      setError(err.message || "Failed to create listing");
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Show upgrade prompt for non-vendors
  if (!roleLoading && role && role !== "vendor") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            maxWidth: "500px",
            width: "100%",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🏪</div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1f2937",
              marginBottom: "16px",
            }}
          >
            Become a Vendor
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#6b7280",
              lineHeight: "1.6",
              marginBottom: "32px",
            }}
          >
            Start selling your items on the GoSenderr marketplace! Vendors can
            create listings, manage inventory, and earn money.
          </p>

          <div
            style={{
              background: "#f9fafb",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#1f2937",
                marginBottom: "12px",
              }}
            >
              Vendor Benefits:
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: "14px",
                color: "#4b5563",
              }}
            >
              <li style={{ marginBottom: "8px" }}>✅ List unlimited items</li>
              <li style={{ marginBottom: "8px" }}>
                💰 Integrated Stripe payments
              </li>
              <li style={{ marginBottom: "8px" }}>
                📦 Automatic delivery coordination
              </li>
              <li style={{ marginBottom: "8px" }}>📊 Sales analytics</li>
            </ul>
          </div>

          <button
            onClick={async () => {
              if (!user) return;
              const { doc, updateDoc, serverTimestamp } =
                await import("firebase/firestore");
              await updateDoc(doc(db, "users", user.uid), {
                role: "vendor",
                updatedAt: serverTimestamp(),
              });
              router.push("/vendor/onboarding");
            }}
            style={{
              width: "100%",
              padding: "14px",
              background: "#6E56CF",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "12px",
            }}
          >
            Upgrade to Vendor
          </button>

          <button
            onClick={() => router.push("/marketplace")}
            style={{
              width: "100%",
              padding: "14px",
              background: "white",
              color: "#6b7280",
              border: "2px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const isFoodItem = category === "food";

  return (
    <div style={{ padding: "12px", maxWidth: "600px", margin: "0 auto" }}>
      <button
        onClick={() => router.push("/marketplace")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: "#6E56CF",
          background: "none",
          border: "none",
          padding: "8px 0",
          marginBottom: "12px",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        ← Back to Marketplace
      </button>

      <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>
        List an Item
      </h1>

      {error && (
        <div
          style={{
            padding: "12px",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "6px",
            color: "#c00",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., iPhone 13 Pro"
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item..."
            required
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Price */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Price *
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ItemCategory)}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Condition *
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as ItemCondition)}
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            {CONDITIONS.map((cond) => (
              <option key={cond.value} value={cond.value}>
                {cond.label}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery Method */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Delivery Options * (select at least one)
          </label>
          <div style={{ display: "flex", gap: "12px" }}>
            <label
              style={{
                flex: 1,
                padding: "12px",
                border: `2px solid ${deliveryMethods.includes("delivery") ? "#6E56CF" : "#ddd"}`,
                borderRadius: "8px",
                cursor: "pointer",
                background: deliveryMethods.includes("delivery")
                  ? "#f5f3ff"
                  : "white",
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={deliveryMethods.includes("delivery")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDeliveryMethods([...deliveryMethods, "delivery"]);
                  } else {
                    setDeliveryMethods(
                      deliveryMethods.filter((m) => m !== "delivery"),
                    );
                  }
                }}
                style={{ marginRight: "8px" }}
              />
              <strong>🚚 Delivery</strong>
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
              >
                Driver picks up and delivers (fees apply)
              </div>
            </label>
            <label
              style={{
                flex: 1,
                padding: "12px",
                border: `2px solid ${deliveryMethods.includes("pickup") ? "#6E56CF" : "#ddd"}`,
                borderRadius: "8px",
                cursor: "pointer",
                background: deliveryMethods.includes("pickup")
                  ? "#f5f3ff"
                  : "white",
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={deliveryMethods.includes("pickup")}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDeliveryMethods([...deliveryMethods, "pickup"]);
                  } else {
                    setDeliveryMethods(
                      deliveryMethods.filter((m) => m !== "pickup"),
                    );
                  }
                }}
                style={{ marginRight: "8px" }}
              />
              <strong>📦 Pickup</strong>
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
              >
                Buyer picks up in person (FREE - no fees)
              </div>
            </label>
          </div>
          {deliveryMethods.includes("pickup") && (
            <div
              style={{
                marginTop: "8px",
                padding: "8px 12px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#1e40af",
              }}
            >
              💡{" "}
              {deliveryMethods.length === 2
                ? "Buyers can choose delivery or pickup."
                : "Pickup orders are completely free - no Stripe fees, no platform fees."}
            </div>
          )}
        </div>

        {/* Photos */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Photos (max 5)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            disabled={photos.length >= 5}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
          {photosPreviews.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "8px",
                flexWrap: "wrap",
              }}
            >
              {photosPreviews.map((preview, index) => (
                <div
                  key={index}
                  style={{
                    position: "relative",
                    width: "80px",
                    height: "80px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    border: "1px solid #ddd",
                  }}
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      cursor: "pointer",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pickup Location */}
        <div style={{ marginBottom: "16px", position: "relative" }}>
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Pickup Location *
          </label>
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => {
              setAddressQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Enter address..."
            required
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
          {showSuggestions && addressSuggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginTop: "4px",
                maxHeight: "200px",
                overflowY: "auto",
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {addressSuggestions.map((addr, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectAddress(addr)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#111827",
                    borderBottom:
                      index < addressSuggestions.length - 1
                        ? "1px solid #eee"
                        : "none",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#f5f5f5")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  {addr.address}
                </button>
              ))}
            </div>
          )}
          {selectedAddress && (
            <div
              style={{ marginTop: "6px", fontSize: "13px", color: "#16a34a" }}
            >
              ✓ Selected: {selectedAddress.address}
            </div>
          )}
        </div>

        {/* Food-specific fields */}
        {isFoodItem && (
          <>
            <div
              style={{
                marginTop: "24px",
                marginBottom: "16px",
                paddingTop: "16px",
                borderTop: "2px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Food Delivery Details
              </h2>
            </div>

            {/* Temperature */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                Temperature *
              </label>
              <select
                value={temperature}
                onChange={(e) =>
                  setTemperature(e.target.value as FoodTemperature)
                }
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                {TEMPERATURES.map((temp) => (
                  <option key={temp.value} value={temp.value}>
                    {temp.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pickup Instructions */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                Pickup Instructions *
              </label>
              <textarea
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                placeholder="e.g., Ring doorbell, food is on the porch table"
                required
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Pickup Reference Photo */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                Pickup Reference Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePickupPhotoChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
              {pickupPhotoPreview && (
                <img
                  src={pickupPhotoPreview}
                  alt="Pickup reference"
                  style={{
                    marginTop: "8px",
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                  }}
                />
              )}
            </div>

            {/* Equipment checkboxes */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "8px",
                  fontSize: "14px",
                }}
              >
                Required Equipment
              </label>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={requiresCooler}
                    onChange={(e) => setRequiresCooler(e.target.checked)}
                    style={{ marginRight: "8px" }}
                  />
                  Requires Cooler
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={requiresHotBag}
                    onChange={(e) => setRequiresHotBag(e.target.checked)}
                    style={{ marginRight: "8px" }}
                  />
                  Requires Hot Bag
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={requiresDrinkCarrier}
                    onChange={(e) => setRequiresDrinkCarrier(e.target.checked)}
                    style={{ marginRight: "8px" }}
                  />
                  Requires Drink Carrier
                </label>
              </div>
            </div>
          </>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#ccc" : "#6E56CF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "8px",
          }}
        >
          {loading ? "Creating..." : "List Item"}
        </button>
      </form>
    </div>
  );
}

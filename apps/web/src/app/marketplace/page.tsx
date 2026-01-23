"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAvailableItems, Item } from "@/lib/v2/items";
import { ItemCard } from "@/features/marketplace/ItemCard";
import type { ItemCategory } from "@/lib/v2/types";

const CATEGORIES: Array<{ value: ItemCategory | "all"; label: string }> = [
  { value: "all", label: "All Items" },
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
];

type SortOption = "newest" | "price_low" | "price_high" | "distance";

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    ItemCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState(false);

  // Handle successful checkout
  useEffect(() => {
    const checkoutSuccess = searchParams?.get("checkout");
    const orderId = searchParams?.get("order");

    if (checkoutSuccess === "success" && orderId) {
      handleCheckoutSuccess(orderId);
    }
  }, [searchParams]);

  const handleCheckoutSuccess = async (orderId: string) => {
    try {
      console.log("Processing successful checkout for order:", orderId);

      // Get the order
      const orderRef = doc(db, "marketplaceOrders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        console.error("Order not found:", orderId);
        return;
      }

      const orderData = orderSnap.data();

      // Check if already processed
      if (orderData.status === "paid" || orderData.jobId) {
        console.log("Order already processed");
        router.replace("/marketplace");
        return;
      }

      // Check if pickup order
      if (orderData.deliveryMethod === "pickup") {
        await updateDoc(orderRef, {
          status: "pending_pickup",
          paymentStatus: "paid",
          updatedAt: serverTimestamp(),
        });
        console.log("Pickup order marked as paid");
        router.replace("/marketplace");
        return;
      }

      // Get item data
      const itemRef = doc(db, "items", orderData.itemId);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        console.error("Item not found:", orderData.itemId);
        return;
      }

      const itemData = itemSnap.data();

      // Create job for couriers
      const jobData = {
        createdByUid: orderData.buyerId,
        courierUid: orderData.courierId || null, // Pre-selected courier
        agreedFee: orderData.deliveryFee || null,
        status: orderData.courierId ? "assigned" : "open", // If courier pre-selected, mark as assigned
        pickup: {
          lat: itemData.pickupLocation?.lat || 0,
          lng: itemData.pickupLocation?.lng || 0,
          label: itemData.pickupLocation?.address || "Pickup location",
        },
        dropoff: {
          lat: orderData.dropoffAddress?.lat || 0,
          lng: orderData.dropoffAddress?.lng || 0,
          label: orderData.dropoffAddress?.address || "Dropoff location",
        },
        package: {
          size: itemData.isFoodItem ? "small" : "medium",
          notes: `Marketplace delivery: ${orderData.itemTitle}`,
        },
        photos: [],
        // Marketplace-specific metadata
        marketplaceOrderId: orderId,
        itemId: orderData.itemId,
        itemTitle: orderData.itemTitle,
        itemPrice: orderData.itemPrice,
        sellerId: orderData.sellerId,
        deliveryFee: orderData.deliveryFee,
        distance: orderData.distance,
        estimatedMinutes: orderData.estimatedMinutes,
        ...(itemData.isFoodItem && {
          isFoodItem: true,
          foodDetails: itemData.foodDetails || {},
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const jobRef = await addDoc(collection(db, "jobs"), jobData);
      console.log("Created job:", jobRef.id);

      // Update order
      await updateDoc(orderRef, {
        status: "paid",
        paymentStatus: "paid",
        jobId: jobRef.id,
        updatedAt: serverTimestamp(),
      });

      console.log("Order updated with job ID");

      // Show success message and redirect
      alert(
        "Order placed successfully! A courier will accept your delivery soon.",
      );
      router.replace("/marketplace");
    } catch (error) {
      console.error("Error processing checkout success:", error);
    }
  };

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Failed to get location:", error);
          setLocationError(true);
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
        },
      );
    }
  }, []);

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      try {
        const data = await getAvailableItems();
        setItems(data);
      } catch (error) {
        console.error("Failed to load items:", error);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDescription = item.description
          .toLowerCase()
          .includes(query);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      // Price filter
      if (minPrice && item.price < parseFloat(minPrice)) {
        return false;
      }
      if (maxPrice && item.price > parseFloat(maxPrice)) {
        return false;
      }

      // Distance filter
      if (maxDistance && userLocation && item.pickupLocation) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          item.pickupLocation.lat,
          item.pickupLocation.lng,
        );
        if (distance > parseFloat(maxDistance)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return a.price - b.price;
        case "price_high":
          return b.price - a.price;
        case "distance":
          if (!userLocation || !a.pickupLocation || !b.pickupLocation) return 0;
          const distA = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            a.pickupLocation.lat,
            a.pickupLocation.lng,
          );
          const distB = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            b.pickupLocation.lat,
            b.pickupLocation.lng,
          );
          return distA - distB;
        case "newest":
        default:
          return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
    });

  if (loading) {
    return (
      <div style={{ padding: "30px" }}>
        <h1 style={{ margin: "0 0 30px 0" }}>Marketplace</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "20px" }}>Marketplace</h1>
        <a
          href="/marketplace/create"
          style={{
            padding: "8px 14px",
            background: "#6E56CF",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          + List Item
        </a>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "12px" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              style={{
                padding: "6px 12px",
                border:
                  selectedCategory === category.value
                    ? "2px solid #6E56CF"
                    : "1px solid #ddd",
                background:
                  selectedCategory === category.value ? "#f5f3ff" : "white",
                color: selectedCategory === category.value ? "#6E56CF" : "#666",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: selectedCategory === category.value ? "600" : "400",
                fontSize: "13px",
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Sort */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min price"
            min="0"
            step="0.01"
            style={{
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max price"
            min="0"
            step="0.01"
            style={{
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          <input
            type="number"
            value={maxDistance}
            onChange={(e) => setMaxDistance(e.target.value)}
            placeholder="Max distance (mi)"
            min="0"
            disabled={!userLocation}
            style={{
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "13px",
              opacity: userLocation ? 1 : 0.5,
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="distance" disabled={!userLocation}>
              Distance {!userLocation && "(location needed)"}
            </option>
          </select>
        </div>

        {locationError && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
            📍 Enable location to use distance filter
          </div>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <p style={{ fontSize: "14px" }}>
            {items.length === 0
              ? "No items yet. Be the first to list an item!"
              : "No items match your filters."}
          </p>
        </div>
      ) : (
        <>
          <div
            style={{ marginBottom: "12px", color: "#666", fontSize: "13px" }}
          >
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "item" : "items"}
            {selectedCategory !== "all" &&
              ` in ${CATEGORIES.find((c) => c.value === selectedCategory)?.label}`}
          </div>

          {/* Grid - Compact for mobile (2-3 columns) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

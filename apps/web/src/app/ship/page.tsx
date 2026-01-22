"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useRouter } from "next/navigation";
import { GlassCard, LoadingSkeleton } from "@/components/GlassCard";
import {
  ServiceLevel,
  HubDoc,
  PackageJourneyLeg,
  LegType,
  FeatureFlags,
} from "@gosenderr/shared";

interface AddressData {
  address: string;
  lat: number;
  lng: number;
  nearestHub?: HubDoc;
  distanceToHub?: number;
}

interface PackageDetails {
  weight: string;
  length: string;
  width: string;
  height: string;
  declaredValue: string;
  fragile: boolean;
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculatePricing(
  localPickupDistance: number,
  localDeliveryDistance: number,
  longHaulLegs: number,
  serviceLevel: ServiceLevel,
) {
  const localPickup = Math.max(10, localPickupDistance * 1.5);
  const localDelivery = Math.max(10, localDeliveryDistance * 1.5);
  const longHaulPerLeg = 50;
  const longHaulTotal = longHaulLegs * longHaulPerLeg;

  let serviceLevelMultiplier = 1.0;
  if (serviceLevel === "express") serviceLevelMultiplier = 1.5;
  if (serviceLevel === "priority") serviceLevelMultiplier = 2.0;

  const subtotal =
    (localPickup + localDelivery + longHaulTotal) * serviceLevelMultiplier;
  const platformFee = 5.0;
  const total = subtotal + platformFee;

  return {
    localPickup,
    localDelivery,
    longHaulLegs: Array(longHaulLegs).fill(longHaulPerLeg),
    platformFee,
    total,
  };
}

export default function ShipPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [hubs, setHubs] = useState<HubDoc[]>([]);

  // Form state
  const [fromAddress, setFromAddress] = useState<AddressData | null>(null);
  const [toAddress, setToAddress] = useState<AddressData | null>(null);
  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    weight: "",
    length: "",
    width: "",
    height: "",
    declaredValue: "",
    fragile: false,
  });
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("standard");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadFeatureFlagsAndHubs();
  }, []);

  const loadFeatureFlagsAndHubs = async () => {
    try {
      setLoading(true);

      // Load feature flags
      const flagsDoc = await getDoc(doc(db, "featureFlags", "config"));
      if (flagsDoc.exists()) {
        const flags = flagsDoc.data() as FeatureFlags;
        if (!flags.customer?.packageShipping) {
          setError("Package shipping is not currently available");
          setLoading(false);
          return;
        }
        setFeatureEnabled(true);
      } else {
        setFeatureEnabled(true);
      }

      // Load hubs
      const hubsSnapshot = await getDocs(collection(db, "hubs"));
      const hubsData = hubsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        hubId: doc.id,
      })) as HubDoc[];
      setHubs(hubsData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load required data");
    } finally {
      setLoading(false);
    }
  };

  const findNearestHub = (
    lat: number,
    lng: number,
  ): { hub: HubDoc; distance: number } | null => {
    if (hubs.length === 0) return null;

    let nearest: { hub: HubDoc; distance: number } | null = null;
    for (const hub of hubs) {
      const distance = calculateDistance(
        lat,
        lng,
        hub.location.lat,
        hub.location.lng,
      );
      if (!nearest || distance < nearest.distance) {
        nearest = { hub, distance };
      }
    }
    return nearest;
  };

  const handleFromAddressChange = (
    address: string,
    lat: number,
    lng: number,
  ) => {
    const nearestHubData = findNearestHub(lat, lng);
    setFromAddress({
      address,
      lat,
      lng,
      nearestHub: nearestHubData?.hub,
      distanceToHub: nearestHubData?.distance,
    });
  };

  const handleToAddressChange = (address: string, lat: number, lng: number) => {
    const nearestHubData = findNearestHub(lat, lng);
    setToAddress({
      address,
      lat,
      lng,
      nearestHub: nearestHubData?.hub,
      distanceToHub: nearestHubData?.distance,
    });
  };

  const calculateJourney = (): PackageJourneyLeg[] => {
    if (!fromAddress?.nearestHub || !toAddress?.nearestHub) return [];

    const journey: PackageJourneyLeg[] = [];
    let legNumber = 1;

    // Leg 1: Local pickup
    journey.push({
      legNumber: legNumber++,
      type: "local_pickup",
      hubId: fromAddress.nearestHub.hubId,
      status: "pending",
    });

    // Leg 2+: Long haul legs (simplified - just one leg for now)
    if (fromAddress.nearestHub.hubId !== toAddress.nearestHub.hubId) {
      journey.push({
        legNumber: legNumber++,
        type: "long_haul",
        fromHub: fromAddress.nearestHub.hubId,
        toHub: toAddress.nearestHub.hubId,
        status: "pending",
      });
    }

    // Last leg: Local delivery
    journey.push({
      legNumber: legNumber++,
      type: "local_delivery",
      hubId: toAddress.nearestHub.hubId,
      status: "pending",
    });

    return journey;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !fromAddress || !toAddress) return;

    // Validation
    if (!fromAddress.nearestHub || !toAddress.nearestHub) {
      setError("Could not determine nearest hubs for addresses");
      return;
    }

    if (
      !packageDetails.weight ||
      !packageDetails.length ||
      !packageDetails.width ||
      !packageDetails.height ||
      !packageDetails.declaredValue
    ) {
      setError("Please fill in all package details");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const journey = calculateJourney();
      const longHaulLegs = journey.filter(
        (leg) => leg.type === "long_haul",
      ).length;

      const pricing = calculatePricing(
        fromAddress.distanceToHub || 0,
        toAddress.distanceToHub || 0,
        longHaulLegs,
        serviceLevel,
      );

      const volume =
        parseFloat(packageDetails.length) *
        parseFloat(packageDetails.width) *
        parseFloat(packageDetails.height);

      const trackingNumber = `PKG${Date.now().toString().slice(-10)}`;

      // Calculate estimated delivery
      let daysToDeliver = 5;
      if (serviceLevel === "express") daysToDeliver = 3;
      if (serviceLevel === "priority") daysToDeliver = 1;
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + daysToDeliver);

      // Create Stripe Payment Intent
      const paymentResponse = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(pricing.total * 100), // Convert to cents
          currency: "usd",
          metadata: {
            trackingNumber,
            userId: user.uid,
            serviceLevel,
          },
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret, paymentIntentId } = await paymentResponse.json();

      // Create package document with payment intent
      const packageDoc = {
        packageId: trackingNumber,
        trackingNumber,
        senderId: user.uid,
        recipientId: "", // Would be set in a real app
        origin: {
          address: fromAddress.address,
          location: { lat: fromAddress.lat, lng: fromAddress.lng },
          hubId: fromAddress.nearestHub.hubId,
          hubDistance: fromAddress.distanceToHub || 0,
        },
        destination: {
          address: toAddress.address,
          location: { lat: toAddress.lat, lng: toAddress.lng },
          hubId: toAddress.nearestHub.hubId,
          hubDistance: toAddress.distanceToHub || 0,
        },
        weight: parseFloat(packageDetails.weight),
        dimensions: {
          length: parseFloat(packageDetails.length),
          width: parseFloat(packageDetails.width),
          height: parseFloat(packageDetails.height),
        },
        volume,
        declaredValue: parseFloat(packageDetails.declaredValue),
        fragile: packageDetails.fragile,
        serviceLevel,
        estimatedDelivery,
        journey,
        pricing: {
          customerPaid: pricing.total,
          breakdown: {
            localPickup: pricing.localPickup,
            longHaulLegs: pricing.longHaulLegs,
            localDelivery: pricing.localDelivery,
            platformFee: pricing.platformFee,
          },
        },
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntentId,
        currentStatus: "payment_pending",
        currentLeg: 0,
        scans: [],
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "packages"), packageDoc);

      // Redirect to payment confirmation page with client secret
      router.push(
        `/ship/confirmation/${docRef.id}?payment_intent_client_secret=${clientSecret}`,
      );
    } catch (err) {
      console.error("Failed to create package:", err);
      setError("Failed to create shipment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div
        className="container"
        style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}
      >
        <GlassCard>
          <LoadingSkeleton lines={5} />
        </GlassCard>
      </div>
    );
  }

  if (!featureEnabled || error) {
    return (
      <div
        className="container"
        style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}
      >
        <GlassCard>
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              padding: "16px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            {error || "Package shipping is not available"}
          </div>
        </GlassCard>
      </div>
    );
  }

  const journey = fromAddress && toAddress ? calculateJourney() : [];
  const longHaulLegs = journey.filter((leg) => leg.type === "long_haul").length;
  const pricing =
    fromAddress && toAddress
      ? calculatePricing(
          fromAddress.distanceToHub || 0,
          toAddress.distanceToHub || 0,
          longHaulLegs,
          serviceLevel,
        )
      : null;

  return (
    <div
      className="container"
      style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "32px" }}>
        Ship a Package
      </h1>

      <form onSubmit={handleSubmit}>
        <GlassCard style={{ marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Addresses</h2>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
            >
              From Address <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter pickup address"
              onChange={(e) => {
                // In a real app, this would use AddressAutocomplete component
                // For now, simulate with manual input
                const parts = e.target.value.split(",");
                if (parts.length >= 2) {
                  handleFromAddressChange(e.target.value, 37.7749, -122.4194);
                }
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
              }}
              required
            />
            {fromAddress?.nearestHub && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  backgroundColor: "#eff6ff",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#1e40af",
                }}
              >
                📍 Nearest Hub: {fromAddress.nearestHub.name} (
                {fromAddress.distanceToHub?.toFixed(1)} miles away)
              </div>
            )}
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
            >
              To Address <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter delivery address"
              onChange={(e) => {
                // In a real app, this would use AddressAutocomplete component
                const parts = e.target.value.split(",");
                if (parts.length >= 2) {
                  handleToAddressChange(e.target.value, 40.7128, -74.006);
                }
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
              }}
              required
            />
            {toAddress?.nearestHub && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  backgroundColor: "#eff6ff",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#1e40af",
                }}
              >
                📍 Nearest Hub: {toAddress.nearestHub.name} (
                {toAddress.distanceToHub?.toFixed(1)} miles away)
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard style={{ marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Package Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Weight (lbs) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={packageDetails.weight}
                onChange={(e) =>
                  setPackageDetails({
                    ...packageDetails,
                    weight: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Declared Value ($) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={packageDetails.declaredValue}
                onChange={(e) =>
                  setPackageDetails({
                    ...packageDetails,
                    declaredValue: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
                required
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Length (in) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={packageDetails.length}
                onChange={(e) =>
                  setPackageDetails({
                    ...packageDetails,
                    length: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Width (in) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={packageDetails.width}
                onChange={(e) =>
                  setPackageDetails({
                    ...packageDetails,
                    width: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                Height (in) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={packageDetails.height}
                onChange={(e) =>
                  setPackageDetails({
                    ...packageDetails,
                    height: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
                required
              />
            </div>
          </div>

          <div>
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
                checked={packageDetails.fragile}
                onChange={(e) =>
                  setPackageDetails({
                    ...packageDetails,
                    fragile: e.target.checked,
                  })
                }
                style={{ marginRight: "8px", width: "18px", height: "18px" }}
              />
              This package is fragile
            </label>
          </div>
        </GlassCard>

        <GlassCard style={{ marginBottom: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Service Level</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
            }}
          >
            {(["standard", "express", "priority"] as ServiceLevel[]).map(
              (level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setServiceLevel(level)}
                  style={{
                    padding: "16px",
                    backgroundColor:
                      serviceLevel === level ? "#dbeafe" : "#f9fafb",
                    border:
                      serviceLevel === level
                        ? "2px solid #3b82f6"
                        : "2px solid #e5e7eb",
                    borderRadius: "8px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "4px",
                      textTransform: "capitalize",
                    }}
                  >
                    {level}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {level === "standard" && "5-7 days"}
                    {level === "express" && "2-3 days"}
                    {level === "priority" && "Next day"}
                  </div>
                </button>
              ),
            )}
          </div>
        </GlassCard>

        {journey.length > 0 && (
          <GlassCard style={{ marginBottom: "20px" }}>
            <h2 style={{ marginTop: 0 }}>Journey Preview</h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {journey.map((leg, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {leg.legNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: "2px" }}>
                      {leg.type === "local_pickup" && "📦 Local Pickup"}
                      {leg.type === "long_haul" && "🚚 Long Haul Transport"}
                      {leg.type === "local_delivery" && "🏠 Local Delivery"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>
                      {leg.type === "local_pickup" &&
                        `To ${fromAddress?.nearestHub?.name}`}
                      {leg.type === "long_haul" &&
                        `${fromAddress?.nearestHub?.name} → ${toAddress?.nearestHub?.name}`}
                      {leg.type === "local_delivery" &&
                        `From ${toAddress?.nearestHub?.name}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {pricing && (
          <GlassCard style={{ marginBottom: "20px" }}>
            <h2 style={{ marginTop: 0 }}>Price Breakdown</h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span>Local Pickup</span>
                <span>${pricing.localPickup.toFixed(2)}</span>
              </div>
              {pricing.longHaulLegs.map((cost, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <span>Long Haul Transport #{index + 1}</span>
                  <span>${cost.toFixed(2)}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span>Local Delivery</span>
                <span>${pricing.localDelivery.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span>Platform Fee</span>
                <span>${pricing.platformFee.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px 0",
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                <span>Total</span>
                <span style={{ color: "#059669" }}>
                  ${pricing.total.toFixed(2)}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !fromAddress || !toAddress}
          style={{
            width: "100%",
            padding: "16px",
            backgroundColor:
              submitting || !fromAddress || !toAddress ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: 600,
            cursor:
              submitting || !fromAddress || !toAddress
                ? "not-allowed"
                : "pointer",
          }}
        >
          {submitting ? "Processing..." : "Ship Package & Pay"}
        </button>
      </form>
    </div>
  );
}

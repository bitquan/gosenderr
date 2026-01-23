"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { PackageRateCardBuilder } from "@/components/v2/PackageRateCardBuilder";
import { FoodRateCardBuilder } from "@/components/v2/FoodRateCardBuilder";
import { PackageRateCard, FoodRateCard } from "@gosenderr/shared";

type VehicleType = "foot" | "bike" | "scooter" | "car" | "van" | "truck";
type Step = 1 | 2 | 3 | 4 | 5;

export default function CourierOnboarding() {
  const { uid, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Vehicle Type
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [serviceRadius, setServiceRadius] = useState(15);

  // Step 2: Work Modes
  const [packagesEnabled, setPackagesEnabled] = useState(false);
  const [foodEnabled, setFoodEnabled] = useState(false);

  // Step 3 & 4: Rate Cards
  const [packageRateCard, setPackageRateCard] =
    useState<PackageRateCard | null>(null);
  const [foodRateCard, setFoodRateCard] = useState<FoodRateCard | null>(null);

  if (authLoading) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!uid) {
    router.push("/login");
    return null;
  }

  const handleNext = () => {
    // Validate current step
    if (step === 2 && !packagesEnabled && !foodEnabled) {
      alert("Please select at least one delivery type");
      return;
    }

    // Skip to appropriate next step
    if (step === 2) {
      if (packagesEnabled) {
        setStep(3);
      } else if (foodEnabled) {
        setStep(4);
      }
    } else if (step === 3) {
      if (!packageRateCard) {
        alert("Please configure your package rate card");
        return;
      }
      if (foodEnabled) {
        setStep(4);
      } else {
        setStep(5);
      }
    } else if (step === 4) {
      if (!foodRateCard) {
        alert("Please configure your food rate card");
        return;
      }
      setStep(5);
    } else {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step === 3 && !packagesEnabled) {
      setStep(2);
    } else if (step === 4 && !packagesEnabled) {
      setStep(2);
    } else if (step === 5) {
      if (foodEnabled) {
        setStep(4);
      } else if (packagesEnabled) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else {
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!uid) return;

    setSubmitting(true);

    try {
      const courierProfile: any = {
        vehicleType,
        serviceRadius,
        workModes: {
          packagesEnabled,
          foodEnabled,
        },
        status: "pending_review",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (packageRateCard) {
        courierProfile.packageRateCard = packageRateCard;
      }

      if (foodRateCard) {
        courierProfile.foodRateCard = foodRateCard;
      }

      await setDoc(
        doc(db, "users", uid),
        {
          courierProfile,
          role: "courier",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Redirect to Stripe onboarding page
      router.push("/courier/onboarding/stripe");
    } catch (error) {
      console.error("Failed to submit onboarding:", error);
      alert("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  const vehicleOptions = [
    {
      value: "foot" as VehicleType,
      label: "🚶 Walking",
      description: "~3 mph",
    },
    {
      value: "bike" as VehicleType,
      label: "🚴 Bicycle",
      description: "~12 mph",
    },
    {
      value: "scooter" as VehicleType,
      label: "🛴 Scooter",
      description: "~15 mph",
    },
    { value: "car" as VehicleType, label: "🚗 Car", description: "~25 mph" },
    {
      value: "van" as VehicleType,
      label: "🚐 Van",
      description: "Large capacity",
    },
    {
      value: "truck" as VehicleType,
      label: "🚚 Truck",
      description: "Extra large",
    },
  ];

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                background: s <= step ? "#3b82f6" : "#e5e7eb",
                marginRight: s < 5 ? "8px" : 0,
                borderRadius: "2px",
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
          Step {step} of 5
        </p>
      </div>

      {/* Step 1: Vehicle Type */}
      {step === 1 && (
        <div>
          <h1 style={{ marginBottom: "10px" }}>Choose Your Vehicle</h1>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            Select the vehicle you'll use for deliveries
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              marginBottom: "30px",
            }}
          >
            {vehicleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setVehicleType(option.value)}
                style={{
                  padding: "20px",
                  border: `2px solid ${vehicleType === option.value ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "12px",
                  background:
                    vehicleType === option.value ? "#eff6ff" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                  {option.label.split(" ")[0]}
                </div>
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                  {option.label.split(" ")[1]}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "12px",
                fontWeight: "600",
              }}
            >
              Service Radius: {serviceRadius} miles
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#666",
                marginTop: "4px",
              }}
            >
              <span>5 miles</span>
              <span>50 miles</span>
            </div>
          </div>

          <button
            onClick={handleNext}
            style={{
              width: "100%",
              padding: "14px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Work Modes */}
      {step === 2 && (
        <div>
          <h1 style={{ marginBottom: "10px" }}>Delivery Types</h1>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            Choose which types of deliveries you want to accept (select at least
            one)
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginBottom: "30px",
            }}
          >
            <label
              style={{
                padding: "24px",
                border: `2px solid ${packagesEnabled ? "#3b82f6" : "#e5e7eb"}`,
                borderRadius: "12px",
                background: packagesEnabled ? "#eff6ff" : "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={packagesEnabled}
                onChange={(e) => setPackagesEnabled(e.target.checked)}
                style={{
                  width: "24px",
                  height: "24px",
                  marginRight: "16px",
                  cursor: "pointer",
                }}
              />
              <div>
                <div style={{ fontSize: "24px", marginBottom: "4px" }}>📦</div>
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                  Package Deliveries
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Deliver packages, documents, and general items
                </div>
              </div>
            </label>

            <label
              style={{
                padding: "24px",
                border: `2px solid ${foodEnabled ? "#3b82f6" : "#e5e7eb"}`,
                borderRadius: "12px",
                background: foodEnabled ? "#eff6ff" : "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={foodEnabled}
                onChange={(e) => setFoodEnabled(e.target.checked)}
                style={{
                  width: "24px",
                  height: "24px",
                  marginRight: "16px",
                  cursor: "pointer",
                }}
              />
              <div>
                <div style={{ fontSize: "24px", marginBottom: "4px" }}>🍔</div>
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                  Food Deliveries
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Deliver restaurant orders and food items (requires equipment)
                </div>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: "14px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              style={{
                flex: 2,
                padding: "14px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Package Rate Card */}
      {step === 3 && packagesEnabled && (
        <div>
          <h1 style={{ marginBottom: "10px" }}>Package Delivery Rates</h1>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            Set your pricing for package deliveries
          </p>

          <div style={{ marginBottom: "30px" }}>
            <PackageRateCardBuilder
              currentRateCard={packageRateCard || undefined}
              onSave={async (rateCard) => {
                setPackageRateCard(rateCard);
                handleNext();
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: "14px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
            {!packageRateCard && (
              <button
                onClick={() => {
                  setPackagesEnabled(false);
                  if (foodEnabled) {
                    setStep(4);
                  } else {
                    alert("You must enable at least one delivery type");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Skip Packages
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Food Rate Card */}
      {step === 4 && foodEnabled && (
        <div>
          <h1 style={{ marginBottom: "10px" }}>Food Delivery Rates</h1>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            Set your pricing for food deliveries
          </p>

          <div style={{ marginBottom: "30px" }}>
            <FoodRateCardBuilder
              currentRateCard={foodRateCard || undefined}
              onSave={async (rateCard) => {
                setFoodRateCard(rateCard);
                handleNext();
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: "14px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
            {!foodRateCard && (
              <button
                onClick={() => {
                  setFoodEnabled(false);
                  if (packagesEnabled && packageRateCard) {
                    setStep(5);
                  } else {
                    alert("You must enable at least one delivery type");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Skip Food
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <div>
          <h1 style={{ marginBottom: "10px" }}>Review Your Setup</h1>
          <p style={{ color: "#666", marginBottom: "30px" }}>
            Review your configuration before submitting for approval
          </p>

          <div style={{ marginBottom: "30px" }}>
            {/* Vehicle Summary */}
            <div
              style={{
                padding: "20px",
                background: "#f9fafb",
                borderRadius: "12px",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
                Vehicle & Service Area
              </h3>
              <div style={{ fontSize: "14px", color: "#666" }}>
                <p style={{ margin: "8px 0" }}>
                  <strong>Vehicle:</strong>{" "}
                  {vehicleOptions.find((v) => v.value === vehicleType)?.label}
                </p>
                <p style={{ margin: "8px 0" }}>
                  <strong>Service Radius:</strong> {serviceRadius} miles
                </p>
              </div>
            </div>

            {/* Work Modes Summary */}
            <div
              style={{
                padding: "20px",
                background: "#f9fafb",
                borderRadius: "12px",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
                Delivery Types
              </h3>
              <div style={{ fontSize: "14px", color: "#666" }}>
                {packagesEnabled && packageRateCard && (
                  <p style={{ margin: "8px 0" }}>
                    ✓ <strong>Package Deliveries:</strong> Base $
                    {packageRateCard.baseFare} + ${packageRateCard.perMile}/mile
                  </p>
                )}
                {foodEnabled && foodRateCard && (
                  <p style={{ margin: "8px 0" }}>
                    ✓ <strong>Food Deliveries:</strong> Base $
                    {foodRateCard.baseFare} + ${foodRateCard.perMile}/mile
                  </p>
                )}
              </div>
            </div>

            {/* Status Notice */}
            <div
              style={{
                padding: "20px",
                background: "#fef3c7",
                border: "2px solid #fbbf24",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  color: "#92400e",
                  marginBottom: "8px",
                }}
              >
                ⏳ Admin Review Required
              </div>
              <div style={{ fontSize: "14px", color: "#78350f" }}>
                Your courier profile will be reviewed by our admin team. You'll
                receive a notification once approved and can start accepting
                deliveries.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleBack}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "14px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.5 : 1,
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 2,
                padding: "14px",
                background: submitting ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit for Review ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

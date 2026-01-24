
import { useEffect, useState } from "react";
import { LoadingState } from "@gosenderr/ui";
import { PackageRateCardBuilder } from "@/components/v2/PackageRateCardBuilder";
import { FoodRateCardBuilder } from "@/components/v2/FoodRateCardBuilder";
import { PackageRateCard, FoodRateCard } from "@gosenderr/shared";
import { db } from "@/lib/firebase";
import { getAuthSafe } from "@/lib/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

type Mode = "view" | "edit-package" | "edit-food";

export default function RateCardsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");
  const [packageRateCard, setPackageRateCard] =
    useState<PackageRateCard | null>(null);
  const [foodRateCard, setFoodRateCard] = useState<FoodRateCard | null>(null);
  const [packagesEnabled, setPackagesEnabled] = useState(false);
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      // Load courier profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const courierProfile = data.courierProfile;

        if (courierProfile) {
          setPackageRateCard(courierProfile.packageRateCard || null);
          setFoodRateCard(courierProfile.foodRateCard || null);
          setPackagesEnabled(
            courierProfile.workModes?.packagesEnabled || false,
          );
          setFoodEnabled(courierProfile.workModes?.foodEnabled || false);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSavePackageRateCard = async (rateCard: PackageRateCard) => {
    if (!currentUser) return;

    await updateDoc(doc(db, "users", currentUser.uid), {
      "courierProfile.packageRateCard": rateCard,
      "courierProfile.workModes.packagesEnabled": true,
    });

    setPackageRateCard(rateCard);
    setPackagesEnabled(true);
    setMode("view");
  };

  const handleSaveFoodRateCard = async (rateCard: FoodRateCard) => {
    if (!currentUser) return;

    await updateDoc(doc(db, "users", currentUser.uid), {
      "courierProfile.foodRateCard": rateCard,
      "courierProfile.workModes.foodEnabled": true,
    });

    setFoodRateCard(rateCard);
    setFoodEnabled(true);
    setMode("view");
  };

  const handleTogglePackages = async () => {
    if (!currentUser || !packageRateCard) return;

    const newValue = !packagesEnabled;
    await updateDoc(doc(db, "users", currentUser.uid), {
      "courierProfile.workModes.packagesEnabled": newValue,
    });

    setPackagesEnabled(newValue);
  };

  const handleToggleFood = async () => {
    if (!currentUser || !foodRateCard) return;

    const newValue = !foodEnabled;
    await updateDoc(doc(db, "users", currentUser.uid), {
      "courierProfile.workModes.foodEnabled": newValue,
    });

    setFoodEnabled(newValue);
  };

  if (loading) {
    return <LoadingState fullPage message="Loading rate cards..." />;
  }

  if (mode === "edit-package") {
    return (
      <div>
        <PackageRateCardBuilder
          currentRateCard={packageRateCard || undefined}
          onSave={handleSavePackageRateCard}
        />
        <div
          style={{ maxWidth: "800px", margin: "20px auto", padding: "0 20px" }}
        >
          <button
            onClick={() => setMode("view")}
            style={{
              padding: "12px 24px",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === "edit-food") {
    return (
      <div>
        <FoodRateCardBuilder
          currentRateCard={foodRateCard || undefined}
          onSave={handleSaveFoodRateCard}
        />
        <div
          style={{ maxWidth: "800px", margin: "20px auto", padding: "0 20px" }}
        >
          <button
            onClick={() => setMode("view")}
            style={{
              padding: "12px 24px",
              background: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const hasAnyRateCard = packageRateCard || foodRateCard;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      {/* Welcome Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{ marginBottom: "12px", fontSize: "28px", fontWeight: "600" }}
        >
          {hasAnyRateCard
            ? "Manage Your Rate Cards"
            : "Courier Setup - Set Your Rates"}
        </h1>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>
          {hasAnyRateCard
            ? "Edit your pricing and delivery preferences anytime. Toggle work modes on/off to control which types of deliveries you accept."
            : "Welcome to Courier Setup! Choose which types of deliveries you want to accept (packages, food, or both) and set your rates. You can always edit these later."}
        </p>
      </div>

      {/* Package Deliveries Card */}
      <div
        style={{
          marginBottom: "24px",
          padding: "24px",
          background: "white",
          border: "2px solid #e5e7eb",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              📦 PACKAGE DELIVERIES
            </h2>
            {packageRateCard ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <button
                  onClick={handleTogglePackages}
                  style={{
                    padding: "8px 16px",
                    background: packagesEnabled ? "#10b981" : "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  {packagesEnabled ? "✅ Accepting Jobs" : "❌ Not Accepting"}
                </button>
              </div>
            ) : (
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                No rate card set up yet
              </p>
            )}
          </div>
          <button
            onClick={() => setMode("edit-package")}
            style={{
              padding: "10px 20px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            {packageRateCard ? "Edit Rates" : "Set Up Package Delivery"}
          </button>
        </div>

        {packageRateCard && (
          <div
            style={{
              padding: "16px",
              background: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "14px", color: "#374151" }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>Current Rate:</strong> $
                {packageRateCard.baseFare.toFixed(2)} base + $
                {packageRateCard.perMile.toFixed(2)}/mi + $
                {packageRateCard.perMinute.toFixed(2)}/min
              </p>
              {packageRateCard.optionalFees &&
                packageRateCard.optionalFees.length > 0 && (
                  <p style={{ marginBottom: "0" }}>
                    <strong>Optional Fees:</strong>{" "}
                    {packageRateCard.optionalFees
                      .map((fee) => `${fee.name} ($${fee.amount.toFixed(2)})`)
                      .join(", ")}
                  </p>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Food Deliveries Card */}
      <div
        style={{
          padding: "24px",
          background: "white",
          border: "2px solid #e5e7eb",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              🍔 FOOD DELIVERIES
            </h2>
            {foodRateCard ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <button
                  onClick={handleToggleFood}
                  style={{
                    padding: "8px 16px",
                    background: foodEnabled ? "#10b981" : "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  {foodEnabled ? "✅ Accepting Jobs" : "❌ Not Accepting"}
                </button>
              </div>
            ) : (
              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                No rate card set up yet
              </p>
            )}
          </div>
          <button
            onClick={() => setMode("edit-food")}
            style={{
              padding: "10px 20px",
              background: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            {foodRateCard ? "Edit Rates" : "Set Up Food Delivery"}
          </button>
        </div>

        {foodRateCard && (
          <div
            style={{
              padding: "16px",
              background: "#fef3c7",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "14px", color: "#78350f" }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>Current Rate:</strong> $
                {foodRateCard.baseFare.toFixed(2)} base + $
                {foodRateCard.perMile.toFixed(2)}/mi + $
                {foodRateCard.restaurantWaitPay.toFixed(2)}/min wait
              </p>
              {foodRateCard.peakHours && foodRateCard.peakHours.length > 0 && (
                <p style={{ marginBottom: "8px" }}>
                  <strong>Peak Hours:</strong>{" "}
                  {foodRateCard.peakHours
                    .map(
                      (peak) =>
                        `${peak.days.join(", ")} ${peak.startTime}-${peak.endTime} (${peak.multiplier}x)`,
                    )
                    .join(" | ")}
                </p>
              )}
              {foodRateCard.optionalFees &&
                foodRateCard.optionalFees.length > 0 && (
                  <p style={{ marginBottom: "0" }}>
                    <strong>Optional Fees:</strong>{" "}
                    {foodRateCard.optionalFees
                      .map((fee) => `${fee.name} ($${fee.amount.toFixed(2)})`)
                      .join(", ")}
                  </p>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/v2/useUserRole";

export default function V2CourierSetup() {
  const { userDoc } = useUserRole();

  // Check if courier has already set up rate cards
  const hasRateCards =
    userDoc?.courierProfile?.packageRateCard ||
    userDoc?.courierProfile?.foodRateCard;

  return (
    <div style={{ padding: "50px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1>Courier Setup</h1>
        {hasRateCards ? (
          <>
            <p
              style={{ color: "#10b981", marginTop: "10px", fontWeight: "600" }}
            >
              ✓ Your rate cards are already set up!
            </p>
            <p style={{ color: "#666", marginTop: "10px" }}>
              You can edit your rates or manage your delivery preferences
              anytime.
            </p>
            <div style={{ marginTop: "30px", display: "flex", gap: "15px" }}>
              <Link
                to="/rate-cards"
                style={{
                  padding: "12px 24px",
                  background: "#3b82f6",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  display: "inline-block",
                }}
              >
                Edit Rate Cards
              </Link>
              <Link
                to="/dashboard"
                style={{
                  padding: "12px 24px",
                  background: "#10b981",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  display: "inline-block",
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <p
              style={{ color: "#dc2626", marginTop: "10px", fontWeight: "600" }}
            >
              ⚠️ You need to set up your rate cards first
            </p>
            <p style={{ color: "#666", marginTop: "10px" }}>
              Before you can start accepting deliveries, you need to configure
              your pricing and choose which types of deliveries you want to
              accept (packages, food, or both).
            </p>
            <Link
              to="/rate-cards"
              style={{
                marginTop: "30px",
                padding: "12px 24px",
                background: "#3b82f6",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: "600",
                display: "inline-block",
              }}
            >
              Set Up Rate Cards →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

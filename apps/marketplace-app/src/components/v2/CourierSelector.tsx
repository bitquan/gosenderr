
import { UserDoc, VehicleType } from "@gosenderr/shared";
import { RateBreakdown } from "@/lib/pricing/calculateCourierRate";

export interface CourierWithRate extends UserDoc {
  id: string;
  distance: number; // Distance from courier to pickup
  rateBreakdown: RateBreakdown;
}

interface CourierSelectorProps {
  couriers: CourierWithRate[];
  selectedCourierId: string | null;
  onSelect: (courier: CourierWithRate) => void;
  isFoodItem: boolean;
}

const VEHICLE_ICONS: Record<VehicleType, string> = {
  foot: "🚶",
  bike: "🚴",
  scooter: "🛴",
  motorcycle: "🏍️",
  car: "🚗",
  van: "🚐",
  truck: "🚚",
};

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function renderStars(rating: number) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<span key={`full-${i}`}>⭐</span>);
  }
  if (hasHalf) {
    stars.push(<span key="half">✨</span>);
  }
  return stars;
}

function getApprovedEquipment(courier: UserDoc): string[] {
  if (!courier.courierProfile?.equipment) return [];

  const equipment = courier.courierProfile.equipment;
  const approved: string[] = [];

  if (equipment.insulated_bag?.approved) approved.push("insulated_bag");
  if (equipment.cooler?.approved) approved.push("cooler");
  if (equipment.hot_bag?.approved) approved.push("hot_bag");
  if (equipment.drink_carrier?.approved) approved.push("drink_carrier");
  if (equipment.dolly?.approved) approved.push("dolly");
  if (equipment.straps?.approved) approved.push("straps");
  if (equipment.furniture_blankets?.approved) approved.push("blankets");

  return approved;
}

const EQUIPMENT_LABELS: Record<string, { icon: string; label: string }> = {
  insulated_bag: { icon: "🧊", label: "Insulated Bag" },
  cooler: { icon: "❄️", label: "Cooler" },
  hot_bag: { icon: "🔥", label: "Hot Bag" },
  drink_carrier: { icon: "🥤", label: "Drink Carrier" },
  dolly: { icon: "🛒", label: "Dolly" },
  straps: { icon: "🪢", label: "Straps" },
  blankets: { icon: "🧺", label: "Blankets" },
};

export function CourierSelector({
  couriers,
  selectedCourierId,
  onSelect,
}: CourierSelectorProps) {
  if (couriers.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          backgroundColor: "#fef2f2",
          borderRadius: "8px",
          border: "1px solid #fca5a5",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>😔</div>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "8px",
            color: "#991b1b",
          }}
        >
          No Available Senderrs
        </h3>
        <p style={{ color: "#7f1d1d", fontSize: "14px" }}>
          No Senderrs are currently available for this delivery. Please try
          again later.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {couriers.map((courier) => {
        const isSelected = courier.id === selectedCourierId;
        const vehicleIcon =
          VEHICLE_ICONS[courier.courierProfile?.vehicleType || "car"];
        const equipment = getApprovedEquipment(courier);
        const breakdown = courier.rateBreakdown;
        const displayName =
          (courier.courierProfile as any)?.displayName ||
          (courier.courierProfile as any)?.identity?.legalName ||
          courier.displayName ||
          "Anonymous Senderr";
        const profilePhoto =
          (courier.courierProfile as any)?.profilePhotoUrl ||
          courier.profilePhotoUrl ||
          (courier as any).photoURL ||
          "";

        return (
          <div
            key={courier.id}
            onClick={() => onSelect(courier)}
            style={{
              border: isSelected ? "2px solid #2563eb" : "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              backgroundColor: isSelected ? "#eff6ff" : "white",
              transition: "all 0.2s",
              boxShadow: isSelected
                ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }
            }}
          >
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              {/* Courier Photo */}
              <div style={{ flexShrink: 0 }}>
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={displayName}
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                    }}
                  >
                    👤
                  </div>
                )}
              </div>

              {/* Courier Info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <h3
                    style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}
                  >
                    {displayName}
                  </h3>
                  <span style={{ fontSize: "24px" }}>{vehicleIcon}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex" }}>
                    {renderStars(courier.averageRating ?? 0)}
                  </div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    ({(courier.averageRating ?? 0).toFixed(1)})
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#9ca3af",
                      marginLeft: "4px",
                    }}
                  >
                    • {(courier.totalDeliveries ?? 0)} deliveries
                  </span>
                </div>

                {/* Vehicle Details */}
                {courier.courierProfile?.vehicleDetails && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    {courier.courierProfile.vehicleDetails.color}{" "}
                    {courier.courierProfile.vehicleDetails.make}{" "}
                    {courier.courierProfile.vehicleDetails.model}
                  </div>
                )}

                {/* Equipment Badges */}
                {equipment.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "8px",
                    }}
                  >
                    {equipment.map((eq) => {
                      const config = EQUIPMENT_LABELS[eq];
                      return (
                        <span
                          key={eq}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            backgroundColor: "#dbeafe",
                            color: "#1e40af",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#059669",
                    marginBottom: "4px",
                  }}
                >
                  {formatMoney(breakdown.totalCustomerCharge)}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {courier.distance.toFixed(1)} mi away
                </div>
              </div>
            </div>

            {/* Rate Breakdown */}
            <div
              style={{
                padding: "12px",
                backgroundColor: isSelected ? "white" : "#f9fafb",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#6b7280" }}>Base fare</span>
                <span style={{ fontWeight: "500" }}>
                  {formatMoney(breakdown.baseFare)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#6b7280" }}>Per mile</span>
                <span style={{ fontWeight: "500" }}>
                  {formatMoney(breakdown.perMileCharge)}
                </span>
              </div>
              {breakdown.timeCharge && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Time charge</span>
                  <span style={{ fontWeight: "500" }}>
                    {formatMoney(breakdown.timeCharge)}
                  </span>
                </div>
              )}
              {breakdown.peakMultiplier && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "#dc2626", fontWeight: "500" }}>
                    Peak hours ({breakdown.peakMultiplier}x)
                  </span>
                  <span style={{ color: "#dc2626", fontWeight: "500" }}>
                    Applied
                  </span>
                </div>
              )}
              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  marginTop: "8px",
                  paddingTop: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "600",
                }}
              >
                <span>Courier earns</span>
                <span style={{ color: "#059669" }}>
                  {formatMoney(breakdown.courierEarnings)}
                </span>
              </div>
            </div>

            {/* Select Button */}
            {isSelected && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  textAlign: "center",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                ✓ SELECTED
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


import { useState } from "react";
import { FoodRateCard } from "@gosenderr/shared";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface FoodRateCardBuilderProps {
  currentRateCard?: FoodRateCard;
  onSave: (rateCard: FoodRateCard) => Promise<void>;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function FoodRateCardBuilder({
  currentRateCard,
  onSave,
}: FoodRateCardBuilderProps) {
  const { settings: platformSettings } = usePlatformSettings();
  const [baseFare, setBaseFare] = useState(
    currentRateCard?.baseFare?.toString() || "3.50",
  );
  const [perMile, setPerMile] = useState(
    currentRateCard?.perMile?.toString() || "1.25",
  );
  const [restaurantWaitPay, setRestaurantWaitPay] = useState(
    currentRateCard?.restaurantWaitPay?.toString() || "0.20",
  );
  const [maxPickupDistanceMiles, setMaxPickupDistanceMiles] = useState(
    currentRateCard?.maxPickupDistanceMiles?.toString() || ""
  );
  const [maxDeliveryDistanceMiles, setMaxDeliveryDistanceMiles] = useState(
    currentRateCard?.maxDeliveryDistanceMiles?.toString() || ""
  );
  const [optionalFees, setOptionalFees] = useState<
    Array<{ name: string; amount: number }>
  >(currentRateCard?.optionalFees || []);
  const [peakHours, setPeakHours] = useState<
    Array<{
      days: string[];
      startTime: string;
      endTime: string;
      multiplier: number;
    }>
  >(currentRateCard?.peakHours || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Live preview calculation state
  const [previewMiles, setPreviewMiles] = useState("4");
  const [previewDriveMinutes, setPreviewDriveMinutes] = useState("12");
  const [previewWaitMinutes, setPreviewWaitMinutes] = useState("8");
  const [previewDay, setPreviewDay] = useState("Friday");
  const [previewTime, setPreviewTime] = useState("19:30"); // 7:30 PM

  const handleAddFee = () => {
    setOptionalFees([...optionalFees, { name: "", amount: 0 }]);
  };

  const handleRemoveFee = (index: number) => {
    setOptionalFees(optionalFees.filter((_, i) => i !== index));
  };

  const handleFeeChange = (
    index: number,
    field: "name" | "amount",
    value: string,
  ) => {
    const updated = [...optionalFees];
    if (field === "name") {
      updated[index].name = value;
    } else {
      updated[index].amount = parseFloat(value) || 0;
    }
    setOptionalFees(updated);
  };

  const handleAddPeakHour = () => {
    setPeakHours([
      ...peakHours,
      {
        days: [],
        startTime: "18:00",
        endTime: "21:00",
        multiplier: 1.5,
      },
    ]);
  };

  const handleRemovePeakHour = (index: number) => {
    setPeakHours(peakHours.filter((_, i) => i !== index));
  };

  const handlePeakHourChange = (
    index: number,
    field: "days" | "startTime" | "endTime" | "multiplier",
    value: string | number | string[],
  ) => {
    const updated = [...peakHours];
    if (field === "days") {
      updated[index].days = value as string[];
    } else if (field === "multiplier") {
      if (Array.isArray(value)) {
        return;
      }
      const parsed = typeof value === "number" ? value : parseFloat(value);
      updated[index].multiplier = parsed || 1.0;
    } else {
      updated[index][field] = typeof value === "string" ? value : String(value);
    }
    setPeakHours(updated);
  };

  const toggleDay = (peakIndex: number, day: string) => {
    const updated = [...peakHours];
    const days = updated[peakIndex].days;
    if (days.includes(day)) {
      updated[peakIndex].days = days.filter((d) => d !== day);
    } else {
      updated[peakIndex].days = [...days, day];
    }
    setPeakHours(updated);
  };

  const isPeakTime = (day: string, time: string) => {
    return peakHours.some((peak) => {
      if (!peak.days.includes(day)) return false;
      return time >= peak.startTime && time <= peak.endTime;
    });
  };

  const getPeakMultiplier = (day: string, time: string) => {
    const peak = peakHours.find((peak) => {
      if (!peak.days.includes(day)) return false;
      return time >= peak.startTime && time <= peak.endTime;
    });
    return peak?.multiplier || 1.0;
  };

  const calculatePreview = () => {
    const base = parseFloat(baseFare) || 0;
    const miles = parseFloat(previewMiles) || 0;
    const waitMinutes = parseFloat(previewWaitMinutes) || 0;
    const mileRate = parseFloat(perMile) || 0;
    const waitRate = parseFloat(restaurantWaitPay) || 0;

    const baseCharge = base;
    const mileCharge = miles * mileRate;
    const waitCharge = waitMinutes * waitRate;

    const subtotal = baseCharge + mileCharge + waitCharge;

    const isPeak = isPeakTime(previewDay, previewTime);
    const peakMultiplier = getPeakMultiplier(previewDay, previewTime);
    const totalWithPeak = isPeak ? subtotal * peakMultiplier : subtotal;

    const platformFee = platformSettings.platformFeeFood ?? 1.5;
    const customerPays = totalWithPeak + platformFee;

    return {
      baseCharge,
      mileCharge,
      waitCharge,
      subtotal,
      isPeak,
      peakMultiplier,
      totalWithPeak,
      platformFee,
      customerPays,
    };
  };

  const preview = calculatePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const baseFareValue = parseFloat(baseFare);
    const perMileValue = parseFloat(perMile);
    const restaurantWaitPayValue = parseFloat(restaurantWaitPay);

    // Validate minimums
    if (baseFareValue < 2.5) {
      setError("Base fare must be at least $2.50");
      return;
    }
    if (perMileValue < 0.75) {
      setError("Per mile rate must be at least $0.75");
      return;
    }
    if (restaurantWaitPayValue < 0.15) {
      setError("Restaurant wait pay must be at least $0.15/min");
      return;
    }

    // Validate optional fees
    for (const fee of optionalFees) {
      if (!fee.name.trim()) {
        setError("All optional fees must have a name");
        return;
      }
      if (fee.amount <= 0) {
        setError("All optional fees must have a positive amount");
        return;
      }
    }

    // Validate peak hours
    for (const peak of peakHours) {
      if (peak.days.length === 0) {
        setError("All peak hour slots must have at least one day selected");
        return;
      }
      if (!peak.startTime || !peak.endTime) {
        setError("All peak hour slots must have start and end times");
        return;
      }
      if (peak.startTime >= peak.endTime) {
        setError("Peak hour start time must be before end time");
        return;
      }
      if (peak.multiplier < 1.0 || peak.multiplier > 2.0) {
        setError("Peak hour multiplier must be between 1.0 and 2.0");
        return;
      }
    }

    const rateCard: FoodRateCard = {
      baseFare: baseFareValue,
      perMile: perMileValue,
      restaurantWaitPay: restaurantWaitPayValue,
      optionalFees: optionalFees.filter(
        (fee) => fee.name.trim() && fee.amount > 0,
      ),
      ...(peakHours.length > 0 && { peakHours }),
    };

    // Add optional distance limits
    if (maxPickupDistanceMiles) {
      rateCard.maxPickupDistanceMiles = parseFloat(maxPickupDistanceMiles);
    }
    if (maxDeliveryDistanceMiles) {
      rateCard.maxDeliveryDistanceMiles = parseFloat(maxDeliveryDistanceMiles);
    }

    setSaving(true);
    try {
      await onSave(rateCard);
    } catch (err) {
      setError("Failed to save rate card. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: "600" }}>
        🍔 Food Delivery Rate Card
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Base Rates */}
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Base Rates
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Base Fare (minimum $2.50)
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: "8px", fontSize: "18px" }}>$</span>
              <input
                type="number"
                step="0.01"
                min="2.50"
                value={baseFare}
                onChange={(e) => setBaseFare(e.target.value)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  width: "120px",
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Per Mile (minimum $0.75)
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: "8px", fontSize: "18px" }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0.75"
                value={perMile}
                onChange={(e) => setPerMile(e.target.value)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  width: "120px",
                }}
                required
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Restaurant Wait Pay (minimum $0.15/min)
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: "8px", fontSize: "18px" }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0.15"
                value={restaurantWaitPay}
                onChange={(e) => setRestaurantWaitPay(e.target.value)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  width: "120px",
                }}
                required
              />
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                /min
              </span>
            </div>
          </div>
        </div>

        {/* Distance Limits */}
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Distance Limits (Optional)
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Max Pickup Distance (miles)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Leave empty for unlimited"
              value={maxPickupDistanceMiles}
              onChange={(e) => setMaxPickupDistanceMiles(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Maximum distance customers can be from restaurant
            </p>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Max Delivery Distance (miles)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Leave empty for unlimited"
              value={maxDeliveryDistanceMiles}
              onChange={(e) => setMaxDeliveryDistanceMiles(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              Maximum distance between restaurant and delivery location
            </p>
          </div>
        </div>

        {/* Peak Hours */}
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            background: "#fef3c7",
            borderRadius: "8px",
            border: "2px solid #fbbf24",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>
              ⏰ Peak Hours
            </h3>
            <button
              type="button"
              onClick={handleAddPeakHour}
              style={{
                padding: "8px 16px",
                background: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              + Add Peak Time
            </button>
          </div>

          {peakHours.length === 0 ? (
            <p style={{ color: "#78350f", fontSize: "14px" }}>
              No peak hours configured. Add peak times to earn more during busy
              periods!
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {peakHours.map((peak, index) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    background: "white",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Days
                    </label>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(index, day)}
                          style={{
                            padding: "6px 12px",
                            background: peak.days.includes(day)
                              ? "#f59e0b"
                              : "#f3f4f6",
                            color: peak.days.includes(day)
                              ? "white"
                              : "#374151",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                          }}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={peak.startTime}
                        onChange={(e) =>
                          handlePeakHourChange(
                            index,
                            "startTime",
                            e.target.value,
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        End Time
                      </label>
                      <input
                        type="time"
                        value={peak.endTime}
                        onChange={(e) =>
                          handlePeakHourChange(index, "endTime", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Multiplier (1.0 - 2.0)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="2.0"
                        value={peak.multiplier}
                        onChange={(e) =>
                          handlePeakHourChange(
                            index,
                            "multiplier",
                            e.target.value,
                          )
                        }
                        style={{
                          width: "120px",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        ({((peak.multiplier - 1) * 100).toFixed(0)}% boost)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePeakHour(index)}
                      style={{
                        padding: "10px 16px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Fees */}
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>
              Optional Fees
            </h3>
            <button
              type="button"
              onClick={handleAddFee}
              style={{
                padding: "8px 16px",
                background: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              + Add Fee
            </button>
          </div>

          {optionalFees.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              No optional fees yet. Add fees for special services.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {optionalFees.map((fee, index) => (
                <div
                  key={index}
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <input
                    type="text"
                    placeholder="Fee name"
                    value={fee.name}
                    onChange={(e) =>
                      handleFeeChange(index, "name", e.target.value)
                    }
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "140px",
                    }}
                  >
                    <span style={{ marginRight: "8px" }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={fee.amount || ""}
                      onChange={(e) =>
                        handleFeeChange(index, "amount", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFee(index)}
                    style={{
                      padding: "10px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            background: "#dbeafe",
            borderRadius: "8px",
            border: "2px solid #3b82f6",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            💰 Live Earnings Preview
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Miles
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={previewMiles}
                onChange={(e) => setPreviewMiles(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Drive Minutes
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={previewDriveMinutes}
                onChange={(e) => setPreviewDriveMinutes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Restaurant Wait (min)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={previewWaitMinutes}
                onChange={(e) => setPreviewWaitMinutes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Day & Time
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={previewDay}
                  onChange={(e) => setPreviewDay(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={previewTime}
                  onChange={(e) => setPreviewTime(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: "16px",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            <div
              style={{
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Base:</span>
              <span style={{ fontWeight: "600" }}>
                ${preview.baseCharge.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                Miles: {previewMiles} × ${perMile}
              </span>
              <span style={{ fontWeight: "600" }}>
                ${preview.mileCharge.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                Wait: {previewWaitMinutes} × ${restaurantWaitPay}
              </span>
              <span style={{ fontWeight: "600" }}>
                ${preview.waitCharge.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "8px",
                marginTop: "8px",
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: "600" }}>
                  ${preview.subtotal.toFixed(2)}
                </span>
              </div>
            </div>
            {preview.isPeak && (
              <div
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#f59e0b",
                }}
              >
                <span>
                  Peak ({previewDay} {previewTime} - {preview.peakMultiplier}x):
                </span>
                <span style={{ fontWeight: "700" }}>
                  ${preview.totalWithPeak.toFixed(2)}
                </span>
              </div>
            )}
            <div
              style={{
                borderTop: "2px solid #e5e7eb",
                paddingTop: "8px",
                marginTop: "8px",
              }}
            >
              <div
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "16px",
                }}
              >
                <span style={{ fontWeight: "700", color: "#059669" }}>
                  You Earn:
                </span>
                <span style={{ fontWeight: "700", color: "#059669" }}>
                  ${preview.totalWithPeak.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                <span>Customer Pays:</span>
                <span>
                  ${preview.customerPays.toFixed(2)} (+ $
                  {preview.platformFee.toFixed(2)} platform fee)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            padding: "14px",
            background: saving ? "#9ca3af" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Rate Card"}
        </button>
      </form>
    </div>
  );
}

import { JobStatus } from "@/lib/v2/types";

interface StatusTimelineProps {
  currentStatus: JobStatus;
  isPaymentLocked?: boolean;
}

const steps: { status: JobStatus; label: string }[] = [
  { status: "open", label: "Send Posted" },
  { status: "assigned", label: "Start Heading to Pickup" },
  { status: "enroute_pickup", label: "Mark Arrived at Pickup" },
  { status: "arrived_pickup", label: "Mark Package Picked Up" },
  { status: "picked_up", label: "Start Heading to Dropoff" },
  { status: "enroute_dropoff", label: "Mark Arrived at Dropoff" },
  { status: "arrived_dropoff", label: "Mark Completed" },
  { status: "completed", label: "Completed" },
];

export function StatusTimeline({ currentStatus, isPaymentLocked }: StatusTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  return (
    <div style={{ padding: "20px 0" }}>
      {isPaymentLocked && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            color: "#92400e",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          ⏳ Waiting for customer payment authorization before the trip can start.
        </div>
      )}
      <div style={{ position: "relative" }}>
        {/* Progress Line */}
        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "15px",
            right: "15px",
            height: "2px",
            background: "#e5e5e5",
            zIndex: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#6E56CF",
              width:
                currentIndex >= 0
                  ? `${(currentIndex / (steps.length - 1)) * 100}%`
                  : "0%",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 1,
          }}
        >
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isCancelled = currentStatus === "cancelled";

            return (
              <div
                key={step.status}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                {/* Circle */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background:
                      isCompleted || isCurrent ? "#6E56CF" : "#e5e5e5",
                    border: isCurrent ? "3px solid #6E56CF" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "12px",
                    transition: "all 0.3s ease",
                    boxShadow: isCurrent
                      ? "0 0 0 4px rgba(110, 86, 207, 0.2)"
                      : "none",
                  }}
                >
                  {isCompleted ? "✓" : isCurrent ? "●" : ""}
                </div>

                {/* Label */}
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    textAlign: "center",
                    color: isCurrent
                      ? "#6E56CF"
                      : isCompleted
                        ? "#333"
                        : "#999",
                    fontWeight: isCurrent ? "600" : "400",
                    maxWidth: "80px",
                    lineHeight: "1.3",
                  }}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancelled Status */}
        {currentStatus === "cancelled" && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "6px",
              color: "#c00",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            ❌ Job Cancelled
          </div>
        )}
      </div>
    </div>
  );
}

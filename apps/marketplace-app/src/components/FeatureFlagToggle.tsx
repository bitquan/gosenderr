

interface FeatureFlagToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FeatureFlagToggle({
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: FeatureFlagToggleProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div style={{ flex: 1 }}>
        <label
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#111827",
            cursor: "pointer",
            display: "block",
          }}
        >
          {label}
        </label>
        <p
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginTop: "4px",
          }}
        >
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        style={{
          position: "relative",
          display: "inline-flex",
          height: "24px",
          width: "44px",
          alignItems: "center",
          borderRadius: "9999px",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          backgroundColor: enabled ? "#2563eb" : "#4b5563",
          transition: "background-color 0.2s",
          flexShrink: 0,
          marginLeft: "16px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            height: "16px",
            width: "16px",
            borderRadius: "9999px",
            backgroundColor: "white",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            transform: enabled ? "translateX(24px)" : "translateX(4px)",
            transition: "transform 0.2s",
          }}
        />
      </button>
    </div>
  );
}
